import { Request, Response, NextFunction } from "express";
import {
  findAllProjects, findProjectById, createProject, updateProject, deleteProject,
  createMilestone, updateMilestone, createBlocker, updateBlocker, createWeeklyUpdate
} from "../database/queries/project.queries.js";
import { createNotification } from "../database/queries/notification.queries.js";

/** GET /api/projects */
export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = req.query;
    const projects = await findAllProjects(filters);
    res.json(projects);
  } catch (err) { next(err); }
}

/** GET /api/projects/:id */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) {
      res.status(404).json({ error: "ไม่พบโปรเจกต์ที่ระบุ" });
      return;
    }
    res.json(project);
  } catch (err) { next(err); }
}

/** POST /api/projects */
export async function createProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name, description, owner_id, status, type, start_date, deadline, client_name,
      color, tags, repo_url, domain_url, demo_url, design_url, notes
    } = req.body;
    if (!name) {
      res.status(400).json({ error: "กรุณาระบุชื่อโปรเจกต์" });
      return;
    }

    const projectId = await createProject({
      name, description,
      owner_id: owner_id || null,
      status: status || "planning",
      type: type || "new_dev",
      start_date: start_date || null,
      deadline: deadline || null,
      client_name: client_name || null,
      color: color || "#5A5A40",
      tags: Array.isArray(tags) ? tags : [],
      repo_url: repo_url || null,
      domain_url: domain_url || null,
      demo_url: demo_url || null,
      design_url: design_url || null,
      notes: notes || null,
    });

    if (owner_id) {
      await createNotification(
        owner_id, "โปรเจกต์ใหม่",
        `คุณได้รับมอบหมายเป็นเจ้าของโปรเจกต์: ${name}`,
        "project_assigned", projectId
      );
    }

    res.json({ id: projectId });
  } catch (err) { next(err); }
}

/** PUT /api/projects/:id */
export async function updateProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    await updateProject(projectId, updates);
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** DELETE /api/projects/:id */
export async function deleteProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteProject(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** POST /api/projects/:id/milestones */
export async function addMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.id;
    const { title, description, due_date } = req.body;
    const milestoneId = await createMilestone({ project_id: projectId, title, description, due_date });
    res.json({ id: milestoneId });
  } catch (err) { next(err); }
}

/** PATCH /api/milestones/:id */
export async function updateMilestoneStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    const { status } = req.body;
    await updateMilestone(id, { status });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** POST /api/projects/:id/blockers */
export async function addBlocker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.id;
    const { description, task_id } = req.body;
    const blockerId = await createBlocker({
      project_id: projectId,
      task_id,
      description,
      reported_by: req.user?.id,
      status: 'active'
    });
    res.json({ id: blockerId });
  } catch (err) { next(err); }
}

/** PATCH /api/blockers/:id/resolve */
export async function resolveBlocker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    await updateBlocker(id, {
      status: 'resolved',
      resolved_at: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** POST /api/projects/:id/weekly-updates */
export async function addWeeklyUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.id;
    const { week_start_date, completed_this_week, planned_next_week, current_blockers, risk_level } = req.body;
    const updateId = await createWeeklyUpdate({
      project_id: projectId,
      user_id: req.user?.id,
      week_start_date,
      completed_this_week,
      planned_next_week,
      current_blockers,
      risk_level
    });
    res.json({ id: updateId });
  } catch (err) { next(err); }
}
