import { Router } from "express";
import { signup, getProfile, changePassword } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public: Create account via Supabase Auth + app profile
router.post("/auth/signup", signup);

// Called by frontend after Supabase sign-in to get app profile (role, dept, etc.)
router.post("/auth/profile", requireAuth, getProfile);

// Change password via Supabase Auth admin API
router.put("/users/:id/password", requireAuth, changePassword);

export default router;
