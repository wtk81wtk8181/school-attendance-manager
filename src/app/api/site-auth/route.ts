import { NextResponse } from "next/server";
import { SITE_ACCESS_COOKIE, sitePassword } from "@/lib/site-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim() ?? "";

  if (password !== sitePassword()) {
    return NextResponse.json({ error: "密碼錯誤，請再試一次。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_ACCESS_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
