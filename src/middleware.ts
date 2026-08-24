import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasSiteAccess, SITE_ACCESS_COOKIE } from "@/lib/site-auth";

const PUBLIC_PREFIXES = ["/site-login", "/api/site-auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const access = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (hasSiteAccess(access)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/site-login", request.url);
  const nextPath = `${pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
