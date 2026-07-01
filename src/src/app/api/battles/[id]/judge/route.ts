import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

interface JudgeScore {
  humor: number;
  creativity: number;
  originality: number;
  topicRelevance: number;
  timing: number;
  comebackQuality: number;
  confidence: number;
  wordplay: number;
  consistency: number;
  total: number;
}

interface JudgeResult {
  scores: Record<string, JudgeScore>; // keyed by "creator" | "opponent"
  winner: "creator" | "opponent" | "draw";
  summary: string;
  feedback: Record<string, string>; // keyed by "creator" | "opponent"
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

    if (battle.status !== "judging") {
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

    const creatorMessages = messageRows
      .filter((m) => m.user_id === battle.created_by)
      .map((m) => m.content as string);
    const opponentMessages = messageRows
      .filter((m) => m.user_id === battle.opponent_id)
      .map((m) => m.content as string);

    if (!process.env.OPENAI_API_KEY) {
      // No OpenAI key — use a deterministic fallback judge based on
      // message length, variety, and round-by-round scoring.
      const judgeResult = fallbackJudge({
        creatorMessages,
        opponentMessages,
        creatorName: battle.creator_username,
        opponentName: battle.opponent_username,
      });

      const winnerId =
        judgeResult.winner === "creator"
          ? battle.created_by
          : judgeResult.winner === "opponent"
          ? battle.opponent_id
          : null;

      const creatorTotal = judgeResult.scores.creator?.total ?? 0;
      const opponentTotal = judgeResult.scores.opponent?.total ?? 0;
      const margin = Math.abs(creatorTotal - opponentTotal);

      await sql`
        UPDATE battles
        SET status = 'completed',
            winner_id = ${winnerId},
            ai_summary = ${judgeResult.summary},
            ai_scores = ${JSON.stringify({
              creator: judgeResult.scores.creator,
              opponent: judgeResult.scores.opponent,
              feedback: judgeResult.feedback,
            })},
            completed_at = now()
        WHERE id = ${id}
      `;

      if (winnerId) {
        const loserId = winnerId === battle.created_by ? battle.opponent_id : battle.created_by;
        const winnerIsDominant = margin >= DOMINANT_MARGIN;
        const winnerAura = winnerIsDominant ? AURA_DOMINANT_WIN : AURA_WIN;
        await applyAuraChange(winnerId, winnerAura, winnerIsDominant ? "Dominant Win" : "Battle Win", id);
        await applyAuraChange(loserId, AURA_LOSS, "Battle Loss", id);
        await sql`UPDATE users SET wins = wins + 1, current_streak = current_streak + 1, best_streak = GREATEST(best_streak, current_streak + 1) WHERE id = ${winnerId}`;
        await sql`UPDATE users SET losses = losses + 1, current_streak = 0 WHERE id = ${loserId}`;
      } else {
        await applyAuraChange(battle.created_by, 5, "Battle Draw", id);
        await applyAuraChange(battle.opponent_id, 5, "Battle Draw", id);
      }

      return NextResponse.json({
        success: true,
        winnerId,
        summary: judgeResult.summary,
        scores: judgeResult.scores,
        feedback: judgeResult.feedback,
        note: "Scored by built-in judge (no OpenAI key configured).",
      });
    }

    const judgeResult = await runAiJudge({
      topic: battle.topic,
      title: battle.title,
      creatorName: battle.creator_username,
      opponentName: battle.opponent_username,
      creatorMessages,
      opponentMessages,
    });

    const winnerId =
      judgeResult.winner === "creator"
        ? battle.created_by
        : judgeResult.winner === "opponent"
        ? battle.opponent_id
        : null;

    const creatorTotal = judgeResult.scores.creator?.total ?? 0;
    const opponentTotal = judgeResult.scores.opponent?.total ?? 0;
    const margin = Math.abs(creatorTotal - opponentTotal);

    await sql`
      UPDATE battles
      SET status = 'completed',
          winner_id = ${winnerId},
          ai_summary = ${judgeResult.summary},
          ai_scores = ${JSON.stringify({
            creator: judgeResult.scores.creator,
            opponent: judgeResult.scores.opponent,
            feedback: judgeResult.feedback,
          })},
          completed_at = now()
      WHERE id = ${id}
    `;

    // Update Aura + win/loss records for both participants.
    if (winnerId) {
      const loserId = winnerId === battle.created_by ? battle.opponent_id : battle.created_by;
      const winnerIsDominant = margin >= DOMINANT_MARGIN;
      const winnerAura = winnerIsDominant ? AURA_DOMINANT_WIN : AURA_WIN;

      await applyAuraChange(winnerId, winnerAura, winnerIsDominant ? "Dominant Win" : "Battle Win", id);
      await applyAuraChange(loserId, AURA_LOSS, "Battle Loss", id);

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
      await applyAuraChange(battle.created_by, 5, "Battle Draw", id);
      await applyAuraChange(battle.opponent_id, 5, "Battle Draw", id);
    }

    return NextResponse.json({
      success: true,
      winnerId,
      summary: judgeResult.summary,
      scores: judgeResult.scores,
      feedback: judgeResult.feedback,
    });
  } catch (err) {
    console.error("AI judge error:", err);
    return NextResponse.json({ error: "Something went wrong while judging the battle." }, { status: 500 });
  }
}

