import { Router } from "express";
import { getProfile, changePassword } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Called by frontend after Supabase sign-in to get app profile (role, dept, etc.)
router.post("/auth/profile", requireAuth, getProfile);

// Change password via Supabase Auth admin API
router.put("/users/:id/password", requireAuth, changePassword);

export default router;
