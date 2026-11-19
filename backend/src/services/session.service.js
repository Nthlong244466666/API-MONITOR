
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";

import {
  createRefreshToken,
  getSessionIdFromToken,
  hashRefreshToken,
  REFRESH_IDLE_MS,
  SESSION_ABSOLUTE_MS,
} from "../utils/refreshToken.js";

import {
  signAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from "../utils/jwt.js";

function invalidSession() {
  return new HttpError(
    401,
    "INVALID_REFRESH_TOKEN",
    "Session is invalid or expired"
  );
}

function publicAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

async function authResponse(user) {
  return {
    accessToken: await signAccessToken(user.id),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicAuthUser(user),
  };
}

export async function createSession(user) {
  const now = Date.now();
  const refresh = createRefreshToken();

  const absoluteExpiresAt = new Date(
    now + SESSION_ABSOLUTE_MS
  );

  const expiresAt = new Date(
    Math.min(now + REFRESH_IDLE_MS, absoluteExpiresAt.getTime())
  );

  await prisma.authSession.create({
    data: {
      id: refresh.sessionId,
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt,
      absoluteExpiresAt,
    },
  });

  return {
    data: await authResponse(user),
    refreshToken: refresh.token,
    expiresAt,
  };
}

export async function rotateSession(token) {
  const sessionId = getSessionIdFromToken(token);

  if (!sessionId) throw invalidSession();

  const now = new Date();

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.absoluteExpiresAt <= now
  ) {
    throw invalidSession();
  }

  const nextRefresh = createRefreshToken(sessionId);

  const nextExpiresAt = new Date(
    Math.min(
      Date.now() + REFRESH_IDLE_MS,
      session.absoluteExpiresAt.getTime()
    )
  );

  // Atomic compare-and-swap.
  // Chỉ token hiện tại mới có quyền xoay phiên.
  const result = await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      tokenHash: hashRefreshToken(token),
      revokedAt: null,
      expiresAt: { gt: now },
      absoluteExpiresAt: { gt: now },
    },
    data: {
      tokenHash: nextRefresh.tokenHash,
      expiresAt: nextExpiresAt,
    },
  });

  if (result.count !== 1) {
    // Không xóa cookie ở nhánh này:
    // token khác có thể vừa thắng cuộc đua rotation.
    throw new HttpError(
      409,
      "SESSION_ROTATED",
      "Session was refreshed by another request"
    );
  }

  return {
    data: await authResponse(session.user),
    refreshToken: nextRefresh.token,
    expiresAt: nextExpiresAt,
  };
}

export async function revokeSession(token) {
  const sessionId = getSessionIdFromToken(token);

  if (!sessionId) return;

  await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      tokenHash: hashRefreshToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

// Dùng khi triển khai đổi mật khẩu hoặc bảo mật tài khoản.
export async function revokeAllUserSessions(userId) {
  return prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
