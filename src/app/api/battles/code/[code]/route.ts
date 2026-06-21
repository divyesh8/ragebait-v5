import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { battleCodeSchema } from "@/lib/validation";

// GET /api/battles/code/:code — look up a battle by its short shareable code
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const parsed = battleCodeSchema.safeParse({ code: params.code });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid battle code." }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT
        b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
        b.rounds, b.created_at, b.expires_at,
        creator.username AS creator_username, creator.avatar_url AS creator_avatar,
        opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE upper(b.battle_code) = upper(${parsed.data.code})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "No battle found with that code." }, { status: 404 });
    }

    return NextResponse.json({ battle: rows[0] });
  } catch (err) {
    console.error("Battle code lookup error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
