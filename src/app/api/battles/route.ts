import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { analyzeMessage } from "@/services/aiModerator";
import {
  getActivePenalty,
  checkRateLimit,
  recordModerationEvent,
} from "@/lib/moderationEnforcement";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
});

// POST /api/battles/:id/messages — post a roast in a live battle
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
    // Enforcement checks first — these are pure lookups against
    // moderation_logs / user_moderation_penalties, no message content
    // needed yet, so they run before we even parse the request body.
    const [suspension, cooldown] = await Promise.all([
      getActivePenalty(session.userId, "battle_suspension"),
      getActivePenalty(session.userId, "chat_cooldown"),
    ]);

    if (suspension) {
      return NextResponse.json(
        {
          error: `You're temporarily suspended from battle participation until ${new Date(suspension.expiresAt).toLocaleString()} due to repeated blocked messages.`,
          penalty: suspension,
        },
        { status: 403 }
      );
    }

    if (cooldown) {
      return NextResponse.json(
        {
          error: `You're in a chat cooldown until ${new Date(cooldown.expiresAt).toLocaleString()} due to repeated warnings.`,
          penalty: cooldown,
        },
        { status: 403 }
      );
    }

    const rateLimit = await checkRateLimit(session.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason, retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
    }

    const battleRows = await sql`
      SELECT b.id, b.created_by, b.opponent_id, b.status, b.rounds, b.topic, b.battle_type, b.mode,
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

    if (battle.status !== "active") {
      return NextResponse.json({ error: "This battle is not currently live." }, { status: 409 });
    }

    if (battle.created_by !== session.userId && battle.opponent_id !== session.userId) {
      return NextResponse.json({ error: "You are not a participant in this battle." }, { status: 403 });
    }

    // Determine which round this message belongs to: count this user's
    // existing messages + 1.
    const countRows = await sql`
      SELECT COUNT(*)::int AS count FROM battle_messages
      WHERE battle_id = ${id} AND user_id = ${session.userId}
    `;
    const round = (countRows[0]?.count ?? 0) + 1;

    if (round > battle.rounds) {
      return NextResponse.json(
        { error: `You've already posted all ${battle.rounds} of your roasts for this battle.` },
        { status: 409 }
      );
    }

    // AI moderation gate — run before the message ever touches the DB.
    // Local rules first (instant, and covers duplicate/flood detection so
    // repeats never cost an AI call), then a context-aware AI pass if a
    // key is configured. Context includes the topic, format, and the
    // recent conversation from both sides so the AI can tell competitive
    // roasting apart from real harassment.
    const isSenderCreator = battle.created_by === session.userId;
    const senderUsername = isSenderCreator ? battle.creator_username : battle.opponent_username;
    const opponentUsername = isSenderCreator ? battle.opponent_username : battle.creator_username;

    const recentRows = await sql`
      SELECT bm.user_id, bm.content
      FROM battle_messages bm
      WHERE bm.battle_id = ${id}
      ORDER BY bm.created_at DESC
      LIMIT 10
    `;
    const recentMessages = recentRows
      .filter((r) => r.user_id === session.userId)
      .map((r) => r.content as string);
    const conversationHistory = [...recentRows]
      .reverse()
      .map((r) => ({
        username: r.user_id === battle.created_by ? battle.creator_username : battle.opponent_username,
        content: r.content as string,
      }));

    const verdict = await analyzeMessage(parsed.data.content, {
      recentMessages,
      battleTopic: battle.topic,
      battleType: battle.battle_type,
      mode: battle.mode,
      senderUsername,
      opponentUsername,
      conversationHistory,
    });

    if (verdict.action === "BLOCK") {
      const escalation = await recordModerationEvent({
        userId: session.userId,
        battleId: id,
        messageId: null,
        action: "BLOCK",
        category: verdict.category,
        reason: verdict.reason,
        toxicityScore: verdict.toxicity_score,
        source: verdict.source,
      });

      return NextResponse.json(
        {
          error: "Message blocked. Keep the battle competitive.",
          category: verdict.category,
          reason: verdict.reason,
          toxicity_score: verdict.toxicity_score,
          escalation,
        },
        { status: 422 }
      );
    }

    const inserted = await sql`
      INSERT INTO battle_messages (battle_id, user_id, content, round)
      VALUES (${id}, ${session.userId}, ${parsed.data.content}, ${round})
      RETURNING id, content, round, created_at
    `;

    const escalation = await recordModerationEvent({
      userId: session.userId,
      battleId: id,
      messageId: inserted[0].id,
      action: verdict.action,
      category: verdict.category,
      reason: verdict.reason,
      toxicityScore: verdict.toxicity_score,
      source: verdict.source,
    });

    // Check if both participants have now posted all their rounds —
    // if so, mark the battle as ready for judging.
    const totalsRows = await sql`
      SELECT user_id, COUNT(*)::int AS count
      FROM battle_messages
      WHERE battle_id = ${id}
      GROUP BY user_id
    `;

    const creatorCount = totalsRows.find((r) => r.user_id === battle.created_by)?.count ?? 0;
    const opponentCount = battle.opponent_id
      ? totalsRows.find((r) => r.user_id === battle.opponent_id)?.count ?? 0
      : 0;

    let readyForJudging = false;
    if (
      battle.opponent_id &&
      creatorCount >= battle.rounds &&
      opponentCount >= battle.rounds
    ) {
      await sql`UPDATE battles SET status = 'judging' WHERE id = ${id} AND status = 'active'`;
      readyForJudging = true;
    }

    return NextResponse.json({
      message: inserted[0],
      readyForJudging,
      warning:
        verdict.action === "WARN"
          ? {
              message: "Keep attacks focused on arguments, not users.",
              category: verdict.category,
              reason: verdict.reason,
              toxicity_score: verdict.toxicity_score,
            }
          : null,
      escalation,
    });
  } catch (err) {
    console.error("Post battle message error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
