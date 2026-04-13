import api from "./api";

const BASE = "/api/templates";

// ── Local type re-exports (avoid shared/ import issues in Vite) ───────────────
export interface DueDateRule {
  type:
    | "none"
    | "days_after_creation"
    | "business_days_after_creation"
    | "specific_weekday"
    | "placeholder";
  days?: number;
  weekday?: number;
  placeholder_key?: string;
}

export interface TemplatePlaceholderDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "user" | "textarea";
  required: boolean;
  default_value?: string;
  max_length?: number;
  options?: { label: string; value: string }[];
  hint?: string;
}

export interface TaskTemplate {
  id: string;
  key: string;
  name: string;
  internal_description?: string;
  category?: string;
  status: "draft" | "active" | "archived";
  current_version: number;
  visibility: "org" | "private_to_role";
  allowed_roles?: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  archived_at?: string;
  archived_by?: string;
}

export interface TaskTemplateDefaults {
  title_template: string;
  description_template?: string;
  task_type_id?: string | null;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  tag_ids?: string[];
  estimated_hours?: number | null;
  assignee_id?: string | null;
  due_date_rule: DueDateRule;
  checklist_items?: string[];
}

export interface TaskTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  defaults: TaskTemplateDefaults;
  placeholders: TemplatePlaceholderDefinition[];
  validation_rules: {
    require_task_type?: boolean;
    require_assignee?: boolean;
    require_due_date?: boolean;
  };
  is_published: boolean;
  created_at: string;
  created_by: string;
  change_note?: string;
}

export interface TaskTemplateUsage {
  id: string;
  template_id: string;
  template_version: number;
  task_id: string;
  applied_by: string;
  applied_at: string;
  placeholders_resolved: Record<string, unknown>;
  overrides: string[];
}

export interface CreateTemplatePayload {
  key: string;
  name: string;
  internal_description?: string;
  category?: string;
  visibility?: "org" | "private_to_role";
  allowed_roles?: string[];
}

export interface CreateVersionPayload {
  defaults: {
    title_template: string;
    description_template?: string;
    task_type_id?: string | null;
    priority?: string | null;
    tag_ids?: string[];
    estimated_hours?: number | null;
    assignee_id?: string | null;
    due_date_rule?: DueDateRule | null;
    checklist_items?: string[];
  };
  placeholders: TemplatePlaceholderDefinition[];
  validation_rules?: {
    require_task_type?: boolean;
    require_assignee?: boolean;
    require_due_date?: boolean;
  };
  change_note?: string;
}

export interface ApplyPreview {
  rendered_title: string;
  rendered_description: string;
  task_type_id: string | null;
  priority: string | null;
  tag_ids: string[];
  estimated_hours: number | null;
  assignee_id: string | null;
  due_date: string | null;
  checklist_items: string[];
  unresolved_placeholders: string[];
  warnings: string[];
}

export const templateService = {
  async getTemplates(): Promise<TaskTemplate[]> {
    return api.get<TaskTemplate[]>(BASE);
  },

  async getTemplate(id: string): Promise<TaskTemplate> {
    return api.get<TaskTemplate>(`${BASE}/${id}`);
  },

  async getVersions(id: string): Promise<TaskTemplateVersion[]> {
    return api.get<TaskTemplateVersion[]>(`${BASE}/${id}/versions`);
  },

  async createTemplate(payload: CreateTemplatePayload): Promise<{ id: string }> {
    return api.post<{ id: string }>(BASE, payload);
  },

  async updateTemplate(
    id: string,
    payload: Partial<CreateTemplatePayload>
  ): Promise<void> {
    await api.put(`${BASE}/${id}`, payload);
  },

  async createVersion(
    templateId: string,
    payload: CreateVersionPayload
  ): Promise<{ version: number }> {
    return api.post<{ version: number }>(`${BASE}/${templateId}/versions`, payload);
  },

  async publishVersion(templateId: string, version: number): Promise<void> {
    await api.post(`${BASE}/${templateId}/publish`, { version });
  },

  async archiveTemplate(id: string): Promise<void> {
    await api.post(`${BASE}/${id}/archive`, {});
  },

  async restoreTemplate(id: string): Promise<void> {
    await api.post(`${BASE}/${id}/restore`, {});
  },

  async previewApply(
    templateId: string,
    placeholderInputs: Record<string, unknown>,
    version?: number
  ): Promise<{ preview: ApplyPreview; version: number }> {
    return api.post(`${BASE}/${templateId}/preview`, {
      placeholder_inputs: placeholderInputs,
      version,
    });
  },

  async applyTemplate(
    templateId: string,
    placeholderInputs: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<{ task_id: string; created: boolean }> {
    return api.post(`${BASE}/${templateId}/apply`, {
      placeholder_inputs: placeholderInputs,
      idempotency_key:
        idempotencyKey ??
        `${templateId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  },

  async getUsage(id: string): Promise<TaskTemplateUsage[]> {
    return api.get<TaskTemplateUsage[]>(`${BASE}/${id}/usage`);
  },
};
