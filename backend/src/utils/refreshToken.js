
import {
  randomBytes,
  randomUUID,
  createHash,
} from "node:crypto";

export const REFRESH_COOKIE_NAME = "api_monitor_refresh";
export const REFRESH_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;

const COOKIE_PATH = "/api/v1/auth";

function isSecureCookie() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.COOKIE_SECURE !== "true"
  ) {
    throw new Error("Production requires COOKIE_SECURE=true");
  }

  return process.env.COOKIE_SECURE === "true";
}

export function createRefreshToken(sessionId = randomUUID()) {
  const secret = randomBytes(32).toString("base64url");
  const token = `${sessionId}.${secret}`;

  return {
    sessionId,
    token,
    tokenHash: hashRefreshToken(token),
  };
}

export function hashRefreshToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getSessionIdFromToken(token) {
  if (typeof token !== "string") return null;

  const match =
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i.exec(token);

  return match?.[1] ?? null;
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res, token, expiresAt) {
  const maxAge = Math.max(
    0,
    expiresAt.getTime() - Date.now()
  );

  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    baseCookieOptions()
  );
}
