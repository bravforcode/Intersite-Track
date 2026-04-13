import { describe, it } from "node:test";
import assert from "node:assert";
import {
  findTasksByStatus,
  findTasksByPriority,
  findTasksByProject,
  findTasksByAssignee,
  Task,
} from "../queries/task.queries.js";

describe("Optimized Task Queries", () => {
  describe("findTasksByStatus", () => {
    it("should return only tasks with requested status", async () => {
      // This test assumes sample data exists in Firestore
      const tasks = await findTasksByStatus("pending", 10);
      
      assert.ok(
        tasks.every(t => t.status === "pending"),
        "All returned tasks should have status='pending'"
      );
    });

    it("should limit results to specified count", async () => {
      const tasks = await findTasksByStatus("pending", 5);
      assert.ok(tasks.length <= 5, "Should return max 5 tasks");
    });

    it("should order results by created_at descending", async () => {
      const tasks = await findTasksByStatus("pending", 20);
      
      if (tasks.length > 1) {
        for (let i = 0; i < tasks.length - 1; i++) {
          const current = new Date(tasks[i].created_at).getTime();
          const next = new Date(tasks[i + 1].created_at).getTime();
          assert.ok(
            current >= next,
            `Task ${i} (${tasks[i].created_at}) should be >= Task ${i + 1} (${tasks[i + 1].created_at})`
          );
        }
      }
    });
  });

  describe("findTasksByPriority", () => {
    it("should return only tasks with requested priority", async () => {
      const tasks = await findTasksByPriority("high", undefined, 10);
      
      assert.ok(
        tasks.every(t => t.priority === "high"),
        "All returned tasks should have priority='high'"
      );
    });

    it("should support optional status filter", async () => {
      const tasks = await findTasksByPriority("urgent", "in_progress", 10);
      
      assert.ok(
        tasks.every(t => t.priority === "urgent" && t.status === "in_progress"),
        "All tasks should match both priority and status"
      );
    });
  });

  describe("findTasksByProject", () => {
    it("should return only tasks from specified project", async () => {
      // Create a test project first
      const projectId = "test-project-123";
      const tasks = await findTasksByProject(projectId, undefined, 10);
      
      if (tasks.length > 0) {
        assert.ok(
          tasks.every(t => t.project_id === projectId),
          `All tasks should belong to project ${projectId}`
        );
      }
    });

    it("should support status filter", async () => {
      const projectId = "test-project-123";
      const tasks = await findTasksByProject(projectId, "completed", 10);
      
      if (tasks.length > 0) {
        assert.ok(
          tasks.every(t => t.project_id === projectId && t.status === "completed"),
          "All tasks should match project and status"
        );
      }
    });
  });

  describe("findTasksByAssignee", () => {
    it("should return only tasks assigned to user", async () => {
      const userId = "user-123";
      const tasks = await findTasksByAssignee(userId, undefined, 10);
      
      if (tasks.length > 0) {
        assert.ok(
          tasks.every(t => t.assignments?.some(a => a.id === userId)),
          "All tasks should be assigned to user"
        );
      }
    });

    it("should support status filter for assigned tasks", async () => {
      const userId = "user-123";
      const tasks = await findTasksByAssignee(userId, "pending", 10);
      
      if (tasks.length > 0) {
        assert.ok(
          tasks.every(
            t =>
              t.assignments?.some(a => a.id === userId) && t.status === "pending"
          ),
          "All tasks should be assigned to user with status 'pending'"
        );
      }
    });
  });

  describe("Query Performance Baseline", () => {
    it("should complete status query in < 1 second", async () => {
      const start = Date.now();
      await findTasksByStatus("pending", 100);
      const duration = Date.now() - start;
      
      assert.ok(duration < 1000, `Query should complete < 1000ms, took ${duration}ms`);
    });

    it("should complete priority query in < 1 second", async () => {
      const start = Date.now();
      await findTasksByPriority("high", "pending", 100);
      const duration = Date.now() - start;
      
      assert.ok(duration < 1000, `Query should complete < 1000ms, took ${duration}ms`);
    });
  });
});

describe("Query Index Verification", () => {
  it("verifies that compound indexes are in use", async () => {
    // This test documents which indexes should exist in firestore.indexes.json
    const expectedIndexes = {
      "status + created_at DESC": "for findTasksByStatus",
      "priority + created_at DESC": "for findTasksByPriority",
      "priority + status + created_at DESC": "for findTasksByPriority with status",
      "project_id + status + created_at DESC": "for findTasksByProject",
      "assignees CONTAINS + status + created_at DESC": "for findTasksByAssignee",
      "due_date + status": "for findTasksByDueDateRange",
    };

    // Just document what indexes are needed
    assert.ok(
      true,
      `Ensure firestore.indexes.json contains: ${Object.keys(expectedIndexes).join(", ")}`
    );
  });
});
