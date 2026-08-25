import { NextResponse } from "next/server";
import {
  createSiteAccessToken,
  SESSION_MAX_AGE_SECONDS,
  SITE_ACCESS_COOKIE,
  sitePassword,
} from "@/lib/site-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const existing = attempts.get(clientKey);
  const attempt =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + WINDOW_MS };
  if (attempt.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "密碼嘗試次數過多，請於 15 分鐘後再試。" },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim() ?? "";

  let expectedPassword: string;
  try {
    expectedPassword = sitePassword();
  } catch {
    return NextResponse.json(
      { error: "網站尚未設定存取密碼，請聯絡管理員。" },
      { status: 503 }
    );
  }

  if (password !== expectedPassword) {
    attempts.set(clientKey, { ...attempt, count: attempt.count + 1 });
    return NextResponse.json({ error: "密碼錯誤，請再試一次。" }, { status: 401 });
  }

  attempts.delete(clientKey);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_ACCESS_COOKIE, await createSiteAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
