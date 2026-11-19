import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionToken } from "./lib/auth";

const PUBLIC = ["/login", "/api/login", "/api/cron", "/sw.js", "/manifest.webmanifest", "/icon.svg"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!process.env.APP_PASSCODE) return NextResponse.next(); // local dev without a passcode
  if (req.cookies.get(COOKIE)?.value === (await sessionToken())) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
