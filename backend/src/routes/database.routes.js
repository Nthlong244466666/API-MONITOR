
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/test", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    success: true,
    data: {
      database: "PostgreSQL",
      status: "Connected",
    },
  });
});

export default router;
