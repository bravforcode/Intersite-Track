import { db } from "../../config/firebase-admin.js";
import type {
  TaskTemplate,
  TaskTemplateVersion,
  TaskTemplateUsage,
  DueDateRule,
  TemplatePlaceholderDefinition,
} from "../../types/taskTemplate.js";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapTemplate(id: string, data: FirebaseFirestore.DocumentData): TaskTemplate {
  return {
    id,
    key: data.key ?? "",
    name: data.name ?? "",
    internal_description: data.internal_description,
    category: data.category,
    status: data.status ?? "draft",
    current_version: data.current_version ?? 0,
    visibility: data.visibility ?? "org",
    allowed_roles: data.allowed_roles,
    created_at: data.created_at ?? new Date().toISOString(),
    created_by: data.created_by ?? "",
    updated_at: data.updated_at ?? new Date().toISOString(),
    updated_by: data.updated_by ?? "",
    archived_at: data.archived_at,
    archived_by: data.archived_by,
  };
}

function mapVersion(id: string, data: FirebaseFirestore.DocumentData): TaskTemplateVersion {
  return {
    id,
    template_id: data.template_id ?? "",
    version: data.version ?? 1,
    defaults: {
      title_template: data.defaults?.title_template ?? "",
      description_template: data.defaults?.description_template,
      task_type_id: data.defaults?.task_type_id ?? null,
      priority: data.defaults?.priority ?? null,
      tag_ids: data.defaults?.tag_ids ?? [],
      estimated_hours: data.defaults?.estimated_hours ?? null,
      assignee_id: data.defaults?.assignee_id ?? null,
      due_date_rule: (data.defaults?.due_date_rule ?? { type: "none" }) as DueDateRule,
      checklist_items: data.defaults?.checklist_items ?? [],
    },
    placeholders: (data.placeholders ?? []) as TemplatePlaceholderDefinition[],
    validation_rules: data.validation_rules ?? {},
    is_published: data.is_published ?? false,
    created_at: data.created_at ?? new Date().toISOString(),
    created_by: data.created_by ?? "",
    change_note: data.change_note,
  };
}

// ─── Template CRUD ────────────────────────────────────────────────────────────

export async function findAllTemplates(
  includeAll = false
): Promise<TaskTemplate[]> {
  let query: FirebaseFirestore.Query = db.collection("task_templates");
  if (!includeAll) {
    query = query.where("status", "==", "active");
  }
  const snap = await query.orderBy("created_at", "desc").get();
  return snap.docs.map((doc) => mapTemplate(doc.id, doc.data()));
}

export async function findTemplateById(id: string): Promise<TaskTemplate | null> {
  const doc = await db.collection("task_templates").doc(id).get();
  if (!doc.exists) return null;
  return mapTemplate(doc.id, doc.data()!);
}

export async function findTemplateByKey(key: string): Promise<TaskTemplate | null> {
  const snap = await db
    .collection("task_templates")
    .where("key", "==", key)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapTemplate(doc.id, doc.data());
}

export interface CreateTemplateDTO {
  key: string;
  name: string;
  internal_description?: string;
  category?: string;
  visibility?: "org" | "private_to_role";
  allowed_roles?: string[];
  created_by: string;
}

export async function createTemplate(dto: CreateTemplateDTO): Promise<string> {
  // Guard: key must be unique
  const existing = await findTemplateByKey(dto.key);
  if (existing) throw new Error(`Template key "${dto.key}" already exists.`);

  const ref = db.collection("task_templates").doc();
  const now = new Date().toISOString();
  await ref.set({
    key: dto.key,
    name: dto.name,
    internal_description: dto.internal_description ?? null,
    category: dto.category ?? null,
    status: "draft",
    current_version: 0,
    visibility: dto.visibility ?? "org",
    allowed_roles: dto.allowed_roles ?? null,
    created_at: now,
    created_by: dto.created_by,
    updated_at: now,
    updated_by: dto.created_by,
  });
  return ref.id;
}

export interface UpdateTemplateMetaDTO {
  name?: string;
  internal_description?: string;
  category?: string;
  visibility?: "org" | "private_to_role";
  allowed_roles?: string[];
  updated_by: string;
}

