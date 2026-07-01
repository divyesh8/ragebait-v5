import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest) {
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

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    // COALESCE so omitted fields keep their existing value instead of being
    // wiped out — only fields actually present in the request body change.
    const rows = await sql`
      UPDATE users
      SET
        bio = COALESCE(${parsed.data.bio ?? null}, bio),
        avatar_url = COALESCE(${parsed.data.avatarUrl || null}, avatar_url)
      WHERE id = ${session.userId}
      RETURNING id, username, email, aura, level, xp, wins, losses,
                current_streak, best_streak, bio, avatar_url, created_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
