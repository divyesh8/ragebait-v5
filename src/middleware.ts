import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Pages that should redirect AWAY if you're already logged in.
const AUTH_ONLY_WHEN_LOGGED_OUT = ["/login", "/signup"];

// Pages that genuinely require a session — bounce to /login if not authenticated.
const REQUIRES_AUTH = ["/settings"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  if (AUTH_ONLY_WHEN_LOGGED_OUT.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (session) {
      return NextResponse.redirect(new URL("/profile", req.url));
    }
    return NextResponse.next();
  }

  if (REQUIRES_AUTH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/settings", "/settings/:path*"],
};
