/**
 * AI Moderator service — Phase 2.
 *
 * Analyzes a single battle message and returns a three-tier verdict:
 * ALLOW (save as-is), WARN (save, but surface a warning to the user),
 * or BLOCK (never persisted). This is a pure analysis function — it has
 * no knowledge of the database or the HTTP layer. The caller (the
 * messages API route) decides what to do with the verdict.
 */

export type ModerationAction = "ALLOW" | "WARN" | "BLOCK";

export type ModerationCategory =
  | "safe_roast"
  | "personal_attack"
  | "harassment"
  | "hate"
  | "threat"
  | "spam";

export interface ModeratorContext {
  /** This user's other recent messages in the same battle, for flood/repeat detection. */
  recentMessages?: string[];
}

export interface ModerationVerdict {
  action: ModerationAction;
  category: ModerationCategory;
  reason: string;
  toxicity_score: number; // 0-100
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
  // waiting on a network call.
  const local = runLocalRules(content, context);
  if (local) return local;

  if (!process.env.OPENAI_API_KEY) {
    return allow();
  }

  try {
    return await runAiModeration(content);
  } catch (err) {
    // Fail open: a moderation-service outage should never be the reason a
    // battle grinds to a halt. Local rules above already caught the
    // clear-cut violations; anything subtler gets through until the
    // service recovers.
    console.error("AI moderator call failed, defaulting to ALLOW:", err);
    return allow();
  }
}

function allow(): ModerationVerdict {
  return { action: "ALLOW", category: "safe_roast", reason: "No issues detected.", toxicity_score: 0 };
}

// =========================================================
// Local (deterministic) rules
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
      return { action: "BLOCK", category: rule.category, reason: rule.reason, toxicity_score: 95 };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        action: "BLOCK",
        category: "spam",
        reason: "Links and character spam aren't allowed in battle messages.",
        toxicity_score: 60,
      };
    }
  }

  // Flood detection: this user repeating (near-)identical content this battle.
  if (context.recentMessages?.some((m) => normalize(m) === normalize(content))) {
    return {
      action: "WARN",
      category: "spam",
      reason: "Try to keep each round fresh instead of repeating yourself.",
      toxicity_score: 30,
    };
  }

  for (const rule of WARN_PATTERNS) {
    if (rule.pattern.test(content)) {
      return { action: "WARN", category: rule.category, reason: rule.reason, toxicity_score: 45 };
    }
  }

  return null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// =========================================================
// AI pass (OpenAI moderation model)
// =========================================================

const SEVERE_OPENAI_CATEGORIES = new Set([
  "harassment/threatening",
  "hate/threatening",
  "violence",
  "violence/graphic",
  "sexual/minors",
  "self-harm/instructions",
  "self-harm/intent",
]);

async function runAiModeration(content: string): Promise<ModerationVerdict> {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI moderation error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const result = data.results?.[0];
  if (!result) {
    throw new Error("OpenAI moderation returned no result.");
  }

  const scores: Record<string, number> = result.category_scores ?? {};
  const maxScore = Object.values(scores).reduce((max, v) => Math.max(max, v), 0);
  const toxicity_score = Math.round(maxScore * 100);

  const flagged: string[] = Object.entries(result.categories ?? {})
    .filter(([, isFlagged]) => Boolean(isFlagged))
    .map(([key]) => key);

  if (flagged.length === 0) {
    return { ...allow(), toxicity_score };
  }

  const category = mapOpenAiCategory(flagged);
  const severe = flagged.some((c) => SEVERE_OPENAI_CATEGORIES.has(c));
  const action: ModerationAction = severe || toxicity_score >= 80 ? "BLOCK" : "WARN";

  return { action, category, reason: reasonFor(category, action), toxicity_score };
}

function mapOpenAiCategory(flagged: string[]): ModerationCategory {
  if (flagged.some((c) => c.startsWith("hate"))) return "hate";
  if (flagged.some((c) => c === "harassment/threatening" || c.startsWith("violence") || c.startsWith("self-harm"))) {
    return "threat";
  }
  if (flagged.some((c) => c === "harassment" || c.startsWith("sexual"))) return "harassment";
  return "personal_attack";
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
  switch (category) {
    case "hate":
      return "That language is bordering on hate speech — dial it back.";
    case "harassment":
    case "personal_attack":
    default:
      return "Keep attacks focused on arguments, not users.";
  }
}
