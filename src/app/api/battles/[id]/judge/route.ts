import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// =========================================================
// Types
// =========================================================

interface JudgeScore {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
  total: number; // average of the six sub-scores, 0-100
}

interface BattleAnalysis {
  strongestArgument: string; // quotes/paraphrases the single strongest message and says whose it was
  weakestArgument: string;   // same, for the weakest message
  turningPoint: string;      // the moment the battle's momentum shifted
  bestComeback: string;      // the single best rebuttal/comeback of the battle
  finalSummary: string;      // 2-4 sentence recap of how the battle played out
}

interface JudgeResult {
  scores: Record<"creator" | "opponent", JudgeScore>;
  winner: "creator" | "opponent" | "draw";
  battleAnalysis: BattleAnalysis;
  aiVerdict: string; // short, punchy 1-2 sentence verdict — the headline, not the recap
  feedback: Record<"creator" | "opponent", string>;
}

const AURA_WIN = 25;
const AURA_DOMINANT_WIN = 50;
const AURA_LOSS = -15;
// A win is "dominant" if the winning score beats the losing score by this much.
const DOMINANT_MARGIN = 20;

// POST /api/battles/:id/judge — run the AI judge on a battle that's ready
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = params;

  try {
    const battleRows = await sql`
      SELECT b.id, b.title, b.topic, b.status, b.rounds,
             b.created_by, b.opponent_id,
             creator.username AS creator_username,
             opponent.username AS opponent_username
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE b.id = ${id}
      LIMIT 1
    `;

    if (battleRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const battle = battleRows[0];

    if (battle.created_by !== session.userId && battle.opponent_id !== session.userId) {
      return NextResponse.json({ error: "You are not a participant in this battle." }, { status: 403 });
    }

    if (battle.status === "completed") {
      return NextResponse.json({ error: "This battle has already been judged." }, { status: 409 });
    }

    if (battle.status !== "judging" && battle.status !== "pending_review") {
      return NextResponse.json(
        { error: "This battle isn't ready for judging yet. Both participants must finish all rounds first." },
        { status: 409 }
      );
    }

    if (!battle.opponent_id) {
      return NextResponse.json({ error: "This battle has no opponent." }, { status: 409 });
    }

    const messageRows = await sql`
      SELECT user_id, content, round, created_at
      FROM battle_messages
      WHERE battle_id = ${id}
      ORDER BY round ASC, created_at ASC
    `;

    if (messageRows.length === 0) {
      return NextResponse.json({ error: "This battle has no messages to judge yet." }, { status: 409 });
    }

    const creatorMessages = messageRows
      .filter((m) => m.user_id === battle.created_by)
      .map((m) => m.content as string);
    const opponentMessages = messageRows
      .filter((m) => m.user_id === battle.opponent_id)
      .map((m) => m.content as string);

    let judgeResult: JudgeResult;

    if (!process.env.OPENAI_API_KEY) {
      // No OpenAI key — use a deterministic fallback judge based on
      // message length, variety, and round-by-round scoring.
      judgeResult = fallbackJudge({
        creatorMessages,
        opponentMessages,
        creatorName: battle.creator_username,
        opponentName: battle.opponent_username,
      });
    } else {
      try {
        judgeResult = await runAiJudge({
          topic: battle.topic,
          title: battle.title,
          creatorName: battle.creator_username,
          opponentName: battle.opponent_username,
          creatorMessages,
          opponentMessages,
        });
      } catch (aiErr) {
        // AI call failed, timed out, or returned malformed JSON. Don't leave
        // the battle stuck in "judging" forever or silently 500 — park it
        // for a retry pass so it's easy to find and re-run later.
        console.error("AI judge call failed, marking battle for review:", aiErr);
        await sql`UPDATE battles SET status = 'pending_review' WHERE id = ${id}`;
        return NextResponse.json(
          {
            error: "The AI judge couldn't reach a verdict right now. This battle has been queued for review — try again shortly.",
            status: "pending_review",
          },
          { status: 202 }
        );
      }
    }

    const result = await saveJudgeResult(id, battle as { created_by: string; opponent_id: string }, judgeResult);
    return NextResponse.json(result);
  } catch (err) {
    console.error("AI judge error:", err);
    return NextResponse.json({ error: "Something went wrong while judging the battle." }, { status: 500 });
  }
}

// =========================================================
// Persist result + apply Aura/stat changes
// =========================================================

