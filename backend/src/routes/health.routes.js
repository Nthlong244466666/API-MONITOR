import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "API Monitor Backend",
      status: "OK",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
