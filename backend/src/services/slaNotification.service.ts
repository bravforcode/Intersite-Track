import { lineService } from "./line.service.js";
import { createNotification } from "../database/queries/notification.queries.js";
import { formatThaiDate } from "../utils/dayStatus.js";
import type { Task } from "../database/queries/task.queries.js";
import { logger } from "../utils/logger.js";

export const slaNotificationService = {
  async notifyWarning(task: Task) {
    if (!task.sla_deadline_date) return;
    const dateStr = formatThaiDate(task.sla_deadline_date);

    for (const assignee of task.assignments || []) {
      try {
        await createNotification(
          assignee.id,
          "ใกล้ครบกำหนด SLA",
          `งาน "${task.title}" ใกล้เกินระยะเวลา SLA กรุณาเร่งดำเนินการเพื่อป้องกัน SLA Breach`,
          "task_deadline",
          task.id
        );

        if (assignee.line_user_id) {
          await lineService.notifySlaWarning(assignee.line_user_id, task.title, dateStr);
        }
      } catch (err: any) {
        logger.error(`Failed to notify warning for user ${assignee.id}`, { error: err.message });
      }
    }
  },

  async notifyBreach(task: Task, breachedAt: string) {
    const breachedStr = formatThaiDate(breachedAt);

    for (const assignee of task.assignments || []) {
      try {
        await createNotification(
          assignee.id,
          "SLA Breached!",
          `งาน "${task.title}" เกินระยะเวลา SLA ที่กำหนดแล้ว โปรดดำเนินการโดยด่วน`,
          "task_deadline",
          task.id
        );

        if (assignee.line_user_id) {
          await lineService.notifySlaBreach(assignee.line_user_id, task.title, breachedStr);
        }
      } catch (err: any) {
        logger.error(`Failed to notify breach for user ${assignee.id}`, { error: err.message });
      }
    }
  }
};
