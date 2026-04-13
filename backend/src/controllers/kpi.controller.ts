// backend/src/controllers/kpi.controller.ts

import { Request, Response, NextFunction } from "express";
import * as kpiQueries from "../database/queries/kpi.queries.js";

/** GET /api/kpis */
export async function listKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { owner_id, type, status } = req.query as Record<string, string | undefined>;
    const kpis = await kpiQueries.listKPIs({ owner_id, type, status });
    res.json(kpis);
  } catch (err) { next(err); }
}

/** GET /api/kpis/stats */
export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await kpiQueries.getKPIStats();
    res.json(stats);
  } catch (err) { next(err); }
}

/** GET /api/kpis/:id */
export async function getKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kpi = await kpiQueries.getKPIById(req.params.id);
    if (!kpi) { res.status(404).json({ error: "KPI not found" }); return; }
    res.json(kpi);
  } catch (err) { next(err); }
}

/** POST /api/kpis */
export async function createKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, owner_id, owner_name, type, target_value, start_date, due_date } = req.body;
    if (!title || !owner_id || !owner_name || !type || target_value === undefined || !start_date || !due_date) {
      res.status(400).json({ error: "title, owner_id, owner_name, type, target_value, start_date, due_date are required" });
      return;
    }
    if (Number(target_value) <= 0) {
      res.status(400).json({ error: "target_value must be greater than 0" });
      return;
    }

    const kpi = await kpiQueries.createKPI(req.body, String(req.user?.id ?? "system"));
    res.status(201).json(kpi);
  } catch (err) { next(err); }
}

/** PUT /api/kpis/:id */
export async function updateKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await kpiQueries.getKPIById(req.params.id);
    if (!existing) { res.status(404).json({ error: "KPI not found" }); return; }

    // Only owner or admin can update
    const userId = String(req.user?.id);
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && existing.owner_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await kpiQueries.updateKPI(req.params.id, req.body);
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /api/kpis/:id */
export async function deleteKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await kpiQueries.getKPIById(req.params.id);
    if (!existing) { res.status(404).json({ error: "KPI not found" }); return; }

    // Only owner or admin can delete
    const userId = String(req.user?.id);
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && existing.owner_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await kpiQueries.deleteKPI(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}
