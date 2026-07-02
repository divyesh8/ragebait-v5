import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest, verifySession, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL?.trim().toLowerCase() ?? "";

export function isFounderEmail(email: string | null | undefined): boolean {
  return Boolean(FOUNDER_EMAIL && email?.trim().toLowerCase() === FOUNDER_EMAIL);
}

export async function getFounderStatusForUserId(userId: string): Promise<boolean> {
  if (!FOUNDER_EMAIL) return false;

  const rows = await sql`
    SELECT email
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return isFounderEmail(rows[0]?.email);
}

export async function requireCreatorFromRequest(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return null;

  const isCreator = await getFounderStatusForUserId(session.userId);
  return isCreator ? session : null;
}

export async function requireCreatorFromCookies() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const isCreator = await getFounderStatusForUserId(session.userId);
  return isCreator ? session : null;
}
