import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { AUTH_COOKIE_NAME, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  try {
    const rows = await sql`
      SELECT id, username, email, password_hash, email_verified
      FROM users
      WHERE LOWER(username) = LOWER(${identifier}) OR LOWER(email) = LOWER(${identifier})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "Please enter the correct password." },
        { status: 401 }
      );
    }

    if (!user.email_verified) {
      // NOTE: email verification (OTP) flow is not yet implemented.
      // Once it is, uncomment the block below to enforce it.
      // return NextResponse.json(
      //   { error: "Please verify your email first." },
      //   { status: 403 }
      // );
    }

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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
