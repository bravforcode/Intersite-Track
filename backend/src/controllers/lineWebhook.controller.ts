import { Request, Response } from "express";
import { findLineLinkTokenByCode, consumeLineLinkToken } from "../database/queries/lineLink.queries.js";
import { saveLineGroupId, getLineGroupId } from "../database/queries/appSettings.queries.js";
import { findUserByLineUserId, updateUser } from "../database/queries/user.queries.js";
import { lineService } from "../services/line.service.js";
import { logger } from "../utils/logger.js";

function extractLinkCode(text: string): string | null {
  const normalized = text.trim().replace(/\s+/g, " ");
  const match = /^(?:link|เชื่อม)\s+([a-z0-9]+)$/i.exec(normalized);
  return match ? match[1].toUpperCase() : null;
}

export async function handleLineWebhook(req: Request, res: Response): Promise<void> {
  res.status(200).json({ status: "ok" });
  const events = req.body?.events ?? [];
  try {
    for (const event of events) {
      logger.info(`LINE event: type=${event.type} source=${JSON.stringify(event.source)}`);
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

      if (event.type === "message" && event.source?.type === "user" && event.message?.type === "text") {
        const text = String(event.message.text ?? "");
        const replyToken = String(event.replyToken ?? "");
        const lineUserId = String(event.source.userId ?? "");

        if (!replyToken || !lineUserId) continue;

        const code = extractLinkCode(text);
        if (!code) {
          if (/^(?:link|เชื่อม|help|ช่วยเหลือ)$/i.test(text.trim())) {
            await lineService.replyText(
              replyToken,
              "วิธีเชื่อม LINE กับระบบ:\n1. เข้าสู่ระบบ Intersite Track\n2. เปิดหน้า \"เชื่อม LINE\"\n3. สร้างรหัสเชื่อม\n4. ส่งข้อความรูปแบบ LINK <รหัส> มาที่แชตนี้"
            );
          }
          continue;
        }

        const token = await findLineLinkTokenByCode(code);
        if (!token) {
          await lineService.replyText(replyToken, "ไม่พบรหัสเชื่อมนี้ หรือรหัสหมดอายุแล้ว กรุณาสร้างรหัสใหม่จากในระบบ");
          continue;
        }

        const existingOwner = await findUserByLineUserId(lineUserId);
        if (existingOwner && existingOwner.id !== token.user_id) {
          await lineService.replyText(replyToken, "LINE บัญชีนี้ถูกผูกกับผู้ใช้อื่นแล้ว หากต้องการเปลี่ยนการผูก กรุณาติดต่อผู้ดูแลระบบ");
          continue;
        }

        await updateUser(token.user_id, { line_user_id: lineUserId });
        await consumeLineLinkToken(token.user_id, lineUserId);
        await lineService.replyText(replyToken, "เชื่อม LINE กับ Intersite Track สำเร็จแล้ว คุณจะได้รับการแจ้งเตือนผ่านบัญชีนี้");
        logger.info(`LINE user linked: appUser=${token.user_id} lineUser=${lineUserId}`);
      }
    }
  } catch (err: any) {
    logger.error(`LINE webhook processing error: ${err.message}`);
  }
}
