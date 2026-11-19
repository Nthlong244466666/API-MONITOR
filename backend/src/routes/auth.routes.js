
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAuthOrigin } from "../middleware/authOrigin.middleware.js";

import {
  register,
  login,
  refresh,
  me,
  logout,
} from "../controllers/auth.controller.js";

const router = Router();

const message = {
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Too many attempts. Try again later.",
  },
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

router.post(
  "/register",
  requireAuthOrigin,
  registerLimiter,
  register
);

router.post(
  "/login",
  requireAuthOrigin,
  loginLimiter,
  login
);

router.post(
  "/refresh",
  requireAuthOrigin,
  refreshLimiter,
  refresh
);

router.get("/me", requireAuth, me);

router.post(
  "/logout",
  requireAuthOrigin,
  logout
);

export default router;
