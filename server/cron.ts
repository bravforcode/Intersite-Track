import cron from "node-cron";
import { findAllTasks } from "./database/queries/task.queries.js";
import { findUpcomingHolidays } from "./database/queries/holiday.queries.js";
import { findUpcomingSaturdaySchedules } from "./database/queries/saturdaySchedule.queries.js";
import { findAllUsers, findUserById } from "./database/queries/user.queries.js";
import { lineService } from "./services/line.service.js";
import { createNotification } from "./database/queries/notification.queries.js";
import { logger } from "./utils/logger.js";

// ─── Bangkok timezone helpers ─────────────────────────────────────────────────

function bangkokToday(offsetDays = 0): string {
  const d = new Date();
  // shift to UTC+7
  d.setUTCHours(d.getUTCHours() + 7);
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  return d.toISOString().substring(0, 10);
}

function bangkokDayOfWeek(): number {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 7);
  return d.getDay(); // 0=Sun, 5=Fri, 6=Sat
}

// ─── Task Deadline Check ──────────────────────────────────────────────────────

export async function checkUpcomingDeadlines() {
  logger.info("Checking for upcoming deadlines...");
  try {
    const tasks = await findAllTasks();
    const now = new Date();
    const alertDays = [1, 2];

    for (const task of tasks) {
      if (!task.due_date || task.status === "completed" || task.status === "cancelled") continue;
      const dueDate = new Date(task.due_date);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (alertDays.includes(diffDays)) {
        for (const assignee of (task.assignments || [])) {
          await createNotification(assignee.id, "ใกล้ครบกำหนดส่ง", `งาน "${task.title}" จะครบกำหนดส่งในอีก ${diffDays} วัน`, "task_deadline", task.id);
          if (assignee.line_user_id) {
            await lineService.notifyUpcomingDeadline(assignee.line_user_id, task.title, task.due_date, diffDays);
          }
        }
      }
    }
    logger.info("Deadline check completed.");
  } catch (err: any) {
    logger.error("Error in checkUpcomingDeadlines", { error: err.message });
  }
}

// ─── Holiday Notifications ───────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

async function getAllUsersWithLineId() {
  const users = await findAllUsers();
  return users.filter(u => u.line_user_id);
}

export async function checkTodayHoliday() {
  logger.info("Checking today holiday...");
  try {
    const today = bangkokToday();
    const holidays = await findUpcomingHolidays(1);
    const todayHoliday = holidays.find(h => h.date === today);
    if (!todayHoliday) return;

    const users = await getAllUsersWithLineId();
    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, todayHoliday.name, formatThaiDate(todayHoliday.date), "today");
    }
    logger.info(`Sent today holiday notification: ${todayHoliday.name}`);
  } catch (err: any) {
    logger.error("Error in checkTodayHoliday", { error: err.message });
  }
}

export async function checkTomorrowHoliday() {
  logger.info("Checking tomorrow holiday...");
  try {
    const tomorrowStr = bangkokToday(1);
    const holidays = await findUpcomingHolidays(2);
    const tomorrowHoliday = holidays.find(h => h.date === tomorrowStr);
    if (!tomorrowHoliday) return;

    const users = await getAllUsersWithLineId();
    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, tomorrowHoliday.name, formatThaiDate(tomorrowHoliday.date), "tomorrow");
    }
    logger.info(`Sent tomorrow holiday notification: ${tomorrowHoliday.name}`);
  } catch (err: any) {
    logger.error("Error in checkTomorrowHoliday", { error: err.message });
  }
}

export async function sendWeeklyHolidaySummary() {
  logger.info("Sending weekly holiday summary...");
  try {
    const weekHolidays = await findUpcomingHolidays(7);
    if (weekHolidays.length === 0) return;

    const holidayList = weekHolidays.map(h => `• ${h.name} — ${formatThaiDate(h.date)}`);
    const users = await getAllUsersWithLineId();

    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, "", "", "weekly_summary", holidayList);
    }
    logger.info(`Sent weekly holiday summary: ${weekHolidays.length} holidays`);
  } catch (err: any) {
    logger.error("Error in sendWeeklyHolidaySummary", { error: err.message });
  }
}

// ─── Saturday Duty Notifications ─────────────────────────────────────────────

export async function checkFridaySaturdayReminder() {
  logger.info("Checking Friday saturday duty reminder...");
  try {
    if (bangkokDayOfWeek() !== 5) return;

    const tomorrowStr = bangkokToday(1);
    const schedules = await findUpcomingSaturdaySchedules(2);
    const tomorrowSchedule = schedules.find(s => s.date === tomorrowStr);
    if (!tomorrowSchedule) return;

    const users = await Promise.all(tomorrowSchedule.user_ids.map(id => findUserById(id)));
    for (const user of users) {
      if (user?.line_user_id) {
        await lineService.notifySaturdayDutyPersonal(user.line_user_id, formatThaiDate(tomorrowStr));
      }
    }
    logger.info(`Sent Friday saturday duty reminders for ${tomorrowStr}`);
  } catch (err: any) {
    logger.error("Error in checkFridaySaturdayReminder", { error: err.message });
  }
}

export async function checkSaturdayDuty() {
  logger.info("Checking saturday duty...");
  try {
    if (bangkokDayOfWeek() !== 6) return;

    const todayStr = bangkokToday();
    const schedules = await findUpcomingSaturdaySchedules(1);
    const todaySchedule = schedules.find(s => s.date === todayStr);
    if (!todaySchedule) return;

    const users = await Promise.all(todaySchedule.user_ids.map(id => findUserById(id)));
    const names: string[] = [];
    for (const user of users) {
      if (user) {
        names.push(`${user.first_name} ${user.last_name}`);
        if (user.line_user_id) {
          await lineService.notifySaturdayDutyPersonal(user.line_user_id, formatThaiDate(todayStr));
        }
      }
    }

    if (names.length > 0) {
      await lineService.notifySaturdayDutyGroup(formatThaiDate(todayStr), names);
    }

    logger.info(`Sent saturday duty notifications for ${todayStr}: ${names.join(", ")}`);
  } catch (err: any) {
    logger.error("Error in checkSaturdayDuty", { error: err.message });
  }
}

// ─── Cron Schedules ──────────────────────────────────────────────────────────

// Task deadlines + วันหยุดวันนี้: ทุกวัน 08:00
cron.schedule("0 8 * * *", checkUpcomingDeadlines, { timezone: "Asia/Bangkok" });
cron.schedule("0 8 * * *", checkTodayHoliday, { timezone: "Asia/Bangkok" });

// วันหยุดพรุ่งนี้: ทุกวัน 20:00
cron.schedule("0 20 * * *", checkTomorrowHoliday, { timezone: "Asia/Bangkok" });

// สรุปวันหยุดสัปดาห์: ทุกวันจันทร์ 08:00
cron.schedule("0 8 * * 1", sendWeeklyHolidaySummary, { timezone: "Asia/Bangkok" });

// เวรเสาร์ reminder: ทุกวันศุกร์ 18:00
cron.schedule("0 18 * * 5", checkFridaySaturdayReminder, { timezone: "Asia/Bangkok" });

// เวรเสาร์วันนี้: ทุกวันเสาร์ 08:00
cron.schedule("0 8 * * 6", checkSaturdayDuty, { timezone: "Asia/Bangkok" });

logger.info("Cron jobs scheduled.");