export async function updateTemplateMeta(
  id: string,
  dto: UpdateTemplateMetaDTO
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: dto.updated_by,
  };
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.internal_description !== undefined)
    payload.internal_description = dto.internal_description;
  if (dto.category !== undefined) payload.category = dto.category;
  if (dto.visibility !== undefined) payload.visibility = dto.visibility;
  if (dto.allowed_roles !== undefined)
    payload.allowed_roles = dto.allowed_roles;
  await db.collection("task_templates").doc(id).update(payload);
}

export async function archiveTemplate(
  id: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.collection("task_templates").doc(id).update({
    status: "archived",
    archived_at: now,
    archived_by: userId,
    updated_at: now,
    updated_by: userId,
  });
}

export async function restoreTemplate(
  id: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.collection("task_templates").doc(id).update({
    status: "active",
    archived_at: null,
    archived_by: null,
    updated_at: now,
    updated_by: userId,
  });
}

// ─── Version CRUD ─────────────────────────────────────────────────────────────

export async function findVersionsByTemplateId(
  templateId: string
): Promise<TaskTemplateVersion[]> {
  const snap = await db
    .collection("task_template_versions")
    .where("template_id", "==", templateId)
    .orderBy("version", "desc")
    .get();
  return snap.docs.map((doc) => mapVersion(doc.id, doc.data()));
}

export async function findVersionByNumber(
  templateId: string,
  version: number
): Promise<TaskTemplateVersion | null> {
  const snap = await db
    .collection("task_template_versions")
    .where("template_id", "==", templateId)
    .where("version", "==", version)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapVersion(doc.id, doc.data());
}

export async function findCurrentPublishedVersion(
  templateId: string
): Promise<TaskTemplateVersion | null> {
  const snap = await db
    .collection("task_template_versions")
    .where("template_id", "==", templateId)
    .where("is_published", "==", true)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapVersion(doc.id, doc.data());
}

export interface CreateVersionDTO {
  template_id: string;
  defaults: TaskTemplateVersion["defaults"];
  placeholders: TemplatePlaceholderDefinition[];
  validation_rules: TaskTemplateVersion["validation_rules"];
  created_by: string;
  change_note?: string;
}

export async function createVersion(dto: CreateVersionDTO): Promise<number> {
  // Compute next version number
  const versions = await findVersionsByTemplateId(dto.template_id);
  const nextVersion = (versions[0]?.version ?? 0) + 1;

  const ref = db.collection("task_template_versions").doc();
  const now = new Date().toISOString();
  await ref.set({
    template_id: dto.template_id,
    version: nextVersion,
    defaults: dto.defaults,
    placeholders: dto.placeholders,
    validation_rules: dto.validation_rules,
    is_published: false,
    created_at: now,
    created_by: dto.created_by,
    change_note: dto.change_note ?? null,
  });
  return nextVersion;
}

export async function publishVersion(
  templateId: string,
  version: number,
  userId: string
): Promise<void> {
  const snap = await db
    .collection("task_template_versions")
    .where("template_id", "==", templateId)
    .where("version", "==", version)
    .limit(1)
    .get();
  if (snap.empty) throw new Error("Version not found");

  const doc = snap.docs[0]!;
  const now = new Date().toISOString();

  // Publish this version and activate template
  await db.runTransaction(async (tx) => {
    tx.update(doc.ref, { is_published: true, updated_at: now });
    tx.update(db.collection("task_templates").doc(templateId), {
      status: "active",
      current_version: version,
      updated_at: now,
      updated_by: userId,
    });
  });
}

// ─── Usage Log ────────────────────────────────────────────────────────────────

export async function logTemplateUsage(
  usage: Omit<TaskTemplateUsage, "id">
): Promise<void> {
  const ref = db.collection("task_template_usage").doc();
  await ref.set({ ...usage });
}

export async function getUsageByTemplate(
  templateId: string,
  limit = 50
): Promise<TaskTemplateUsage[]> {
  const snap = await db
    .collection("task_template_usage")
    .where("template_id", "==", templateId)
    .orderBy("applied_at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<TaskTemplateUsage, "id">),
  }));
}
