/**
 * AI Moderator service — Phase 2 (audited + upgraded).
 *
 * Pure analysis only: no DB access, no HTTP-layer concerns. Given a
 * message and battle context, returns a three-tier verdict — ALLOW
 * (save as-is), WARN (save, but surface a warning), or BLOCK (never
 * persisted). The caller (the messages API route, via
 * `src/lib/moderationEnforcement.ts`) owns logging, escalation, and
 * rate limiting.
 *
 * Kept deliberately separate from the AI Judge (Phase 1) — no imports
 * between the two, no shared state.
 */

export type ModerationAction = "ALLOW" | "WARN" | "BLOCK";

export type ModerationCategory =
  | "safe_roast"
  | "personal_attack"
  | "harassment"
  | "hate"
  | "threat"
  | "spam";

/** Which layer produced the verdict — also the AI-outage/accuracy signal for analytics. */
export type ModerationSource = "local" | "ai" | "fallback";

export interface ModeratorContext {
  /** This user's other recent messages in the same battle, for flood/repeat detection. */
  recentMessages?: string[];
  /** Battle topic — lets the AI judge whether an attack is "on-topic" roasting or a non-sequitur personal attack. */
  battleTopic?: string;
  /** casual | ranked | friend | tournament | group | event */
  battleType?: string;
  /** text | image | meme */
  mode?: string;
  senderUsername?: string;
  opponentUsername?: string;
  /** Recent messages from BOTH sides, oldest to newest, for conversational context. */
  conversationHistory?: { username: string; content: string }[];
}

export interface ModerationVerdict {
  action: ModerationAction;
  category: ModerationCategory;
  reason: string;
  toxicity_score: number; // 0-100
  source: ModerationSource;
}

// =========================================================
// Public API
// =========================================================

export async function analyzeMessage(
  content: string,
  context: ModeratorContext = {}
): Promise<ModerationVerdict> {
  // Local rules run first: instant, free, and catch the clear-cut cases
  // (explicit threats, spam patterns, obvious personal attacks) without
  // waiting on a network call. This is also what keeps AI spend down —
  // duplicate/flood messages and blatant violations never reach the AI.
  const local = runLocalRules(content, context);
  if (local) return local;

  if (!process.env.OPENAI_API_KEY) {
    return allow("local");
  }

  try {
    return await runContextAwareModeration(content, context);
  } catch (err) {
    // Fail SAFE, not fail OPEN: don't blanket-allow just because the AI
    // call errored or timed out. Local hard-block rules already ran above,
    // so anything reaching here is "unclear" — run a coarser heuristic
    // pass instead of trusting it by default, and mark the source so this
    // shows up in moderation analytics as fallback usage.
    console.error("AI moderator call failed, using local fallback heuristics:", err);
    return runFallbackHeuristics(content);
  }
}

function allow(source: ModerationSource, toxicity = 0): ModerationVerdict {
  return { action: "ALLOW", category: "safe_roast", reason: "No issues detected.", toxicity_score: toxicity, source };
}

// =========================================================
// Local (deterministic) rules — always run first
// =========================================================

const BLOCK_PATTERNS: { pattern: RegExp; category: ModerationCategory; reason: string }[] = [
  {
    pattern: /\b(kill yourself|kys|go die|die in a fire)\b/i,
    category: "threat",
    reason: "Threats or self-harm encouragement are not allowed.",
  },
  {
    pattern: /\b(dox|doxx|home address|phone number|where you live)\b/i,
    category: "threat",
    reason: "Sharing or threatening someone's private information is not allowed.",
  },
  {
    pattern: /\b(rape|sexual assault)\b/i,
    category: "threat",
    reason: "Sexual violence content is not allowed in battles.",
  },
];

const WARN_PATTERNS: { pattern: RegExp; category: ModerationCategory; reason: string }[] = [
  {
    pattern: /\byou'?re\s+(so\s+)?(pathetic|worthless|disgusting|a\s+loser|trash|garbage)\b/i,
    category: "personal_attack",
    reason: "Keep attacks focused on arguments, not users.",
  },
  {
    pattern: /\b(shut up|nobody (likes|cares about) you|no one (likes|cares about) you)\b/i,
    category: "harassment",
    reason: "Keep attacks focused on arguments, not users.",
  },
];

// Battles are text-only roasts — links and long repeated-character runs
// are almost always spam, not content worth judging.
const SPAM_PATTERNS: RegExp[] = [/(https?:\/\/|www\.)\S+/i, /(.)\1{9,}/];

function runLocalRules(content: string, context: ModeratorContext): ModerationVerdict | null {
  for (const rule of BLOCK_PATTERNS) {
    if (rule.pattern.test(content)) {
      return { action: "BLOCK", category: rule.category, reason: rule.reason, toxicity_score: 95, source: "local" };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        action: "BLOCK",
        category: "spam",
        reason: "Links and character spam aren't allowed in battle messages.",
        toxicity_score: 60,
        source: "local",
      };
    }
  }

  // Flood/duplicate detection: this user repeating (near-)identical
  // content this battle. Resolved locally so an obvious repeat never
  // costs an AI call.
  if (context.recentMessages?.some((m) => normalize(m) === normalize(content))) {
    return {
      action: "WARN",
      category: "spam",
      reason: "Try to keep each round fresh instead of repeating yourself.",
      toxicity_score: 30,
      source: "local",
    };
  }

  for (const rule of WARN_PATTERNS) {
    if (rule.pattern.test(content)) {
      return { action: "WARN", category: rule.category, reason: rule.reason, toxicity_score: 45, source: "local" };
    }
  }

  return null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// =========================================================
