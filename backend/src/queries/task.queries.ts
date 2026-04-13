/**
 * Optimized Firestore Queries for Task Operations
 * 
 * These queries use composite indexes to avoid full-collection scans.
 * Each query is optimized for specific sorting/filtering combinations.
 * 
 * See firestore.indexes.json for the required composite indexes.
 */

import { db } from "../database/init.js";
import type { Task } from "../types/index.js";

/**
 * Find tasks by status with pagination
 * Uses index: (status, created_at DESC)
 * 
 * @param status - Task status to filter by
 * @param limit - Max results to return
 * @param offset - Pagination offset (for cursor-based pagination, optional)
 * @returns Matching tasks ordered by creation date (newest first)
 */
export async function findTasksByStatus(
  status: string,
  limit: number = 50,
  offset: number = 0
): Promise<Task[]> {
  try {
    const snapshot = await db
      .collection("tasks")
      .where("status", "==", status)
      .orderBy("created_at", "desc")
      .limit(limit + offset)
      .get();

    return snapshot.docs
      .slice(offset)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Task));
  } catch (error) {
    console.error(`Error finding tasks by status '${status}':`, error);
    throw error;
  }
}

/**
 * Find tasks by priority with optional status filter
 * Uses index: (priority, created_at DESC) or (priority, status, created_at DESC)
 * 
 * @param priority - Task priority level
 * @param status - Optional status filter
 * @param limit - Max results to return
 * @returns Matching tasks ordered by creation date (newest first)
 */
export async function findTasksByPriority(
  priority: string,
  status?: string,
  limit: number = 50
): Promise<Task[]> {
  try {
    let query = db
      .collection("tasks")
      .where("priority", "==", priority)
      .orderBy("created_at", "desc")
      .limit(limit);

    if (status) {
      query = query.where("status", "==", status) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
  } catch (error) {
    console.error(`Error finding tasks by priority '${priority}':`, error);
    throw error;
  }
}

/**
 * Find tasks by project
 * Uses index: (project_id, created_at DESC)
 * 
 * @param projectId - Project ID to filter by
 * @param limit - Max results to return
 * @returns Tasks in project ordered by creation date (newest first)
 */
export async function findTasksByProject(
  projectId: string,
  limit: number = 100
): Promise<Task[]> {
  try {
    const snapshot = await db
      .collection("tasks")
      .where("project_id", "==", projectId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
  } catch (error) {
    console.error(`Error finding tasks by project '${projectId}':`, error);
    throw error;
  }
}

/**
 * Find tasks by assignee (user_id)
 * Uses index: (user_id, created_at DESC)
 * 
 * @param userId - User ID assigned to tasks
 * @param limit - Max results to return
 * @returns Tasks assigned to user ordered by creation date (newest first)
 */
export async function findTasksByAssignee(
  userId: string,
  limit: number = 100
): Promise<Task[]> {
  try {
    const snapshot = await db
      .collection("tasks")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
  } catch (error) {
    console.error(`Error finding tasks by assignee '${userId}':`, error);
    throw error;
  }
}

/**
 * Find tasks with multiple filters (status + priority)
 * Uses index: (status, priority, due_date ASC)
 * 
 * @param status - Task status
 * @param priority - Task priority
 * @param limit - Max results to return
 * @returns Matching tasks ordered by due date (soonest first)
 */
export async function findTasksWithMultipleFilters(
  status: string,
  priority: string,
  limit: number = 50
): Promise<Task[]> {
  try {
    const snapshot = await db
      .collection("tasks")
      .where("status", "==", status)
      .where("priority", "==", priority)
      .orderBy("due_date", "asc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
  } catch (error) {
    console.error(
      `Error finding tasks with status='${status}' and priority='${priority}':`,
      error
    );
    throw error;
  }
}

/**
 * Find overdue tasks by checking due_date < now
 * Uses index: (due_date ASC, status)
 * 
 * @param limit - Max results to return
 * @returns Overdue tasks ordered by due date (most overdue first)
 */
export async function findOverdueTasks(limit: number = 50): Promise<Task[]> {
  try {
    const now = new Date();
    const snapshot = await db
      .collection("tasks")
      .where("due_date", "<", now)
      .where("status", "!=", "completed")
      .orderBy("due_date", "asc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
  } catch (error) {
    console.error("Error finding overdue tasks:", error);
    throw error;
  }
}

/**
 * Get task count by status (for dashboard metrics)
 * Uses group-by aggregation (Firestore native count, not manual)
 * 
 * @param status - Task status to count
 * @returns Number of tasks with that status
 */
export async function getTaskCountByStatus(status: string): Promise<number> {
  try {
    const snapshot = await db
      .collection("tasks")
      .where("status", "==", status)
      .count()
      .get();

    return snapshot.data().count;
  } catch (error) {
    console.error(`Error counting tasks by status '${status}':`, error);
    throw error;
  }
}

/**
 * Precomputed summary stats (called by cron job)
 * Stores aggregated stats to avoid dashboard query delays
 * 
 * Call this from cron job every 5 minutes
 */
export async function updateTaskMetricsSummary(): Promise<void> {
  try {
    const statuses = ["pending", "in_progress", "completed", "cancelled"];
    const priorities = ["low", "medium", "high", "urgent"];

    const stats: Record<string, number> = {};

    // Count by status
    for (const status of statuses) {
      const count = await getTaskCountByStatus(status);
      stats[`status_${status}`] = count;
    }

    // Count by priority
    for (const priority of priorities) {
      const snapshot = await db
        .collection("tasks")
        .where("priority", "==", priority)
        .count()
        .get();
      stats[`priority_${priority}`] = snapshot.data().count;
    }

    // Store in metrics document for dashboard
    await db.collection("_metadata").doc("task_metrics").set(
      {
        ...stats,
        updated_at: new Date(),
      },
      { merge: true }
    );

    console.log("Task metrics summary updated:", stats);
  } catch (error) {
    console.error("Error updating task metrics summary:", error);
    throw error;
  }
}

/**
 * Get precomputed metrics (fast, cached, <1ms response)
 * 
 * @returns Cached metrics from last cron update
 */
export async function getTaskMetricsSummary() {
  try {
    const doc = await db.collection("_metadata").doc("task_metrics").get();
    return doc.data() || {};
  } catch (error) {
    console.error("Error getting task metrics summary:", error);
    return {};
  }
}
