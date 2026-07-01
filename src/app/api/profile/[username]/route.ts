import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/profile/:username — public profile. No auth required.
// Only exposes safe fields: no email, no password data, no private settings.
export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;

  try {
    const rows = await sql`
      SELECT
        id, username, avatar_url, aura, level, xp,
        wins, losses, current_streak, best_streak, bio, created_at
      FROM users
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const u = rows[0];
    const total = u.wins + u.losses;
    const winRate = total > 0 ? Math.round((u.wins / total) * 100) : 0;

    // Public battle history — completed battles only, no deleted
    const battleRows = await sql`
      SELECT
        b.id, b.title, b.topic, b.status, b.battle_type, b.mode,
        b.winner_id, b.created_at, b.battle_code,
        creator.id   AS creator_id,   creator.username   AS creator_username,
        opponent.id  AS opponent_id,  opponent.username  AS opponent_username
      FROM battles b
      JOIN users creator  ON creator.id  = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE
        (b.created_by = ${u.id} OR b.opponent_id = ${u.id})
        AND b.status NOT IN ('deleted', 'cancelled', 'expired', 'waiting')
      ORDER BY b.created_at DESC
      LIMIT 30
    `;

    return NextResponse.json({
      profile: {
        id: u.id,
        username: u.username,
        avatarUrl: u.avatar_url,
        aura: u.aura,
        level: u.level,
        xp: u.xp,
        wins: u.wins,
        losses: u.losses,
        winRate,
        currentStreak: u.current_streak,
        bestStreak: u.best_streak,
        bio: u.bio,
        createdAt: u.created_at,
      },
      battles: battleRows,
    });
  } catch (err) {
    console.error("Public profile error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
