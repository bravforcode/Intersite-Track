import { Router } from "express";
import { handleLineWebhook } from "../controllers/lineWebhook.controller.js";
import { verifyLineSignature } from "../middleware/line.middleware.js";

const router = Router();
router.post("/webhook", verifyLineSignature, handleLineWebhook);
export default router;