// AI pass — context-aware chat-completion classification
//
// Uses chat completions (not the fixed /v1/moderations classifier)
// because distinguishing "competitive roasting" from "real harassment"
// requires knowing the battle topic, format, and conversation so far —
// context a fixed content classifier can't take into account.
// =========================================================

const AI_TIMEOUT_MS = 6000;

const SYSTEM_PROMPT = `You are the AI Moderator for Ragebait, a competitive roast/debate battle
platform. Trash talk, insults about someone's argument, wit, and playful jabs are the entire
point of the game and must be ALLOWED — that's competitive roasting, not a violation. Your job
is to tell competitive roasting apart from real harassment, hate speech, threats, or spam that
actually crosses the line. Use the battle context (topic, format, and the conversation so far)
to judge tone and intent — the same line can be a joke in one context and harassment in another.
Respond ONLY with valid JSON, no markdown, no commentary.`;

async function runContextAwareModeration(content: string, context: ModeratorContext): Promise<ModerationVerdict> {
  const prompt = buildModerationPrompt(content, context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenAI moderation error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI moderator returned an empty response.");

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI moderator returned invalid JSON.");
  }

  return normalizeAiVerdict(parsed);
}

function buildModerationPrompt(content: string, context: ModeratorContext): string {
  const historyBlock = context.conversationHistory?.length
    ? context.conversationHistory.map((m) => `${m.username}: ${m.content}`).join("\n")
    : "(no prior messages this battle)";

  return `Battle topic: ${context.battleTopic ?? "unknown"}
Battle format: ${context.battleType ?? "casual"} / ${context.mode ?? "text"}
Participants: ${context.senderUsername ?? "sender"} vs ${context.opponentUsername ?? "opponent"}

Recent conversation (oldest to newest):
${historyBlock}

New message to moderate, from ${context.senderUsername ?? "sender"}:
"${content}"

Classify ONLY this new message (not the earlier ones). Decide:
- action: "ALLOW" (fits the competitive-roast spirit of the game, even if edgy/insulting),
  "WARN" (borderline — let it through but flag it), or
  "BLOCK" (real harassment, hate speech, threats, or spam — reject outright)
- category: one of "safe_roast", "personal_attack", "harassment", "hate", "threat", "spam"
- reason: one sentence explaining the call, considering the battle context above
- toxicity_score: 0-100

Respond with JSON only: {"action": "", "category": "", "reason": "", "toxicity_score": 0}`;
}

function normalizeAiVerdict(raw: any): ModerationVerdict {
  const validActions: ModerationAction[] = ["ALLOW", "WARN", "BLOCK"];
  const validCategories: ModerationCategory[] = [
    "safe_roast",
    "personal_attack",
    "harassment",
    "hate",
    "threat",
    "spam",
  ];

  const action = validActions.includes(raw?.action) ? raw.action : "WARN";
  const category = validCategories.includes(raw?.category) ? raw.category : "personal_attack";
  const reason = typeof raw?.reason === "string" && raw.reason.trim() ? raw.reason.slice(0, 300) : reasonFor(category, action);
  const toxicity_score = clampScore(raw?.toxicity_score);

  return { action, category, reason, toxicity_score, source: "ai" };
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function reasonFor(category: ModerationCategory, action: ModerationAction): string {
  if (action === "BLOCK") {
    switch (category) {
      case "hate":
        return "Hate speech is not allowed in Ragebait battles.";
      case "threat":
        return "Threats or calls for violence/self-harm are not allowed.";
      case "spam":
        return "Spam isn't allowed in battle messages.";
      default:
        return "This message crosses the line for a Ragebait battle.";
    }
  }
  return "Keep attacks focused on arguments, not users.";
}

// =========================================================
// Fallback heuristics — used only when the AI call itself fails
// (network error, timeout, bad JSON). NOT the same as "no API key
// configured" (that's handled by the local-only path above, source
// "local"). This path always marks source "fallback" so AI outages
// are visible in moderation analytics.
// =========================================================

const FALLBACK_INSULT_WORDS = [
  "idiot", "moron", "trash", "garbage", "pathetic", "worthless", "loser", "stupid", "dumb", "ugly",
];

function runFallbackHeuristics(content: string): ModerationVerdict {
  // Local hard-BLOCK rules already ran in analyzeMessage() before we ever
  // got here, so obvious dangerous content (threats, doxxing, sexual
  // violence, spam links/floods) is already handled. This is a coarser
  // secondary pass for the ambiguous middle ground while AI is down —
  // it errs toward WARN rather than defaulting straight to ALLOW.
  const lower = content.toLowerCase();
  const letters = content.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters.length > 0 ? (content.match(/[A-Z]/g)?.length ?? 0) / letters.length : 0;
  const insultHits = FALLBACK_INSULT_WORDS.filter((w) => lower.includes(w)).length;

  if (insultHits >= 3 || (capsRatio > 0.8 && content.length > 20)) {
    return {
      action: "WARN",
      category: "personal_attack",
      reason: "AI moderator was temporarily unavailable — flagged by fallback checks for review.",
      toxicity_score: 55,
      source: "fallback",
    };
  }

  return {
    action: "ALLOW",
    category: "safe_roast",
    reason: "AI moderator was temporarily unavailable — no red flags from fallback checks.",
    toxicity_score: 10,
    source: "fallback",
  };
}