async function saveJudgeResult(
  battleId: string,
  battle: { created_by: string; opponent_id: string },
  judgeResult: JudgeResult
) {
  const winnerId =
    judgeResult.winner === "creator"
      ? battle.created_by
      : judgeResult.winner === "opponent"
      ? battle.opponent_id
      : null;

  const creatorTotal = judgeResult.scores.creator?.total ?? 0;
  const opponentTotal = judgeResult.scores.opponent?.total ?? 0;
  const margin = Math.abs(creatorTotal - opponentTotal);

  // ai_scores stores everything the verdict card needs in one JSONB blob:
  // per-player scores, the qualitative battle analysis, and per-player
  // feedback. ai_summary stays a plain-text column holding the short,
  // headline AI verdict (fast to read without parsing JSON).
  const aiScoresPayload = {
    creator: judgeResult.scores.creator,
    opponent: judgeResult.scores.opponent,
    battleAnalysis: judgeResult.battleAnalysis,
    feedback: judgeResult.feedback,
  };

  await sql`
    UPDATE battles
    SET status = 'completed',
        winner_id = ${winnerId},
        ai_summary = ${judgeResult.aiVerdict},
        ai_scores = ${JSON.stringify(aiScoresPayload)},
        completed_at = now()
    WHERE id = ${battleId}
  `;

  if (winnerId) {
    const loserId = winnerId === battle.created_by ? battle.opponent_id : battle.created_by;
    const winnerIsDominant = margin >= DOMINANT_MARGIN;
    const winnerAura = winnerIsDominant ? AURA_DOMINANT_WIN : AURA_WIN;

    await applyAuraChange(winnerId, winnerAura, winnerIsDominant ? "Dominant Win" : "Battle Win", battleId);
    await applyAuraChange(loserId, AURA_LOSS, "Battle Loss", battleId);

    await sql`
      UPDATE users SET wins = wins + 1,
        current_streak = current_streak + 1,
        best_streak = GREATEST(best_streak, current_streak + 1)
      WHERE id = ${winnerId}
    `;
    await sql`
      UPDATE users SET losses = losses + 1, current_streak = 0
      WHERE id = ${loserId}
    `;
  } else {
    // Draw — small participation Aura for both, no streak changes.
    await applyAuraChange(battle.created_by, 5, "Battle Draw", battleId);
    await applyAuraChange(battle.opponent_id, 5, "Battle Draw", battleId);
  }

  return {
    success: true,
    winnerId,
    aiVerdict: judgeResult.aiVerdict,
    scores: {
      creator: judgeResult.scores.creator,
      opponent: judgeResult.scores.opponent,
    },
    battleAnalysis: judgeResult.battleAnalysis,
    feedback: judgeResult.feedback,
  };
}

async function applyAuraChange(userId: string, amount: number, reason: string, battleId: string) {
  await sql`UPDATE users SET aura = GREATEST(aura + ${amount}, 0) WHERE id = ${userId}`;
  await sql`
    INSERT INTO aura_transactions (user_id, amount, reason, battle_id)
    VALUES (${userId}, ${amount}, ${reason}, ${battleId})
  `;
}

// =========================================================
// AI judge call
// =========================================================

async function runAiJudge(input: {
  topic: string;
  title: string;
  creatorName: string;
  opponentName: string;
  creatorMessages: string[];
  opponentMessages: string[];
}): Promise<JudgeResult> {
  const prompt = buildJudgePrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are the official AI Judge for Ragebait, a competitive roast/debate battle platform. " +
            "You don't just pick a winner — you understand how the battle unfolded: which argument landed hardest, " +
            "which fell flat, where the momentum shifted, and what the single best comeback was. " +
            "Score each participant 0-100 on: creativity, logic, humor, originality, comeback quality, and " +
            "entertainment value. You reward wit, sharp rebuttals, and staying on-topic. You must NOT reward " +
            "racism, hate speech, threats, harassment, body shaming, or personal attacks on real people — penalize " +
            "these heavily and call it out plainly in the analysis. Respond ONLY with valid JSON, no markdown, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("AI Judge returned an empty response.");
  }

  let parsedRaw: any;
  try {
    parsedRaw = JSON.parse(raw);
  } catch {
    throw new Error("AI Judge returned invalid JSON.");
  }

  return normalizeAiResponse(parsedRaw);
}

/**
 * The model is prompted for snake_case keys (battle_analysis, turning_point,
 * etc.) to match the platform's public JSON contract, but the rest of this
 * route works in camelCase. Normalize + validate here so a malformed or
 * partial model response throws instead of silently saving garbage.
 */
