import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/topics — list the recommended topic categories, used by the
// battle-creation "Choose Topic" cards and the interests picker.
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, slug FROM topic_categories ORDER BY sort_order ASC
    `;
    return NextResponse.json({ categories: rows });
  } catch (err) {
    console.error("List topics error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
