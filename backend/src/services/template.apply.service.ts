/**
 * Template Apply Service (Phase 2F)
 *
 * Handles placeholder resolution, due date rule computation,
 * and building the final task payload from a template version.
 */
import { addDays, addBusinessDays, nextDay, type Day } from "date-fns";
import type {
  TaskTemplateVersion,
  DueDateRule,
  TemplatePlaceholderDefinition,
  TemplatePlaceholderOption,
} from "../types/taskTemplate.js";

// ─── Placeholder Engine ───────────────────────────────────────────────────────

const PLACEHOLDER_PATTERN = /\{\{([a-z][a-z0-9_]{1,49})\}\}/g;

/** Extract all placeholder keys used in a string */
export function extractPlaceholderKeys(text: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(PLACEHOLDER_PATTERN.source, "g");
  while ((match = regex.exec(text)) !== null) {
    keys.add(match[1]!);
  }
  return [...keys];
}

/** Validate placeholder inputs against their definitions */
export function validatePlaceholderInputs(
  defs: TemplatePlaceholderDefinition[],
  inputs: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const def of defs) {
    const value = inputs[def.key];
    if (def.required && (value === undefined || value === null || value === "")) {
      errors.push(`Placeholder "${def.label}" (${def.key}) is required.`);
      continue;
    }
    if (value === undefined) continue;

    if (def.max_length && typeof value === "string" && value.length > def.max_length) {
      errors.push(`"${def.label}" exceeds max length of ${def.max_length}.`);
    }
    if (def.type === "select" && def.options) {
      const valid = def.options.some((o: TemplatePlaceholderOption) => o.value === String(value));
      if (!valid) errors.push(`"${def.label}" has an invalid option value.`);
    }
    if (def.type === "number" && isNaN(Number(value))) {
      errors.push(`"${def.label}" must be a number.`);
    }
    if (def.type === "date" && isNaN(Date.parse(String(value)))) {
      errors.push(`"${def.label}" must be a valid date.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Render a template string by substituting {{key}} placeholders */
export function renderTemplate(
  template: string,
  inputs: Record<string, unknown>,
  defs: TemplatePlaceholderDefinition[]
): string {
  const defaultsByKey = Object.fromEntries(
    defs.map((d) => [d.key, d.default_value ?? ""])
  );
  return template.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const val = inputs[key] ?? defaultsByKey[key] ?? "";
    // Sanitize: strip HTML tags to prevent XSS
    return String(val).replace(/<[^>]*>/g, "");
  });
}

// ─── Due Date Engine ──────────────────────────────────────────────────────────

/**
 * Compute due date from a DueDateRule.
 * Returns ISO date string or null.
 */
export function computeDueDate(
  rule: DueDateRule | null | undefined,
  inputs: Record<string, unknown>,
  baseDate: Date = new Date()
): string | null {
  if (!rule || rule.type === "none") return null;

  switch (rule.type) {
    case "days_after_creation":
      return addDays(baseDate, rule.days).toISOString().slice(0, 10);

    case "business_days_after_creation": {
      // addBusinessDays from date-fns skips Sat/Sun
      const result = addBusinessDays(baseDate, rule.days);
      return result.toISOString().slice(0, 10);
    }

    case "specific_weekday": {
      // Find next occurrence of given weekday (1=Mon ... 7=Sun -> date-fns Day 0=Sun...6=Sat)
      const dayMap: Record<number, Day> = {
        1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0,
      };
      const target = dayMap[rule.weekday] ?? 1;
      const result = nextDay(baseDate, target);
      return result.toISOString().slice(0, 10);
    }

    case "placeholder": {
      const val = inputs[rule.placeholder_key];
      if (val && typeof val === "string" && !isNaN(Date.parse(val))) {
        return val.slice(0, 10);
      }
      return null;
    }

    default:
      return null;
  }
}

// ─── Apply Preview Builder ────────────────────────────────────────────────────

export interface ApplyPreviewResult {
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

/**
 * Build the "preview" payload that shows the user exactly what fields
 * will be populated before they confirm the apply action.
 */
export function buildApplyPreview(
  version: TaskTemplateVersion,
  inputs: Record<string, unknown>
): ApplyPreviewResult {
  const { defaults, placeholders } = version;
  const warnings: string[] = [];

  const renderedTitle = renderTemplate(
    defaults.title_template,
    inputs,
    placeholders
  );
  const renderedDescription = defaults.description_template
    ? renderTemplate(defaults.description_template, inputs, placeholders)
    : "";

  // Detect unresolved placeholders
  const allKeys = [
    ...extractPlaceholderKeys(defaults.title_template),
    ...extractPlaceholderKeys(defaults.description_template ?? ""),
  ];
  const unresolvedKeys = allKeys.filter((k) => {
    const val = inputs[k];
    const def = placeholders.find((p: TemplatePlaceholderDefinition) => p.key === k);
    return (val === undefined || val === null || val === "") &&
      (def?.default_value === undefined || def.default_value === null);
  });

  if (unresolvedKeys.length > 0) {
    warnings.push(
      `Unresolved placeholders: ${unresolvedKeys.join(", ")}`
    );
  }

  const dueDate = computeDueDate(defaults.due_date_rule, inputs);

  return {
    rendered_title: renderedTitle,
    rendered_description: renderedDescription,
    task_type_id: defaults.task_type_id ?? null,
    priority: defaults.priority ?? null,
    tag_ids: defaults.tag_ids ?? [],
    estimated_hours: defaults.estimated_hours ?? null,
    assignee_id: defaults.assignee_id ?? null,
    due_date: dueDate,
    checklist_items: defaults.checklist_items ?? [],
    unresolved_placeholders: unresolvedKeys,
    warnings,
  };
}
