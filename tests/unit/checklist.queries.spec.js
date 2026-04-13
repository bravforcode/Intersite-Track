import test from "node:test";
import assert from "node:assert/strict";
import { sortChecklistRows } from "../../backend/src/database/queries/checklist.queries.ts";

test("sortChecklistRows groups by task id and sorts by sort_order with nulls last", () => {
  const rows = [
    { id: "b", task_id: "task-2", sort_order: 2 },
    { id: "a", task_id: "task-1", sort_order: 3 },
    { id: "d", task_id: "task-1", sort_order: null },
    { id: "c", task_id: "task-1", sort_order: 1 },
    { id: "e", task_id: "task-2", sort_order: 1 },
  ];

  const sorted = sortChecklistRows(rows);

  assert.deepEqual(
    sorted.map((row) => `${row.task_id}:${row.id}`),
    ["task-1:c", "task-1:a", "task-1:d", "task-2:e", "task-2:b"]
  );
});
