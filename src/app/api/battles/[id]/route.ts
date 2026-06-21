import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { battleEditSchema } from "@/lib/validation";

// GET /api/battles/:id — full battle detail including messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Lazily expire if this specific battle's window passed.
    await sql`
      UPDATE battles SET status = 'expired'
      WHERE id = ${id} AND status = 'waiting' AND expires_at < now()
    `;

    const battleRows = await sql`
      SELECT
        b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
        b.rounds, b.winner_id, b.ai_summary, b.ai_scores,
        b.created_at, b.started_at, b.completed_at, b.expires_at,
        creator.id AS creator_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
        opponent.id AS opponent_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE b.id = ${id}
      LIMIT 1
    `;

    if (battleRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const messageRows = await sql`
      SELECT m.id, m.content, m.round, m.created_at,
             u.id AS user_id, u.username, u.avatar_url
      FROM battle_messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.battle_id = ${id}
      ORDER BY m.created_at ASC
    `;

    return NextResponse.json({ battle: battleRows[0], messages: messageRows });
  } catch (err) {
    console.error("Get battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PATCH /api/battles/:id — owner-only edit (title/topic/rounds), only while still 'waiting'
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = battleEditSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    const existing = await sql`
      SELECT created_by, status FROM battles WHERE id = ${params.id} LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }
    if (existing[0].created_by !== session.userId) {
      return NextResponse.json({ error: "Only the battle creator can edit it." }, { status: 403 });
    }
    if (existing[0].status !== "waiting") {
      return NextResponse.json(
        { error: "You can only edit a battle while it's still waiting for an opponent." },
        { status: 409 }
      );
    }

    const { title, topic, rounds } = parsed.data;
    const rows = await sql`
      UPDATE battles
      SET
        title  = COALESCE(${title ?? null}, title),
        topic  = COALESCE(${topic ?? null}, topic),
        rounds = COALESCE(${rounds ?? null}, rounds)
      WHERE id = ${params.id}
      RETURNING id, title, topic, rounds, battle_code, status
    `;

    return NextResponse.json({ battle: rows[0] });
  } catch (err) {
    console.error("Edit battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE /api/battles/:id — owner-only hard delete. Only allowed for battles that
// never had a real opponent engagement (waiting / cancelled / expired), so we never
// erase an opponent's match history out from under them.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const existing = await sql`
      SELECT created_by, status FROM battles WHERE id = ${params.id} LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }
    if (existing[0].created_by !== session.userId) {
      return NextResponse.json({ error: "Only the battle creator can delete it." }, { status: 403 });
    }
    if (!["waiting", "cancelled", "expired"].includes(existing[0].status)) {
      return NextResponse.json(
        { error: "Battles that already have an opponent can't be deleted, only cancelled before that point." },
        { status: 409 }
      );
    }

    await sql`DELETE FROM battles WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
