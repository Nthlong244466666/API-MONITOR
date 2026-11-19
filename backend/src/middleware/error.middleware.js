
import { HttpError } from "../utils/HttpError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    const status =
      Number.isInteger(err.status) &&
      err.status >= 400 &&
      err.status < 500
        ? err.status
        : 500;

    if (status < 500) {
      return res.status(status).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined && {
            details: err.details,
          }),
        },
      });
    }
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON request body",
      },
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large",
      },
    });
  }

  console.error("[API ERROR]", err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}

