import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
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

  try {
    const battleRows = await sql`
      SELECT id, created_by, opponent_id, status, rounds
      FROM battles WHERE id = ${id} LIMIT 1
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

    const inserted = await sql`
      INSERT INTO battle_messages (battle_id, user_id, content, round)
      VALUES (${id}, ${session.userId}, ${parsed.data.content}, ${round})
      RETURNING id, content, round, created_at
    `;

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
    });