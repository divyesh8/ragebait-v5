import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { avatarSelectSchema } from "@/lib/validation";
import { resolveAvatarId } from "@/lib/avatars";

// POST /api/profile/avatar — pick one of the curated avatar options
export async function POST(req: NextRequest) {
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

  const parsed = avatarSelectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick an avatar from the list." }, { status: 400 });
  }

  const url = resolveAvatarId(parsed.data.avatarId);
  if (!url) {
    return NextResponse.json({ error: "That's not a valid avatar option." }, { status: 400 });
  }

  try {
    const rows = await sql`
      UPDATE users SET avatar_url = ${url}
      WHERE id = ${session.userId}
      RETURNING id, avatar_url
    `;
    return NextResponse.json({ success: true, avatarUrl: rows[0].avatar_url });
  } catch (err) {
    console.error("Select avatar error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
