import { Request, Response } from "express";
import { saveLineGroupId, getLineGroupId } from "../database/queries/appSettings.queries.js";
import { logger } from "../utils/logger.js";

export async function handleLineWebhook(req: Request, res: Response): Promise<void> {
  res.status(200).json({ status: "ok" });
  const events = req.body?.events ?? [];
  for (const event of events) {
    if (event.type === "join" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      await saveLineGroupId(groupId);
      logger.info(`LINE Group ID saved: ${groupId}`);
    }
    if (event.type === "message" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      const existing = await getLineGroupId();
      if (!existing) {
        await saveLineGroupId(groupId);
        logger.info(`LINE Group ID saved from message: ${groupId}`);
      }
    }
  }
}
