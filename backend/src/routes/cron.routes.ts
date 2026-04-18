import { Router, Request, Response, NextFunction } from "express";
import {
  checkFridaySaturdayReminder,
  checkSaturdayDuty,
  checkTodayHoliday,
  checkTomorrowHoliday,
  checkUpcomingDeadlines,
  sendWeeklyHolidaySummary,
} from "../cron.js";
import { runSlaScan } from "../services/slaCron.service.js";
import { isProductionRuntime } from "../config/runtime.js";
import { probeDatabaseHealth } from "../database/health.js";

const router = Router();

type CronJob = () => Promise<void>;

const jobs: Record<string, CronJob> = {
  "daily-morning": async () => {
    await checkUpcomingDeadlines();
    await checkTodayHoliday();
    await runSlaScan();

    const bangkokDay = new Date(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    ).getDay();

    if (bangkokDay === 1) {
      await sendWeeklyHolidaySummary();
    }

    if (bangkokDay === 6) {
      await checkSaturdayDuty();
    }
  },
  "daily-evening": async () => {
    await checkTomorrowHoliday();
    await runSlaScan();

    const bangkokDay = new Date(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    ).getDay();

    if (bangkokDay === 5) {
      await checkFridaySaturdayReminder();
    }
  },
  morning: async () => {
    await checkUpcomingDeadlines();
    await checkTodayHoliday();
  },
  tomorrow: checkTomorrowHoliday,
  "weekly-holiday-summary": sendWeeklyHolidaySummary,
  "friday-saturday-reminder": checkFridaySaturdayReminder,
  "saturday-duty": checkSaturdayDuty,
  "sla-scan": runSlaScan,
};

function requireCronAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (isProductionRuntime() && !secret) {
    res.status(500).json({ error: "CRON_SECRET is not configured" });
    return;
  }

  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized cron request" });
    return;
  }

  next();
}

router.get("/:job", requireCronAuth, async (req, res, next) => {
  try {
    const firestore = await probeDatabaseHealth();
    if (firestore.status !== "ok") {
      res.status(503).json({ error: "Firestore unavailable for cron execution", dependencies: { firestore } });
      return;
    }

    const jobName = req.params.job;
    const job = jobs[jobName];
    if (!job) {
      res.status(404).json({ error: "Unknown cron job" });
      return;
    }

    await job();
    res.json({ ok: true, job: jobName });
  } catch (err) {
    next(err);
  }
});

export default router;
