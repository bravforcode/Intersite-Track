/**
 * Task Template Types — local copy for backend use.
 * Source of truth: shared/types/taskTemplate.ts
 * Duplicated here to keep backend within its own rootDir.
 */

export type TemplatePlaceholderType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "user";

export interface TemplatePlaceholderOption {
  label: string;
  value: string;
}

export interface TemplatePlaceholderDefinition {
  key: string;
  label: string;
  type: TemplatePlaceholderType;
  required: boolean;
  default_value?: string;
  max_length?: number;
  options?: TemplatePlaceholderOption[];
  hint?: string;
}

export type DueDateRuleType =
  | "none"
  | "days_after_creation"
  | "business_days_after_creation"
  | "specific_weekday"
  | "placeholder";

export type DueDateRule =
  | { type: "none" }
  | { type: "days_after_creation"; days: number }
  | { type: "business_days_after_creation"; days: number }
  | { type: "specific_weekday"; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | { type: "placeholder"; placeholder_key: string };

export interface TaskTemplateDefaults {
  title_template: string;
  description_template?: string;
  task_type_id?: string | null;
  priority?: string | null;
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

export type TemplateStatus = "draft" | "active" | "archived";
export type TemplateVisibility = "org" | "private_to_role";

export interface TaskTemplate {
  id: string;
  key: string;
  name: string;
  internal_description?: string;
  category?: string;
  status: TemplateStatus;
  current_version: number;
  visibility: TemplateVisibility;
  allowed_roles?: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  archived_at?: string;
  archived_by?: string;
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
