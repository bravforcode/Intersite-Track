// backend/src/routes/kpi.routes.ts

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listKPIs,
  getStats,
  getKPI,
  createKPI,
  updateKPI,
  deleteKPI,
} from "../controllers/kpi.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listKPIs);
router.get("/stats", getStats);
router.get("/:id", getKPI);
router.post("/", createKPI);
router.put("/:id", updateKPI);
router.delete("/:id", deleteKPI);

export default router;
