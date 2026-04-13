import { db } from "../config/firebase-admin.js";
import { findAllTasks } from "../database/queries/task.queries.js";
import { slaService } from "./sla.service.js";
import { logger } from "../utils/logger.js";
import { slaNotificationService } from "./slaNotification.service.js";

export async function runSlaScan() {
  logger.info("Starting scheduled SLA scan for active tasks...");
  try {
    const allTasks = await findAllTasks();
    const activeTasks = allTasks.filter(t => t.status === "pending" || t.status === "in_progress");
    
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const task of activeTasks) {
      if (!task.sla_enabled || !task.sla_anchor_date || !task.sla_deadline_date) {
        continue;
      }

      const evalResult = await slaService.evaluateStatus(
        task.sla_anchor_date,
        task.sla_deadline_date,
        now
      );

      // Determine if a write is necessary
      let needsUpdate = false;
      const updates: Record<string, any> = {};

      if (task.sla_status !== evalResult.status) {
        needsUpdate = true;
        updates.sla_status = evalResult.status;
      }
      if (task.sla_elapsed_business_days !== evalResult.elapsed_business_days) {
        needsUpdate = true;
        updates.sla_elapsed_business_days = evalResult.elapsed_business_days;
      }

      const alertState = task.sla_alert_state || "none";

      if (evalResult.status === "warning" && alertState !== "warning_sent" && alertState !== "breach_sent") {
        needsUpdate = true;
        updates.sla_alert_state = "warning_sent";
        await slaNotificationService.notifyWarning(task);
      }

      if (evalResult.status === "breached" && alertState !== "breach_sent") {
        needsUpdate = true;
        updates.sla_alert_state = "breach_sent";
        
        if (task.sla_breached_at == null) {
          updates.sla_breached_at = now;
        }

        await slaNotificationService.notifyBreach(task, updates.sla_breached_at || task.sla_breached_at || now);
      }

      if (needsUpdate) {
        await db.collection("tasks").doc(task.id).update(updates);
        updatedCount++;
      }
    }

    logger.info(`SLA scan completed. Updated ${updatedCount} task(s).`);
  } catch (err: any) {
    logger.error("Error running SLA scan", { error: err.message });
  }
}
