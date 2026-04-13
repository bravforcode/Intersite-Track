import { Request, Response, NextFunction } from "express";
import {
  findAllTemplates,
  findTemplateById,
  findVersionsByTemplateId,
  findVersionByNumber,
  findCurrentPublishedVersion,
  createTemplate,
  updateTemplateMeta,
  createVersion,
  publishVersion,
  archiveTemplate,
  restoreTemplate,
  logTemplateUsage,
  getUsageByTemplate,
} from "../database/queries/template.queries.js";
import {
  validatePlaceholderInputs,
  buildApplyPreview,
} from "../services/template.apply.service.js";
import { createTask } from "../database/queries/task.queries.js";
import { NotificationDispatcher } from "../services/notification.dispatcher.js";

// ─── List Templates ───────────────────────────────────────────────────────────

export async function listTemplates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "manager";
    const templates = await findAllTemplates(isAdmin);
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

// ─── Get Single Template ──────────────────────────────────────────────────────

export async function getTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tpl = await findTemplateById(req.params.id!);
    if (!tpl) {
      res.status(404).json({ error: "ไม่พบ Template" });
      return;
    }
    res.json(tpl);
  } catch (err) {
    next(err);
  }
}

// ─── Create Template ──────────────────────────────────────────────────────────

export async function createTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { key, name, internal_description, category, visibility, allowed_roles } =
      req.body as Record<string, unknown>;

    if (!key || !name || typeof key !== "string" || typeof name !== "string") {
      res.status(400).json({ error: "key and name are required." });
      return;
    }

    // Validate key format
    if (!/^[a-z][a-z0-9-]{1,49}$/.test(key)) {
      res.status(400).json({
        error: "key must be lowercase alphanumeric with dashes (2-50 chars).",
      });
      return;
    }

    const id = await createTemplate({
      key,
      name: String(name),
      internal_description: internal_description
        ? String(internal_description)
        : undefined,
      category: category ? String(category) : undefined,
      visibility: visibility === "private_to_role" ? "private_to_role" : "org",
      allowed_roles: Array.isArray(allowed_roles) ? allowed_roles : undefined,
      created_by: req.user!.id,
    });

    res.status(201).json({ id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      res.status(409).json({ error: msg });
      return;
    }
    next(err);
  }
}

// ─── Update Template Metadata ─────────────────────────────────────────────────

export async function updateTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tpl = await findTemplateById(req.params.id!);
    if (!tpl) {
      res.status(404).json({ error: "ไม่พบ Template" });
      return;
    }
    if (tpl.status === "archived") {
      res.status(400).json({ error: "Cannot edit an archived template." });
      return;
    }
    const { name, internal_description, category, visibility, allowed_roles } =
      req.body as Record<string, unknown>;
    await updateTemplateMeta(req.params.id!, {
      name: name ? String(name) : undefined,
      internal_description: internal_description
        ? String(internal_description)
        : undefined,
      category: category ? String(category) : undefined,
      visibility:
        visibility === "private_to_role" ? "private_to_role" : undefined,
      allowed_roles: Array.isArray(allowed_roles) ? allowed_roles : undefined,
      updated_by: req.user!.id,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Get Versions ─────────────────────────────────────────────────────────────

export async function listVersions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const versions = await findVersionsByTemplateId(req.params.id!);
    res.json(versions);
  } catch (err) {
    next(err);
  }
}

// ─── Create Version ───────────────────────────────────────────────────────────

export async function createVersionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tpl = await findTemplateById(req.params.id!);
    if (!tpl) {
      res.status(404).json({ error: "ไม่พบ Template" });
      return;
    }
    if (tpl.status === "archived") {
      res.status(400).json({ error: "Cannot add version to archived template." });
      return;
    }

    const { defaults, placeholders, validation_rules, change_note } =
      req.body as Record<string, unknown>;

    if (!defaults || typeof defaults !== "object") {
      res.status(400).json({ error: "defaults object is required." });
      return;
    }

    const versionNum = await createVersion({
      template_id: req.params.id!,
      defaults: defaults as any,
      placeholders: Array.isArray(placeholders) ? (placeholders as any) : [],
      validation_rules: (validation_rules as any) ?? {},
      created_by: req.user!.id,
      change_note: change_note ? String(change_note) : undefined,
    });

    res.status(201).json({ version: versionNum });
  } catch (err) {
    next(err);
  }
}

// ─── Publish Version ──────────────────────────────────────────────────────────

export async function publishVersionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { version } = req.body as { version: number };
    if (!version || typeof version !== "number") {
      res.status(400).json({ error: "version number is required." });
      return;
    }
    await publishVersion(req.params.id!, version, req.user!.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Version not found") {
      res.status(404).json({ error: msg });
      return;
    }
    next(err);
  }
}

