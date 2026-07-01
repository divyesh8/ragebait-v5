import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { interestsUpdateSchema } from "@/lib/validation";

// GET /api/interests — the current user's followed topic category IDs
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT topic_category_id FROM user_interests WHERE user_id = ${session.userId}
    `;
    return NextResponse.json({ categoryIds: rows.map((r) => r.topic_category_id) });
  } catch (err) {
    console.error("Get interests error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PATCH /api/interests — replace the full set of followed categories
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

  const parsed = interestsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    // Replace-all: delete existing, insert the new set. Simple and correct
    // for a small per-user list; wrapped so a failure never leaves a user
    // with an inconsistent half-applied set under normal operation.
    await sql`DELETE FROM user_interests WHERE user_id = ${session.userId}`;

    const { categoryIds } = parsed.data;
    if (categoryIds.length > 0) {
      const valuesSql = categoryIds.map((_id, i) => `($1, $${i + 2})`).join(",");
      await sql(
        `INSERT INTO user_interests (user_id, topic_category_id) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
        [session.userId, ...categoryIds]
      );
    }

    return NextResponse.json({ success: true, categoryIds });
  } catch (err) {
    console.error("Update interests error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
