
import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";

import {
  index,
  show,
  store,
  update,
  destroy,
} from "../controllers/project.controller.js";

const router = Router({
  mergeParams: true,
});

router.use(requireAuth);

router.get("/", index);
router.post("/", store);

router.get("/:projectId", show);
router.patch("/:projectId", update);
router.delete("/:projectId", destroy);

export default router;