// ─── Archive / Restore ────────────────────────────────────────────────────────

export async function archiveTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tpl = await findTemplateById(req.params.id!);
    if (!tpl) {
      res.status(404).json({ error: "ไม่พบ Template" });
      return;
    }
    await archiveTemplate(req.params.id!, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function restoreTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tpl = await findTemplateById(req.params.id!);
    if (!tpl) {
      res.status(404).json({ error: "ไม่พบ Template" });
      return;
    }
    await restoreTemplate(req.params.id!, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Preview Apply ────────────────────────────────────────────────────────────

export async function previewApply(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { version: versionNum, placeholder_inputs } = req.body as {
      version?: number;
      placeholder_inputs?: Record<string, unknown>;
    };

    const tpl = await findTemplateById(req.params.id!);
    if (!tpl || tpl.status !== "active") {
      res.status(404).json({ error: "Template not found or not active." });
      return;
    }

    const version = versionNum
      ? await findVersionByNumber(req.params.id!, versionNum)
      : await findCurrentPublishedVersion(req.params.id!);

    if (!version) {
      res.status(404).json({ error: "Published version not found." });
      return;
    }

    const inputs = placeholder_inputs ?? {};
    const validation = validatePlaceholderInputs(version.placeholders, inputs);
    if (!validation.valid) {
      res.status(422).json({ errors: validation.errors });
      return;
    }

    const preview = buildApplyPreview(version, inputs);
    res.json({ preview, template_id: tpl.id, version: version.version });
  } catch (err) {
    next(err);
  }
}

// ─── Apply Template (Create Task) ─────────────────────────────────────────────

export async function applyTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { placeholder_inputs, version: versionNum, idempotency_key } =
      req.body as {
        placeholder_inputs?: Record<string, unknown>;
        version?: number;
        idempotency_key?: string;
      };

    // Idempotency check
    if (idempotency_key) {
      const existing = await checkIdempotency(idempotency_key);
      if (existing) {
        res.status(200).json({ task_id: existing, created: false });
        return;
      }
    }

    const tpl = await findTemplateById(req.params.id!);
    if (!tpl || tpl.status !== "active") {
      res.status(404).json({ error: "Template not found or not active." });
      return;
    }

    const version = versionNum
      ? await findVersionByNumber(req.params.id!, versionNum)
      : await findCurrentPublishedVersion(req.params.id!);

    if (!version || !version.is_published) {
      res.status(404).json({ error: "Published version not found." });
      return;
    }

    const inputs = placeholder_inputs ?? {};
    const validation = validatePlaceholderInputs(version.placeholders, inputs);
    if (!validation.valid) {
      res.status(422).json({ errors: validation.errors });
      return;
    }

    const preview = buildApplyPreview(version, inputs);

    const taskId = await createTask({
      title: preview.rendered_title,
      description: preview.rendered_description,
      task_type_id: preview.task_type_id ?? null,
      priority: (preview.priority as any) ?? "medium",
      due_date: preview.due_date ?? null,
      project_id: null,
      created_by: req.user!.id,
      creator_name: `${req.user!.first_name} ${req.user!.last_name}`,
      tags: preview.tag_ids,
      // source_metadata will be stored in usage log
    });

    // Log usage
    await logTemplateUsage({
      template_id: tpl.id,
      template_version: version.version,
      task_id: taskId,
      applied_by: req.user!.id,
      applied_at: new Date().toISOString(),
      placeholders_resolved: inputs,
      overrides: [],
    });

    // Store idempotency key → task_id
    if (idempotency_key) {
      await storeIdempotency(idempotency_key, taskId);
    }

    // Notify creator via SSE
    await NotificationDispatcher.dispatch(
      NotificationDispatcher.templateApplied({
        creatorId: req.user!.id,
        taskId: taskId,
        taskTitle: preview.rendered_title,
        templateName: tpl.name,
      })
    );

    res.status(201).json({ task_id: taskId, created: true });
  } catch (err) {
    next(err);
  }
}

// ─── Usage Analytics ─────────────────────────────────────────────────────────

export async function getTemplateUsage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const usage = await getUsageByTemplate(req.params.id!);
    res.json(usage);
  } catch (err) {
    next(err);
  }
}

// ─── Idempotency helpers (simple in-memory TTL store) ────────────────────────

const idempotencyStore = new Map<string, { taskId: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idempotencyStore.entries()) {
    if (v.expiresAt < now) idempotencyStore.delete(k);
  }
}, 60_000).unref();

async function checkIdempotency(key: string): Promise<string | null> {
  const entry = idempotencyStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.taskId;
}

async function storeIdempotency(key: string, taskId: string): Promise<void> {
  idempotencyStore.set(key, { taskId, expiresAt: Date.now() + 30 * 60_000 });
}