function normalizeAiResponse(raw: any): JudgeResult {
  const scores = raw?.scores;
  const analysis = raw?.battle_analysis;
  const feedback = raw?.feedback;

  if (!scores?.creator || !scores?.opponent || !analysis || typeof raw?.ai_verdict !== "string") {
    throw new Error("AI Judge response is missing required fields.");
  }

  const normalizeScore = (s: any): JudgeScore => {
    const creativity = clampScore(s.creativity);
    const logic = clampScore(s.logic);
    const humor = clampScore(s.humor);
    const originality = clampScore(s.originality);
    const comeback = clampScore(s.comeback);
    const entertainment = clampScore(s.entertainment);
    const total =
      typeof s.total === "number"
        ? clampScore(s.total)
        : Math.round((creativity + logic + humor + originality + comeback + entertainment) / 6);
    return { creativity, logic, humor, originality, comeback, entertainment, total };
  };

  const winner = raw.winner === "creator" || raw.winner === "opponent" ? raw.winner : "draw";

  return {
    scores: {
      creator: normalizeScore(scores.creator),
      opponent: normalizeScore(scores.opponent),
    },
    winner,
    battleAnalysis: {
      strongestArgument: String(analysis.strongest_argument ?? "").slice(0, 500),
      weakestArgument: String(analysis.weakest_argument ?? "").slice(0, 500),
      turningPoint: String(analysis.turning_point ?? "").slice(0, 500),
      bestComeback: String(analysis.best_comeback ?? "").slice(0, 500),
      finalSummary: String(analysis.final_summary ?? "").slice(0, 800),
    },
    aiVerdict: String(raw.ai_verdict).slice(0, 400),
    feedback: {
      creator: String(feedback?.creator ?? "").slice(0, 300),
      opponent: String(feedback?.opponent ?? "").slice(0, 300),
    },
  };
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildJudgePrompt(input: {
  topic: string;
  title: string;
  creatorName: string;
  opponentName: string;
  creatorMessages: string[];
  opponentMessages: string[];
}): string {
  const creatorTranscript = input.creatorMessages
    .map((m, i) => `[creator, round ${i + 1}] ${input.creatorName}: ${m}`)
    .join("\n");
  const opponentTranscript = input.opponentMessages
    .map((m, i) => `[opponent, round ${i + 1}] ${input.opponentName}: ${m}`)
    .join("\n");

  return `Battle title: ${input.title}
Topic: ${input.topic}

Full transcript, in the order each side posted (rounds are simultaneous — round 1
from both sides happened before round 2 from either):

Participant A ("creator", username: ${input.creatorName}):
${creatorTranscript}

Participant B ("opponent", username: ${input.opponentName}):
${opponentTranscript}

Analyze this battle like a judge who actually read every message, not just a scorer.

1. Score each participant 0-100 on: creativity, logic, humor, originality, comeback
   (quality of rebuttals to the opponent's points), entertainment. Compute "total" as
   the average of those 6 scores, rounded to the nearest integer (0-100).
2. Determine the winner: "creator", "opponent", or "draw" if totals are within 2
   points of each other.
3. Identify, quoting or closely paraphrasing the actual message text and naming whose
   line it was:
   - strongest_argument: the single most compelling point made in the whole battle
   - weakest_argument: the weakest/least effective point made
   - turning_point: the moment the battle's momentum clearly shifted, and why
   - best_comeback: the sharpest rebuttal to something the opponent said
4. final_summary: 2-4 sentences recapping how the battle actually played out round
   by round, not a generic restatement of the scores.
5. ai_verdict: a short, punchy 1-2 sentence headline verdict — this is the first
   thing shown to users, distinct from final_summary.

Respond with this exact JSON shape (snake_case keys, no extra commentary):
{
  "scores": {
    "creator": { "creativity": 0, "logic": 0, "humor": 0, "originality": 0, "comeback": 0, "entertainment": 0, "total": 0 },
    "opponent": { "creativity": 0, "logic": 0, "humor": 0, "originality": 0, "comeback": 0, "entertainment": 0, "total": 0 }
  },
  "winner": "creator" | "opponent" | "draw",
  "battle_analysis": {
    "strongest_argument": "",
    "weakest_argument": "",
    "turning_point": "",
    "best_comeback": "",
    "final_summary": ""
  },
  "ai_verdict": "",
  "feedback": {
    "creator": "1-2 sentence improvement tip",
    "opponent": "1-2 sentence improvement tip"
  }
}`;
}

// =========================================================
// Fallback judge (no OPENAI_API_KEY configured)
// =========================================================

/**
 * Fallback judge used when OPENAI_API_KEY is not set. Scores based on
 * message length, variety, and unique word count as a rough proxy for
 * effort and creativity, and derives a best-effort battle analysis from
 * the same signals (longest/most-varied message wins "strongest", etc.)
 * so the UI always has something to show, even without a model call.
 */
function fallbackJudge(input: {
  creatorMessages: string[];
  opponentMessages: string[];
  creatorName: string;
  opponentName: string;
}): JudgeResult {
  function scoreMessages(messages: string[]): JudgeScore {
    const totalLen = messages.reduce((s, m) => s + m.length, 0);
    const avgLen = totalLen / Math.max(messages.length, 1);
    const words = messages.join(" ").toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words).size;
    const variety = Math.min(100, Math.round((uniqueWords / Math.max(words.length, 1)) * 150));
    const length = Math.min(100, Math.round(avgLen / 3));

    // Add mild randomness (±8) so battles aren't always draws
    const rand = () => Math.floor(Math.random() * 17) - 8;

    const humor         = Math.min(100, Math.max(0, Math.round(length * 0.4 + variety * 0.6) + rand()));
    const creativity    = Math.min(100, Math.max(0, Math.round(variety) + rand()));
    const originality   = Math.min(100, Math.max(0, Math.round(variety * 0.8 + length * 0.2) + rand()));
    const logic          = Math.min(100, Math.max(0, 60 + rand()));
    const comeback       = Math.min(100, Math.max(0, Math.round(length * 0.5 + variety * 0.5) + rand()));
    const entertainment  = Math.min(100, Math.max(0, Math.round(humor * 0.6 + creativity * 0.4) + rand()));
    const total = Math.round((creativity + logic + humor + originality + comeback + entertainment) / 6);
    return { creativity, logic, humor, originality, comeback, entertainment, total };
  }

  function longestMessage(messages: string[]): string {
    return messages.reduce((longest, m) => (m.length > longest.length ? m : longest), messages[0] ?? "");
  }
  function shortestMessage(messages: string[]): string {
    return messages.reduce((shortest, m) => (m.length < shortest.length ? m : shortest), messages[0] ?? "");
  }

  const creatorScores  = scoreMessages(input.creatorMessages);
  const opponentScores = scoreMessages(input.opponentMessages);
  const diff = creatorScores.total - opponentScores.total;

  const winner: "creator" | "opponent" | "draw" =
    Math.abs(diff) <= 2 ? "draw" : diff > 0 ? "creator" : "opponent";

  const winnerName = winner === "creator" ? input.creatorName : winner === "opponent" ? input.opponentName : null;
  const strongestSide = creatorScores.total >= opponentScores.total ? input.creatorName : input.opponentName;
  const strongestMsgs = creatorScores.total >= opponentScores.total ? input.creatorMessages : input.opponentMessages;
  const weakestSide = creatorScores.total >= opponentScores.total ? input.opponentName : input.creatorName;
  const weakestMsgs = creatorScores.total >= opponentScores.total ? input.opponentMessages : input.creatorMessages;

  const aiVerdict =
    winner === "draw"
      ? `${input.creatorName} and ${input.opponentName} fought to a dead-even draw.`
      : `${winnerName} takes the win in a close-fought battle.`;

  const finalSummary =
    winner === "draw"
      ? `It was a close battle between ${input.creatorName} and ${input.opponentName}. Both participants showed strong effort and the scores were nearly identical — this one goes down as a draw.`
      : `${winnerName} edged out the win in this battle with stronger variety and creativity across their roasts. A solid performance that earned the Aura.`;

  const battleAnalysis: BattleAnalysis = {
    strongestArgument: `${strongestSide}: "${truncate(longestMessage(strongestMsgs), 160)}"`,
    weakestArgument: `${weakestSide}: "${truncate(shortestMessage(weakestMsgs), 160)}"`,
    turningPoint:
      input.creatorMessages.length && input.opponentMessages.length
        ? `Round ${Math.max(1, Math.ceil(Math.max(input.creatorMessages.length, input.opponentMessages.length) / 2))} is where the momentum settled toward ${winnerName ?? "neither side"}.`
        : "Not enough rounds to identify a clear turning point.",
    bestComeback: `${strongestSide}: "${truncate(longestMessage(strongestMsgs), 160)}"`,
    finalSummary,
  };

  const feedback = {
    creator: "Try to vary your vocabulary more and keep each roast focused on the battle topic for higher scores.",
    opponent: "Try to vary your vocabulary more and keep each roast focused on the battle topic for higher scores.",
  };

  return { scores: { creator: creatorScores, opponent: opponentScores }, winner, battleAnalysis, aiVerdict, feedback };
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
