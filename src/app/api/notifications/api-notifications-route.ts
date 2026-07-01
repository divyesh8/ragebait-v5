import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/notifications — latest 30 notifications for the current user,
// plus an unread count. Polled by the frontend bell every ~15s.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const [notifications, unreadRows] = await Promise.all([
      sql`
        SELECT id, type, title, body, battle_id, actor_id, read, created_at
        FROM notifications
        WHERE user_id = ${session.userId}
        ORDER BY created_at DESC
        LIMIT 30
      `,
      sql`
        SELECT COUNT(*)::int AS count FROM notifications
        WHERE user_id = ${session.userId} AND read = FALSE
      `,
    ]);

    return NextResponse.json({
      notifications,
      unreadCount: unreadRows[0]?.count ?? 0,
    });
  } catch (err) {
    console.error("List notifications error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all (or one, via { id }) as read
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — treated as "mark all read"
  }

  try {
    if (body.id) {
      await sql`
        UPDATE notifications SET read = TRUE
        WHERE id = ${body.id} AND user_id = ${session.userId}
      `;
    } else {
      await sql`
        UPDATE notifications SET read = TRUE
        WHERE user_id = ${session.userId} AND read = FALSE
      `;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
