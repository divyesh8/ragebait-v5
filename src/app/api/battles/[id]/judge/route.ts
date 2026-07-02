import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { runConversationalAiJudge, type JudgeResult } from "@/services/aiJudge";

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
      SELECT b.id, b.title, b.topic, b.status, b.rounds, b.battle_type, b.mode,
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

    let judgeResult: JudgeResult;

    try {
      judgeResult = await runConversationalAiJudge({
        battleId: id,
        topic: battle.topic,
        title: battle.title,
        battleType: battle.battle_type,
        mode: battle.mode,
        creatorId: battle.created_by,
        opponentId: battle.opponent_id,
        creatorName: battle.creator_username,
        opponentName: battle.opponent_username,
        messages: messageRows.map((m) => ({
          user_id: String(m.user_id),
          content: String(m.content),
          round: Number(m.round),
          created_at: m.created_at ? String(m.created_at) : undefined,
        })),
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
    rageMind: (judgeResult as any).rageMind ?? null,
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
