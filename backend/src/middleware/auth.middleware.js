
import { HttpError } from "../utils/HttpError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization ?? "";

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);

  if (!match) {
    return next(
      new HttpError(
        401,
        "UNAUTHORIZED",
        "Bearer token required"
      )
    );
  }

  try {
    const payload = await verifyAccessToken(match[1]);

    if (!payload.sub) {
      throw new Error("Missing token subject");
    }

    req.user = {
      id: payload.sub,
    };

    return next();
  } catch {
    return next(
      new HttpError(
        401,
        "INVALID_TOKEN",
        "Invalid or expired token"
      )
    );
  }
}
