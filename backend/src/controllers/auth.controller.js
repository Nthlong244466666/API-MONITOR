
import {
  registerUser,
  loginUser,
  getUserById,
} from "../services/auth.service.js";

import {
  rotateSession,
  revokeSession,
} from "../services/session.service.js";

import {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
} from "../utils/refreshToken.js";

import {
  registerSchema,
  loginSchema,
  validateBody,
} from "../validators/auth.validator.js";

export async function register(req, res) {
  const data = validateBody(registerSchema, req.body ?? {});
  const user = await registerUser(data);

  return res.status(201).json({
    success: true,
    data: user,
  });
}

export async function login(req, res) {
  const data = validateBody(loginSchema, req.body ?? {});
  const result = await loginUser(data);

  setRefreshCookie(
    res,
    result.refreshToken,
    result.expiresAt
  );

  return res.status(200).json({
    success: true,
    data: result.data,
  });
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!token) {
    throw new ErrorlessAuthError();
  }

  const result = await rotateSession(token);

  setRefreshCookie(
    res,
    result.refreshToken,
    result.expiresAt
  );

  return res.status(200).json({
    success: true,
    data: result.data,
  });
}

// Lỗi có cấu trúc, không tiết lộ chi tiết phiên.
import { HttpError } from "../utils/HttpError.js";

class ErrorlessAuthError extends HttpError {
  constructor() {
    super(
      401,
      "INVALID_REFRESH_TOKEN",
      "Session is invalid or expired"
    );
  }
}

export async function me(req, res) {
  const user = await getUserById(req.user.id);

  return res.status(200).json({
    success: true,
    data: user,
  });
}

export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (token) {
    await revokeSession(token);
  }

  clearRefreshCookie(res);

  return res.status(204).send();
}
