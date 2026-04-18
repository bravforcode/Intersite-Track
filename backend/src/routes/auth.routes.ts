import { Router } from "express";
import { signup, quickLogin, getProfile, updateMyProfile, changePassword } from "../controllers/auth.controller.js";
import { getLineLinkStatus, requestLineLinkCode, unlinkMyLine } from "../controllers/lineLink.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { signupRateLimiter, loginRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  SignUpSchema,
  ProfileUpdateSchema,
  PasswordChangeSchema,
} from "../../../shared/schemas/api.schemas.js";

const router = Router();

// Public: Create account — rate-limited to 3/hour per IP to prevent Firebase Auth spam
// Validates: email format, password strength (8+ chars, uppercase, lowercase, number)
router.post("/auth/signup", signupRateLimiter, validate(SignUpSchema), signup);

// Public shortcut used by the login page role buttons. It creates/signs the
// configured role account and returns a Firebase custom token.
router.post("/auth/quick-login", loginRateLimiter, quickLogin);

// Called by frontend after Firebase sign-in to get app profile (role, dept, etc.)
// Rate-limited to prevent brute-force profile enumeration
router.post("/auth/profile", loginRateLimiter, requireAuth, getProfile);

// Authenticated user operations — own profile management
// Validates: optional fields with length limits
router.put("/auth/me", requireAuth, validate(ProfileUpdateSchema), updateMyProfile);
router.get("/auth/me/line-link/status", requireAuth, getLineLinkStatus);
router.post("/auth/me/line-link/request", requireAuth, requestLineLinkCode);
router.delete("/auth/me/line-link", requireAuth, unlinkMyLine);

// Change password — requires authentication; validates current and new password strength
router.put("/users/:id/password", requireAuth, validate(PasswordChangeSchema), changePassword);

export default router;
