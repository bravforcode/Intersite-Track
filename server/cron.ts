import { findAllTasks } from "./database/queries/task.queries.js";
import { lineService } from "./services/line.service.js";
import { logger } from "./utils/logger.js";

/**
 * Check for tasks with upcoming deadlines and send LINE notifications
 */
export async function checkUpcomingDeadlines() {
  logger.info("Checking for upcoming deadlines...");
  
  try {
    const tasks = await findAllTasks();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check for 1 day and 2 days before deadline
    const alertDays = [1, 2];
    
    for (const task of tasks) {
      if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') continue;
      
      const dueDate = new Date(task.due_date);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (alertDays.includes(diffDays)) {
        logger.info(`Sending deadline alert for task ${task.id} (${diffDays} days left)`);
        
        for (const assignee of (task.assignments || [])) {
          // We need line_user_id which is in the full user object
          // For now, let's assume we need to fetch it or it's already there if we improved the query
          // In our earlier update, we added line_user_id to the user query
          if ((assignee as any).line_user_id) {
            await lineService.notifyUpcomingDeadline(
              (assignee as any).line_user_id,
              task.title,
              task.due_date,
              diffDays
            );
          }
        }
      }
    }
    
    logger.info("Deadline check completed.");
  } catch (err: any) {
    logger.error("Error in checkUpcomingDeadlines", { error: err.message });
  }
}

// Set up interval (e.g., every 24 hours)
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(checkUpcomingDeadlines, TWENTY_FOUR_HOURS);

// Also run once on startup
setTimeout(checkUpcomingDeadlines, 10000); // Wait 10s after startup
