import { Request, Response, NextFunction } from "express";
import { getStats, getStaffReport, getTasksByDateRange } from "../database/queries/report.queries.js";

export async function getStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) { next(err); }
}

export async function getStaffReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await getStaffReport();
    res.json(report);
  } catch (err) { next(err); }
}

export async function getDateRangeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const start = (req.query.start as string) || "2000-01-01";
    const end = (req.query.end as string) || "2099-12-31";
    const data = await getTasksByDateRange(start, end);
    res.json(data);
  } catch (err) { next(err); }
}
