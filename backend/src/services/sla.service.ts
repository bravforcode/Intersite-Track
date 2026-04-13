import { businessCalendarService } from "./businessCalendar.service.js";
import { TaskPriority } from "../database/queries/task.queries.js";

export type SlaStatus = "fine" | "warning" | "breached";
export type SlaAlertState = "none" | "warning_sent" | "breach_sent";

export const SLA_PRIORITY_TARGETS: Record<TaskPriority, number> = {
  urgent: 1,
  high: 2,
  medium: 5,
  low: 10,
};

export interface SLAInitialResult {
  sla_enabled: boolean;
  sla_target_days: number;
  sla_anchor_date: string;
  sla_deadline_date: string;
  sla_status: SlaStatus;
  sla_status_updated_at: string;
  sla_elapsed_business_days: number;
  sla_alert_state: SlaAlertState;
  sla_last_alerted_at?: string;
  sla_breached_at?: string | null;
  met_sla?: boolean;
}

export interface SLAEvaluationResult {
  status: SlaStatus;
  elapsed_business_days: number;
  is_new_breach: boolean;
}

export class SLAService {
  /**
   * Initializes SLA fields for a new task or upon reopening a task.
   */
  public async calculateInitialSLA(anchorDateISO: string, priority: TaskPriority): Promise<SLAInitialResult> {
    const targetDays = SLA_PRIORITY_TARGETS[priority] ?? 5;
    const deadlineDate = await businessCalendarService.addBusinessDays(anchorDateISO, targetDays);
    
    return {
      sla_enabled: true,
      sla_target_days: targetDays,
      sla_anchor_date: anchorDateISO,
      sla_deadline_date: deadlineDate,
      sla_status: "fine",
      sla_status_updated_at: new Date().toISOString(),
      sla_elapsed_business_days: 0,
      sla_alert_state: "none",
    };
  }

  /**
   * Recomputes SLA target when task priority is updated but anchor date remains the same.
   */
  public async recomputeForPriorityChange(anchorDateISO: string, newPriority: TaskPriority): Promise<Partial<SLAInitialResult>> {
    const targetDays = SLA_PRIORITY_TARGETS[newPriority] ?? 5;
    const deadlineDate = await businessCalendarService.addBusinessDays(anchorDateISO, targetDays);
    
    return {
      sla_target_days: targetDays,
      sla_deadline_date: deadlineDate,
    };
  }

  /**
   * Evaluates the current SLA state based on original anchor and deadline against the current time.
   */
  public async evaluateStatus(
    anchorDateISO: string, 
    deadlineDateISO: string, 
    nowISO: string = new Date().toISOString()
  ): Promise<SLAEvaluationResult> {
    const nowStr = nowISO.substring(0, 10);
    const deadlineStr = deadlineDateISO.substring(0, 10);
    
    const elapsedDays = await businessCalendarService.diffBusinessDays(anchorDateISO, nowISO);
    const remainingDays = await businessCalendarService.diffBusinessDays(nowISO, deadlineDateISO);
    
    let nextStatus: SlaStatus = "fine";
    
    if (nowStr > deadlineStr) {
      nextStatus = "breached";
    } else if (remainingDays <= 1) { // 1 business day left or today is the deadline (0 days)
      nextStatus = "warning";
    }
    
    return {
      status: nextStatus,
      elapsed_business_days: elapsedDays,
      is_new_breach: nextStatus === "breached"
    };
  }
}

export const slaService = new SLAService();
