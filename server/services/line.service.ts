import axios from "axios";
import axiosRetry from "axios-retry";
import { logger } from "../utils/logger.js";
import { getLineGroupId } from "../database/queries/appSettings.queries.js";

// @ts-ignore
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

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
    logger.error(`Failed to send LINE message to ${to}: ${error.response?.data || error.message}`);
    return false;
  }
}

export const lineService = {
  async sendMessage(to: string, message: string): Promise<boolean> {
    return pushMessage(to, message);
  },

  async sendToUserAndGroup(userId: string, message: string): Promise<void> {
    const targets: Promise<boolean>[] = [pushMessage(userId, message)];
    const groupId = await getLineGroupId();
    if (groupId) targets.push(pushMessage(groupId, message));
    await Promise.allSettled(targets);
  },

  async sendToGroup(message: string): Promise<boolean> {
    if (!LINE_TOKEN) return false;
    try {
      await axios.post(
        "https://api.line.me/v2/bot/message/broadcast",
        { messages: [{ type: "text", text: message }] },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` } }
      );
      logger.info("LINE broadcast sent");
      return true;
    } catch (error: any) {
      logger.error(`Failed to broadcast LINE message: ${error.response?.data || error.message}`);
      return false;
    }
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
};
