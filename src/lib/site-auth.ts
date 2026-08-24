export const SITE_ACCESS_COOKIE = "site-access";

export function sitePassword() {
  return process.env.SITE_PASSWORD || "123";
}

export function hasSiteAccess(value: string | undefined) {
  return value === "1";
}
