import { Router } from "express";
import { handleLineWebhook } from "../controllers/lineWebhook.controller.js";

const router = Router();
router.post("/webhook", handleLineWebhook);
export default router;
