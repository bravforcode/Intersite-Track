export type TemplateStatus = 'draft' | 'active' | 'archived';

export interface TaskTemplate {
  id: string;
  key: string;
  name: string;
  internal_description?: string;
  category?: string;
  status: TemplateStatus;
  current_version: number;
  visibility: 'org' | 'private_to_role';
  allowed_roles?: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  archived_at?: string;
  archived_by?: string;
}

export type PlaceholderType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'user' | 'task_type';

export interface TemplatePlaceholderDefinition {
  key: string;
  label: string;
  type: PlaceholderType;
  required: boolean;
  default_value?: string | number | null;
  help_text?: string;
  max_length?: number;
  options?: Array<{label: string; value: string}>;
}

export type DueDateRule =
  | { type: 'none' }
  | { type: 'days_after_creation'; days: number }
  | { type: 'business_days_after_creation'; days: number }
  | { type: 'specific_weekday'; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | { type: 'placeholder'; placeholder_key: string };

export interface TaskTemplateVersion {
  id: string;
  template_id: string;
  version: number;

  defaults: {
    title_template: string;
    description_template?: string;
    task_type_id?: string | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
    tag_ids?: string[];
    estimated_hours?: number | null;
    assignee_id?: string | null;
    due_date_rule?: DueDateRule | null;
    checklist_items?: string[];
  };

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

export interface TaskSourceMetadata {
  source_type: 'template' | 'manual';
  template_id?: string;
  template_version?: number;
  template_key?: string;
  applied_by?: string;
  applied_at?: string;
}
