import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const rows = await sql`
      SELECT id, username, email, aura, level, xp, wins, losses,
             current_streak, best_streak, bio, avatar_url, created_at
      FROM users
      WHERE id = ${session.userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("Session lookup error:", err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