async function applyAuraChange(userId: string, amount: number, reason: string, battleId: string) {
  await sql`UPDATE users SET aura = GREATEST(aura + ${amount}, 0) WHERE id = ${userId}`;
  await sql`
    INSERT INTO aura_transactions (user_id, amount, reason, battle_id)
    VALUES (${userId}, ${amount}, ${reason}, ${battleId})
  `;
}

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
            "You are the AI Judge for Ragebait, a roast battle platform. You score battles on humor, creativity, originality, topic relevance, timing, comeback quality, confidence, wordplay, and consistency (each 0-100, summed for a total out of 900, but report a normalized total out of 100 too). You reward wit and creativity, and you must NOT reward racism, hate speech, threats, harassment, body shaming, or personal attacks — penalize these heavily in 'consistency' and note it in feedback. Respond ONLY with valid JSON, no markdown, no commentary.",
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

  let parsed: JudgeResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI Judge returned invalid JSON.");
  }

  return parsed;
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
    .map((m, i) => `Round ${i + 1}: ${m}`)
    .join("\n");
  const opponentTranscript = input.opponentMessages
    .map((m, i) => `Round ${i + 1}: ${m}`)
    .join("\n");

  return `Battle title: ${input.title}
Topic: ${input.topic}

Participant A ("creator", username: ${input.creatorName}):
${creatorTranscript}

Participant B ("opponent", username: ${input.opponentName}):
${opponentTranscript}

Score each participant 0-100 on each of: humor, creativity, originality, topicRelevance, timing, comebackQuality, confidence, wordplay, consistency. Compute "total" as the average of those 9 scores, rounded to the nearest integer (0-100).

Determine the winner: "creator", "opponent", or "draw" if totals are within 2 points of each other.

Respond with this exact JSON shape:
{
  "scores": {
    "creator": { "humor": 0, "creativity": 0, "originality": 0, "topicRelevance": 0, "timing": 0, "comebackQuality": 0, "confidence": 0, "wordplay": 0, "consistency": 0, "total": 0 },
    "opponent": { "humor": 0, "creativity": 0, "originality": 0, "topicRelevance": 0, "timing": 0, "comebackQuality": 0, "confidence": 0, "wordplay": 0, "consistency": 0, "total": 0 }
  },
  "winner": "creator" | "opponent" | "draw",
  "summary": "2-3 sentence battle summary explaining the outcome",
  "feedback": {
    "creator": "1-2 sentence improvement tip",
    "opponent": "1-2 sentence improvement tip"
  }
}`;
}

/**
 * Fallback judge used when OPENAI_API_KEY is not set.
 * Scores based on message length, variety, and unique word count as a
 * rough proxy for effort and creativity.
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

    const humor        = Math.min(100, Math.max(0, Math.round((length * 0.4 + variety * 0.6)) + rand()));
    const creativity   = Math.min(100, Math.max(0, Math.round(variety) + rand()));
    const originality  = Math.min(100, Math.max(0, Math.round(variety * 0.8 + length * 0.2) + rand()));
    const topicRelevance = Math.min(100, Math.max(0, 65 + rand()));
    const timing       = Math.min(100, Math.max(0, 60 + rand()));
    const comebackQuality = Math.min(100, Math.max(0, Math.round(length * 0.5 + variety * 0.5) + rand()));
    const confidence   = Math.min(100, Math.max(0, Math.round(length * 0.7) + rand()));
    const wordplay     = Math.min(100, Math.max(0, Math.round(variety * 0.9) + rand()));
    const consistency  = Math.min(100, Math.max(0, 70 + rand()));
    const total = Math.round(
      (humor + creativity + originality + topicRelevance + timing +
        comebackQuality + confidence + wordplay + consistency) / 9
    );
    return { humor, creativity, originality, topicRelevance, timing, comebackQuality, confidence, wordplay, consistency, total };
  }

  const creatorScores  = scoreMessages(input.creatorMessages);
  const opponentScores = scoreMessages(input.opponentMessages);
  const diff = creatorScores.total - opponentScores.total;

  const winner: "creator" | "opponent" | "draw" =
    Math.abs(diff) <= 2 ? "draw" : diff > 0 ? "creator" : "opponent";

  const winnerName = winner === "creator" ? input.creatorName : winner === "opponent" ? input.opponentName : null;

  const summary =
    winner === "draw"
      ? `It was a close battle between ${input.creatorName} and ${input.opponentName}. Both participants showed strong effort and the scores were nearly identical — this one goes down as a draw.`
      : `${winnerName} edged out the win in this battle with stronger variety and creativity across their roasts. A solid performance that earned the Aura.`;

  const feedback = {
    creator: "Try to vary your vocabulary more and keep each roast focused on the battle topic for higher scores.",
    opponent: "Try to vary your vocabulary more and keep each roast focused on the battle topic for higher scores.",
  };

  return { scores: { creator: creatorScores, opponent: opponentScores }, winner, summary, feedback };
}
