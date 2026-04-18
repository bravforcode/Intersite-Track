import axios from "axios";
import axiosRetry from "axios-retry";
import { logger } from "../utils/logger.js";
import { getLineGroupId } from "../database/queries/appSettings.queries.js";
import { buildDailyStatusMessage } from "../utils/dayStatus.js";
import type { DailyStatusReference, OperationalDayStatus } from "../utils/dayStatus.js";

// @ts-ignore
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_BOT_TOKEN;
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

function formatLineErrorPayload(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (payload == null) return "";
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

async function pushMessage(to: string, message: string): Promise<boolean> {
  if (!LINE_TOKEN || !to) return false;
  try {
    await axios.post(
      LINE_MESSAGING_API,
      { to, messages: [{ type: "text", text: message }] },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` } }
    );
    logger.info(`LINE message sent to ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to send LINE message to ${to}: ${formatLineErrorPayload(error.response?.data) || error.message}`);
    return false;
  }
}

async function replyMessage(replyToken: string, message: string): Promise<boolean> {
  if (!LINE_TOKEN || !replyToken) return false;
  try {
    await axios.post(
      LINE_REPLY_API,
      { replyToken, messages: [{ type: "text", text: message }] },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` } }
    );
    logger.info("LINE reply sent");
    return true;
  } catch (error: any) {
    logger.error(`Failed to reply LINE message: ${formatLineErrorPayload(error.response?.data) || error.message}`);
    return false;
  }
}

export const lineService = {
  async sendMessage(to: string, message: string): Promise<boolean> {
    return pushMessage(to, message);
  },

  async replyText(replyToken: string, message: string): Promise<boolean> {
    return replyMessage(replyToken, message);
  },

  async sendToUserAndGroup(userId: string, message: string): Promise<void> {
    const targets: Promise<boolean>[] = [pushMessage(userId, message)];
    const groupId = await getLineGroupId();
    if (groupId) targets.push(pushMessage(groupId, message));
    await Promise.allSettled(targets);
  },

  async sendToGroup(message: string): Promise<boolean> {
    const groupId = await getLineGroupId();
    if (!groupId) return false;
    return pushMessage(groupId, message);
  },

  async notifyAdmin(message: string): Promise<boolean> {
    if (!LINE_ADMIN_USER_ID) return false;
    return pushMessage(LINE_ADMIN_USER_ID, message);
  },

  async notifyNewTask(to: string, taskTitle: string, projectName?: string): Promise<boolean> {
    const projectInfo = projectName ? `ในโปรเจกต์: ${projectName}` : "";
    const msg = `🔔 มีงานใหม่มอบหมายถึงคุณ!\n\nชื่องาน: ${taskTitle}\n${projectInfo}\n\nกรุณาเข้าตรวจสอบในระบบ Intersite Track`;
    return pushMessage(to, msg);
  },

  async notifyBlocker(to: string, taskTitle: string, description: string): Promise<boolean> {
    const msg = `⚠️ แจ้งเตือนงานติดปัญหา (Blocker)!\n\nงาน: ${taskTitle}\nปัญหา: ${description}\n\nกรุณาเร่งดำเนินการแก้ไขหรือตรวจสอบ`;
    return pushMessage(to, msg);
  },

  async notifyUpcomingDeadline(to: string, taskTitle: string, dueDate: string, daysLeft: number): Promise<boolean> {
    const msg = `⏰ แจ้งเตือนกำหนดส่งงาน!\n\nงาน: ${taskTitle}\nกำหนดส่ง: ${dueDate}\n(เหลือเวลาอีก ${daysLeft} วัน)\n\nกรุณาเร่งดำเนินการให้เสร็จสิ้นตามกำหนด`;
    return pushMessage(to, msg);
  },

  async notifyDailyStatus(to: string, reference: DailyStatusReference, status: OperationalDayStatus): Promise<boolean> {
    return pushMessage(to, buildDailyStatusMessage(reference, status));
  },

  async notifyHolidayPersonal(to: string, holidayName: string, date: string, type: "tomorrow" | "today" | "weekly_summary", holidayList?: string[]): Promise<boolean> {
    let msg = "";
    if (type === "tomorrow") {
      msg = `🎉 พรุ่งนี้วันหยุด!\n\n${holidayName}\nวันที่: ${date}\n\nขอให้พักผ่อนอย่างมีความสุขนะครับ 😊`;
    } else if (type === "today") {
      msg = `🌟 วันนี้วันหยุด!\n\n${holidayName}\n\nขอให้มีความสุขกับวันหยุดนะครับ 🎊`;
    } else if (type === "weekly_summary") {
      msg = `📅 สรุปวันหยุดสัปดาห์นี้:\n\n${holidayList?.join("\n") ?? "ไม่มีวันหยุด"}\n\nทำงานดีๆ นะครับ 💪`;
    }
    if (!msg) {
      logger.warn(`notifyHolidayPersonal: unhandled type "${type}"`);
      return false;
    }
    return pushMessage(to, msg);
  },

  async notifySaturdayDutyPersonal(to: string, date: string): Promise<boolean> {
    const msg = `📋 เวรทำงานวันเสาร์!\n\nคุณมีเวรทำงานวันเสาร์ที่ ${date}\nกรุณามาทำงานตามเวลาที่กำหนด ✅`;
    return pushMessage(to, msg);
  },

  async notifySaturdayDutyGroup(date: string, names: string[]): Promise<boolean> {
    const nameList = names.join(", ");
    const msg = `📢 เวรทำงานวันเสาร์ที่ ${date}\n\nผู้มีเวร: ${nameList}\n\nขอให้ทำงานอย่างมีความสุขครับ 💪`;
    return this.sendToGroup(msg);
  },

  async notifySlaWarning(to: string, taskTitle: string, dueDate: string): Promise<boolean> {
    const msg = `⚠️ [SLA Warning] ใกล้ครบกำหนด SLA\n\nงาน: ${taskTitle}\nกำหนด: ${dueDate}\n\nกรุณาเร่งดำเนินการเพื่อไม่ให้เกิน SLA ครับ`;
    return pushMessage(to, msg);
  },

  async notifySlaBreach(to: string, taskTitle: string, breachedAt: string): Promise<boolean> {
    const msg = `🚨 [SLA BREACHED] งานเกินกำหนด SLA!\n\nงาน: ${taskTitle}\nเกินกำหนดเมื่อ: ${breachedAt}\n\nโปรดตรวจสอบหรือรายงานสาเหตุล่าช้าโดยด่วน`;
    return pushMessage(to, msg);
  },
};
