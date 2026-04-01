import { Request, Response, NextFunction } from "express";
import { 
  getStats, getStaffReport, getTasksByDateRange, 
  getDepartmentWorkload, getBurnDownData 
} from "../database/queries/report.queries.js";
import { findAllTasks } from "../database/queries/task.queries.js";
import { pdfService } from "../services/pdf.service.js";

export async function getStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) { next(err); }
}

export async function getAnalyticsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [deptWorkload, burnDown] = await Promise.all([
      getDepartmentWorkload(),
      getBurnDownData(14) // Last 14 days
    ]);
    res.json({
      deptWorkload,
      burnDown
    });
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

function escapeCsv(value: unknown): string {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

export async function exportCsvReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tasks = await findAllTasks();
    const header = [
      "id",
      "title",
      "description",
      "task_type",
      "priority",
      "status",
      "due_date",
      "progress",
      "creator_name",
      "assignments",
      "created_at",
      "updated_at",
    ];

    const rows = tasks.map((task) => [
      task.id,
      task.title,
      task.description ?? "",
      task.task_type_name ?? "",
      task.priority,
      task.status,
      task.due_date ?? "",
      task.progress,
      task.creator_name,
      (task.assignments ?? []).map((assignee) => `${assignee.first_name} ${assignee.last_name}`).join(" | "),
      task.created_at,
      task.updated_at,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="task-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`\ufeff${csv}`);
  } catch (err) {
    next(err);
  }
}

export async function exportPdfReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tasks = await findAllTasks();
    const pdfBuffer = await pdfService.generateTaskReport(tasks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="task-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

export async function exportStaffPdfReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const staffReport = await getStaffReport();
    const pdfBuffer = await pdfService.generateStaffReport(staffReport);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="staff-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
