export const SITE_ACCESS_COOKIE = "site-access";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function sitePassword() {
  const configured = process.env.SITE_PASSWORD?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "123";
  throw new Error("Production requires SITE_PASSWORD.");
}

function sessionSecret() {
  return process.env.SITE_SESSION_SECRET?.trim() || sitePassword();
}

function base64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(expiresAt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64Url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiresAt))
  );
}

export async function createSiteAccessToken() {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${await sign(expiresAt)}`;
}

export async function hasSiteAccess(value: string | undefined) {
  if (!value) return false;
  const [expiresAt, suppliedSignature, extra] = value.split(".");
  if (!expiresAt || !suppliedSignature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  const expectedSignature = await sign(expiresAt);
  if (suppliedSignature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    mismatch |= suppliedSignature.charCodeAt(index) ^ expectedSignature.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function isSiteRequestAuthorized(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SITE_ACCESS_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.slice(SITE_ACCESS_COOKIE.length + 1)) : undefined;
  return hasSiteAccess(value);
}

export { SESSION_MAX_AGE_SECONDS };
