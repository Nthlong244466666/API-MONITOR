
import { HttpError } from "../utils/HttpError.js";

const allowedOrigins = new Set(
  (process.env.APP_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (allowedOrigins.size === 0) {
  throw new Error("APP_ORIGINS must be configured");
}

export function requireAuthOrigin(req, _res, next) {
  const origin = req.get("Origin");

  // Browser request có Origin phải nằm trong whitelist.
  if (origin && !allowedOrigins.has(origin)) {
    return next(
      new HttpError(
        403,
        "ORIGIN_NOT_ALLOWED",
        "Request origin is not allowed"
      )
    );
  }

  // Chặn yêu cầu từ cross-site browser contexts.
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    return next(
      new HttpError(
        403,
        "CROSS_SITE_REQUEST",
        "Cross-site request blocked"
      )
    );
  }

  if (req.get("X-API-Monitor-Client") !== "web") {
    return next(
      new HttpError(
        403,
        "CSRF_CHECK_FAILED",
        "Required client header is missing"
      )
    );
  }

  next();
}
