import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { AUTH_COOKIE_NAME, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Invalid input.", field: firstError?.path[0] },
      { status: 400 }
    );
  }

  const { username, email, password, dob } = parsed.data;

  try {
    const existing = await sql`
      SELECT id FROM users
      WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username or email is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rows = await sql`
      INSERT INTO users (username, email, password_hash, date_of_birth)
      VALUES (${username}, ${email}, ${passwordHash}, ${dob})
      RETURNING id, username
    `;

    const user = rows[0];
    const token = await signSession({ userId: user.id, username: user.username });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
