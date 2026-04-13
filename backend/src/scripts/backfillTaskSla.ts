import { db } from "../config/firebase-admin.js";
import { slaService } from "../services/sla.service.js";
import { TaskStatus, TaskPriority } from "../database/queries/task.queries.js";

async function run() {
  console.log("Starting SLA Backfill script...");
  const allTasks = await db.collection("tasks").get();
  console.log(`Found ${allTasks.empty ? 0 : allTasks.docs.length} tasks total to scan.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const doc of allTasks.docs) {
    const data = doc.data();
    
    // Skip if already migrated
    if (data.sla_enabled === true) {
      skippedCount++;
      continue;
    }

    try {
      const priority = (data.priority as TaskPriority) ?? "medium";
      // Fallback to current date if missing created_at (unlikely, but safe)
      const anchorDate = data.created_at ?? new Date().toISOString();
      const status = (data.status as TaskStatus) ?? "pending";
      const updatedAt = data.updated_at ?? anchorDate;

      // 1. Compute Base Target
      const slaInitial = await slaService.calculateInitialSLA(anchorDate, priority);
      const payload: Record<string, any> = { ...slaInitial };

      // 2. Evaluate current real status depending on if it's already closed
      if (status === "completed" || status === "cancelled") {
        const evalResult = await slaService.evaluateStatus(
          payload.sla_anchor_date,
          payload.sla_deadline_date,
          updatedAt
        );
        payload.met_sla = evalResult.status !== "breached";
        payload.sla_status = evalResult.status;
        payload.sla_elapsed_business_days = evalResult.elapsed_business_days;
      } else {
        // Evaluate up to NOW for active tasks
        const now = new Date().toISOString();
        const evalResult = await slaService.evaluateStatus(
          payload.sla_anchor_date,
          payload.sla_deadline_date,
          now
        );
        payload.sla_status = evalResult.status;
        payload.sla_elapsed_business_days = evalResult.elapsed_business_days;
        
        if (evalResult.status === "breached" && payload.sla_breached_at == null) {
          payload.sla_breached_at = now;
        }
      }

      await doc.ref.update(payload);
      updatedCount++;
      process.stdout.write(`\rSuccessfully updated: ${updatedCount} | Skipped: ${skippedCount}`);
    } catch (err) {
      console.error(`\nError updating task ${doc.id}:`, err);
      errorCount++;
    }
  }

  console.log(`\n\nMigration complete. Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal exception during backfill:", err);
  process.exit(1);
});
