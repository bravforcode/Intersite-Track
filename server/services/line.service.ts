import axios from "axios";
import axiosRetry from "axios-retry";
import { logger } from "../utils/logger.js";

// @ts-ignore
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

/**
 * Service for sending notifications to LINE Messaging API
 */
export const lineService = {
  /**
   * Send a push message to a specific user or group
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!LINE_TOKEN || !to) {
      logger.warn("LINE_CHANNEL_ACCESS_TOKEN or target ID is missing. Skipping notification.");
      return false;
    }

    try {
      await axios.post(
        LINE_MESSAGING_API,
        {
          to,
          messages: [{ type: "text", text: message }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_TOKEN}`,
          },
        }
      );
      logger.info(`LINE message sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send LINE message to ${to}: ${error.response?.data || error.message}`);
      return false;
    }
  },

  /**
   * Notify admins about important events
   */
  async notifyAdmin(message: string): Promise<boolean> {
    if (!LINE_ADMIN_USER_ID) return false;
    return this.sendMessage(LINE_ADMIN_USER_ID, message);
  },

  /**
   * Template for new task notification
   */
  async notifyNewTask(to: string, taskTitle: string, projectName?: string): Promise<boolean> {
    const projectInfo = projectName ? `ในโปรเจกต์: ${projectName}` : "";
    const msg = `🔔 มีงานใหม่มอบหมายถึงคุณ!\n\nชื่องาน: ${taskTitle}\n${projectInfo}\n\nกรุณาเข้าตรวจสอบในระบบ Intersite Track`;
    return this.sendMessage(to, msg);
  },

  /**
   * Template for blocker notification
   */
  async notifyBlocker(to: string, taskTitle: string, description: string): Promise<boolean> {
    const msg = `⚠️ แจ้งเตือนงานติดปัญหา (Blocker)!\n\nงาน: ${taskTitle}\nปัญหา: ${description}\n\nกรุณาเร่งดำเนินการแก้ไขหรือตรวจสอบ`;
    return this.sendMessage(to, msg);
  },

  /**
   * Notify about upcoming deadline
   */
  async notifyUpcomingDeadline(to: string, taskTitle: string, dueDate: string, daysLeft: number): Promise<boolean> {
    const msg = `⏰ แจ้งเตือนกำหนดส่งงาน!\n\nงาน: ${taskTitle}\nกำหนดส่ง: ${dueDate}\n(เหลือเวลาอีก ${daysLeft} วัน)\n\nกรุณาเร่งดำเนินการให้เสร็จสิ้นตามกำหนด`;
    return this.sendMessage(to, msg);
  }
};
