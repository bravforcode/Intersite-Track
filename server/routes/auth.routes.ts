import { Router } from "express";
import { signup, getProfile, updateMyProfile, changePassword } from "../controllers/auth.controller.js";
import { getLineLinkStatus, requestLineLinkCode, unlinkMyLine } from "../controllers/lineLink.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public: Create account via Supabase Auth + app profile
router.post("/auth/signup", signup);

// Called by frontend after Supabase sign-in to get app profile (role, dept, etc.)
router.post("/auth/profile", requireAuth, getProfile);

// Allow users to update their own profile without elevated permissions
router.put("/auth/me", requireAuth, updateMyProfile);
router.get("/auth/me/line-link/status", requireAuth, getLineLinkStatus);
router.post("/auth/me/line-link/request", requireAuth, requestLineLinkCode);
router.delete("/auth/me/line-link", requireAuth, unlinkMyLine);

// Change password via Supabase Auth admin API
router.put("/users/:id/password", requireAuth, changePassword);

export default router;
