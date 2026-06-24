import * as cookie from "cookie";
import { Session } from "@contracts/constants";

export function getSessionCookieOptions(headers: Headers) {
  const isSecure = headers.get("x-forwarded-proto") === "https";
  const origin = headers.get("origin");

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: (origin ? "lax" : "none") as "lax" | "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export function parseSessionToken(headers: Headers): string | undefined {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return undefined;

  const cookies = cookie.parse(cookieHeader);
  return cookies[Session.cookieName] || undefined;
}
