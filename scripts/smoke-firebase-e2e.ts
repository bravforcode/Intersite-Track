import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import { adminAuth, db } from "../server/config/firebase-admin.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type HeadersMap = Record<string, string>;
type Json = Record<string, unknown>;

const args = process.argv.slice(2);
const cleanupOnly = args.includes("--cleanup-only");
const baseUrl = getArg("--base-url") ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3695";
const apiKey = process.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error("Missing VITE_FIREBASE_API_KEY in .env");
}

const runId = `${Date.now()}`;
const password = "Smoke123!";
const staffEmail = `api.smoke.staff.${runId}@taskam.local`;
const adminEmail = `api.smoke.admin.${runId}@taskam.local`;

const createdDocs = new Map<string, string[]>();
const createdUserIds = new Set<string>();

function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function trackDoc(collection: string, id: string | undefined): void {
  if (!id) return;
  const current = createdDocs.get(collection) ?? [];
  current.push(id);
  createdDocs.set(collection, current);
}

function trackUser(id: string | undefined): void {
  if (id) createdUserIds.add(id);
}

async function fetchJson(method: string, url: string, options: { token?: string; body?: unknown; expected?: number } = {}) {
  const headers: HeadersMap = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const json = text ? safeParseJson(text) : null;

  if (options.expected !== undefined) {
    assert.equal(response.status, options.expected, `${method} ${url} returned ${response.status}: ${text}`);
  } else {
    assert.ok(response.ok, `${method} ${url} returned ${response.status}: ${text}`);
  }

  return { status: response.status, json, headers: response.headers };
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchRaw(method: string, url: string, options: { token?: string; expected?: number } = {}) {
  const headers: HeadersMap = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(url, { method, headers });
  const buffer = Buffer.from(await response.arrayBuffer());

  if (options.expected !== undefined) {
    assert.equal(response.status, options.expected, `${method} ${url} returned ${response.status}`);
  } else {
    assert.ok(response.ok, `${method} ${url} returned ${response.status}`);
  }

  return { status: response.status, headers: response.headers, buffer };
}

async function createUserDirect(email: string, role: "admin" | "staff") {
  const created = await adminAuth.createUser({
    email,
    password,
    emailVerified: true,
  });

  await db.collection("users").doc(created.uid).set({
    username: `${role}_smoke_${runId}`,
    email,
    first_name: "Smoke",
    last_name: role === "admin" ? "Admin" : "Staff",
    role,
    department_id: null,
    position: role === "admin" ? "QA Admin" : "QA Staff",
    line_user_id: null,
    created_at: new Date().toISOString(),
  });

  trackUser(created.uid);
  return { id: created.uid, email, provisionedDirectly: true };
}

async function signupOrProvision(email: string, role: "admin" | "staff") {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  const json = text ? safeParseJson(text) : null;

  if (response.status === 201) {
    const id = String((json as Json).id);
    trackUser(id);
    return { id, email, provisionedDirectly: false };
  }

  if (response.status === 429) {
    console.log(`[smoke] signup throttled for ${email}, provisioning directly for rerun stability`);
    return createUserDirect(email, role);
  }

  throw new Error(`POST ${baseUrl}/api/auth/signup returned ${response.status}: ${text}`);
}

async function signIn(email: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const text = await response.text();
  assert.equal(response.status, 200, `Firebase sign-in failed for ${email}: ${text}`);
  const json = JSON.parse(text) as Json;
  return {
    uid: String(json.localId),
    token: String(json.idToken),
  };
}

async function cleanupSmokeUsersAndArtifacts(): Promise<void> {
  const userDocs = await db.collection("users").get();
  const smokeUsers = userDocs.docs.filter((doc) => {
    const email = String(doc.data()?.email ?? "");
    return email.startsWith("api.smoke.") || email.startsWith("ui.smoke.");
  });

  for (const doc of smokeUsers) {
    await cleanupArtifactsForUser(doc.id);
    await db.collection("users").doc(doc.id).delete().catch(() => {});
    await adminAuth.deleteUser(doc.id).catch(() => {});
  }

  const taskCollections = [
    "task_comments",
    "task_updates",
    "task_checklists",
    "task_audit_logs",
    "task_blockers",
  ];

  const taskDocs = await db.collection("tasks").get();
  for (const doc of taskDocs.docs) {
    const title = String(doc.data()?.title ?? "");
    if (!title.includes("[SMOKE]")) continue;
    for (const collection of taskCollections) {
      await deleteWhereEqual(collection, "task_id", doc.id);
    }
    await db.collection("tasks").doc(doc.id).delete().catch(() => {});
  }

  const projectCollections = ["project_milestones", "project_weekly_updates", "task_blockers"];
  const projectDocs = await db.collection("projects").get();
  for (const doc of projectDocs.docs) {
    const name = String(doc.data()?.name ?? "");
    if (!name.includes("[SMOKE]")) continue;
    for (const collection of projectCollections) {
      await deleteWhereEqual(collection, "project_id", doc.id);
    }
    await db.collection("projects").doc(doc.id).delete().catch(() => {});
  }

  for (const collection of ["departments", "task_types", "holidays", "saturday_schedules"]) {
    const snap = await db.collection(collection).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const haystack = JSON.stringify(data);
      if (haystack.includes("[SMOKE]")) {
        await db.collection(collection).doc(doc.id).delete().catch(() => {});
      }
    }
  }
}

async function cleanupArtifactsForUser(userId: string): Promise<void> {
  await deleteWhereEqual("notifications", "user_id", userId);
}

async function deleteWhereEqual(collection: string, field: string, value: string): Promise<void> {
  const snap = await db.collection(collection).where(field, "==", value).get();
  for (const doc of snap.docs) {
    await doc.ref.delete().catch(() => {});
  }
}

async function cleanupRunArtifacts(): Promise<void> {
  const taskIds = createdDocs.get("tasks") ?? [];
  const projectIds = createdDocs.get("projects") ?? [];

  for (const taskId of taskIds) {
    for (const collection of ["task_comments", "task_updates", "task_checklists", "task_audit_logs", "task_blockers"]) {
      await deleteWhereEqual(collection, "task_id", taskId);
    }
  }

  for (const projectId of projectIds) {
    for (const collection of ["project_milestones", "project_weekly_updates", "task_blockers"]) {
      await deleteWhereEqual(collection, "project_id", projectId);
    }
  }

  for (const [collection, ids] of createdDocs.entries()) {
    for (const id of ids.slice().reverse()) {
      await db.collection(collection).doc(id).delete().catch(() => {});
    }
  }

  for (const uid of createdUserIds) {
    await cleanupArtifactsForUser(uid);
    await db.collection("users").doc(uid).delete().catch(() => {});
    await adminAuth.deleteUser(uid).catch(() => {});
  }
}

async function main() {
  console.log(`[smoke] base URL: ${baseUrl}`);
  await cleanupSmokeUsersAndArtifacts();
  if (cleanupOnly) {
    console.log("[smoke] cleanup-only complete");
    return;
  }

  const createdStaff = await signupOrProvision(staffEmail, "staff");
  const createdAdmin = await signupOrProvision(adminEmail, "admin");

  await db.collection("users").doc(createdAdmin.id).update({
    role: "admin",
    username: `admin_smoke_${runId}`,
    first_name: "Smoke",
    last_name: "Admin",
    position: "QA Admin",
  });

  const staffAuth = await signIn(staffEmail);
  const adminAuthSession = await signIn(adminEmail);

  await fetchJson("PUT", `${baseUrl}/api/auth/me`, {
    token: staffAuth.token,
    body: {
      username: `staff_smoke_${runId}`,
      first_name: "Smoke",
      last_name: "Staff",
      position: "QA Staff",
    },
    expected: 200,
  });

  await fetchJson("PUT", `${baseUrl}/api/auth/me`, {
    token: adminAuthSession.token,
    body: {
      username: `admin_smoke_${runId}`,
      first_name: "Smoke",
      last_name: "Admin",
      position: "QA Admin",
    },
    expected: 200,
  });

  await fetchJson("POST", `${baseUrl}/api/auth/profile`, { token: staffAuth.token, expected: 200 });
  await fetchJson("POST", `${baseUrl}/api/auth/profile`, { token: adminAuthSession.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/auth/me/line-link/status`, { token: staffAuth.token, expected: 200 });

  await fetchJson("GET", `${baseUrl}/api/tasks`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/tasks/workspace`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/projects`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/departments`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/task-types`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/notifications/${staffAuth.uid}`, { token: staffAuth.token, expected: 200 });
  await fetchJson("POST", `${baseUrl}/api/projects`, {
    token: staffAuth.token,
    body: { name: `[SMOKE] forbidden ${runId}` },
    expected: 403,
  });
  await fetchJson("GET", `${baseUrl}/api/settings/line-group`, { token: staffAuth.token, expected: 403 });

  const createdDepartment = await fetchJson("POST", `${baseUrl}/api/departments`, {
    token: adminAuthSession.token,
    body: { name: `[SMOKE] Department ${runId}` },
    expected: 200,
  });
  const departmentId = String((createdDepartment.json as Json).id);
  trackDoc("departments", departmentId);

  await fetchJson("PUT", `${baseUrl}/api/departments/${departmentId}`, {
    token: adminAuthSession.token,
    body: { name: `[SMOKE] Department ${runId} Updated` },
    expected: 200,
  });

  const createdTaskType = await fetchJson("POST", `${baseUrl}/api/task-types`, {
    token: adminAuthSession.token,
    body: { name: `[SMOKE] Task Type ${runId}` },
    expected: 200,
  });
  const taskTypeId = String((createdTaskType.json as Json).id);
  trackDoc("task_types", taskTypeId);

  await fetchJson("PUT", `${baseUrl}/api/task-types/${taskTypeId}`, {
    token: adminAuthSession.token,
    body: { name: `[SMOKE] Task Type ${runId} Updated` },
    expected: 200,
  });

  const createdProject = await fetchJson("POST", `${baseUrl}/api/projects`, {
    token: adminAuthSession.token,
    body: {
      name: `[SMOKE] Project ${runId}`,
      description: "Firebase smoke project",
      owner_id: createdAdmin.id,
      status: "planning",
      type: "new_dev",
      client_name: "Smoke Client",
      color: "#335577",
      tags: ["smoke", "firebase"],
    },
    expected: 200,
  });
  const projectId = String((createdProject.json as Json).id);
  trackDoc("projects", projectId);

  await fetchJson("PUT", `${baseUrl}/api/projects/${projectId}`, {
    token: adminAuthSession.token,
    body: {
      name: `[SMOKE] Project ${runId} Updated`,
      notes: "updated",
    },
    expected: 200,
  });

  const createdMilestone = await fetchJson("POST", `${baseUrl}/api/projects/${projectId}/milestones`, {
    token: adminAuthSession.token,
    body: {
      title: `[SMOKE] Milestone ${runId}`,
      description: "milestone",
      due_date: "2026-12-31",
    },
    expected: 200,
  });
  const milestoneId = String((createdMilestone.json as Json).id);
  trackDoc("project_milestones", milestoneId);

  await fetchJson("PATCH", `${baseUrl}/api/projects/milestones/${milestoneId}`, {
    token: adminAuthSession.token,
    body: { status: "completed" },
    expected: 200,
  });

  const createdBlocker = await fetchJson("POST", `${baseUrl}/api/projects/${projectId}/blockers`, {
    token: adminAuthSession.token,
    body: {
      description: `[SMOKE] blocker ${runId}`,
      task_id: null,
    },
    expected: 200,
  });
  const blockerId = String((createdBlocker.json as Json).id);
  trackDoc("task_blockers", blockerId);

  await fetchJson("PATCH", `${baseUrl}/api/projects/blockers/${blockerId}/resolve`, {
    token: adminAuthSession.token,
    body: {},
    expected: 200,
  });

  const createdWeeklyUpdate = await fetchJson("POST", `${baseUrl}/api/projects/${projectId}/weekly-updates`, {
    token: adminAuthSession.token,
    body: {
      week_start_date: "2026-04-06",
      completed_this_week: "setup smoke",
      planned_next_week: "verify flows",
      current_blockers: "none",
      risk_level: "low",
    },
    expected: 200,
  });
  const weeklyUpdateId = String((createdWeeklyUpdate.json as Json).id);
  trackDoc("project_weekly_updates", weeklyUpdateId);

  const createdTask = await fetchJson("POST", `${baseUrl}/api/tasks`, {
    token: adminAuthSession.token,
    body: {
      title: `[SMOKE] Task ${runId}`,
      description: "firebase smoke task",
      task_type_id: taskTypeId,
      priority: "high",
      status: "pending",
      due_date: "2026-12-31",
      created_by: createdAdmin.id,
      assigned_user_ids: [createdStaff.id],
      project_id: projectId,
    },
    expected: 200,
  });
  const taskId = String((createdTask.json as Json).id);
  trackDoc("tasks", taskId);

  await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/users/task-context`, { token: staffAuth.token, expected: 200 });

  await fetchJson("PUT", `${baseUrl}/api/tasks/${taskId}`, {
    token: adminAuthSession.token,
    body: {
      title: `[SMOKE] Task ${runId} Updated`,
      description: "updated task",
      task_type_id: taskTypeId,
      priority: "urgent",
      status: "in_progress",
      due_date: "2026-12-31",
      assigned_user_ids: [createdStaff.id, createdAdmin.id],
      project_id: projectId,
    },
    expected: 200,
  });

  await fetchJson("POST", `${baseUrl}/api/tasks/${taskId}/comments`, {
    token: staffAuth.token,
    body: { message: "Smoke comment" },
    expected: 201,
  });

  await fetchJson("POST", `${baseUrl}/api/tasks/${taskId}/updates`, {
    token: staffAuth.token,
    body: {
      update_text: "Smoke progress update",
      progress: 35,
    },
    expected: 200,
  });

  const savedChecklist = await fetchJson("POST", `${baseUrl}/api/tasks/${taskId}/checklists`, {
    token: staffAuth.token,
    body: {
      items: [
        {
          title: "Parent",
          children: [
            { title: "Child A", is_checked: false },
            { title: "Child B", is_checked: false },
          ],
        },
      ],
    },
    expected: 200,
  });
  assert.equal((savedChecklist.json as Json).success, true);

  const checklistResponse = await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}/checklists`, {
    token: staffAuth.token,
    expected: 200,
  });
  const checklistRows = checklistResponse.json as Array<Json>;
  const childChecklist = checklistRows.find((row) => row.parent_id);
  assert.ok(childChecklist, "Expected a child checklist item");

  await fetchJson("PATCH", `${baseUrl}/api/tasks/${taskId}/checklists/${String(childChecklist.id)}/toggle`, {
    token: staffAuth.token,
    body: {},
    expected: 200,
  });

  await fetchJson("PATCH", `${baseUrl}/api/tasks/${taskId}/status`, {
    token: staffAuth.token,
    body: { status: "completed", progress: 100 },
    expected: 200,
  });

  await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}/updates`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}/comments`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}/activity`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/tasks/${taskId}/blockers`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/tasks/global/activity`, { token: adminAuthSession.token, expected: 200 });

  const holidayResponse = await fetchJson("POST", `${baseUrl}/api/holidays`, {
    token: adminAuthSession.token,
    body: {
      date: "2026-12-05",
      name: `[SMOKE] Holiday ${runId}`,
      type: "special",
    },
    expected: 200,
  });
  const holidayId = String((holidayResponse.json as Json).id);
  trackDoc("holidays", holidayId);

  await fetchJson("PUT", `${baseUrl}/api/holidays/${holidayId}`, {
    token: adminAuthSession.token,
    body: {
      date: "2026-12-05",
      name: `[SMOKE] Holiday ${runId} Updated`,
      type: "special",
    },
    expected: 200,
  });

  const saturdayResponse = await fetchJson("POST", `${baseUrl}/api/saturday-schedules`, {
    token: adminAuthSession.token,
    body: {
      date: "2026-12-12",
      user_ids: [createdAdmin.id],
      note: `[SMOKE] Saturday ${runId}`,
    },
    expected: 200,
  });
  const scheduleId = String((saturdayResponse.json as Json).id);
  trackDoc("saturday_schedules", scheduleId);

  await fetchJson("POST", `${baseUrl}/api/saturday-schedules/${scheduleId}/join`, {
    token: staffAuth.token,
    body: {},
    expected: 200,
  });
  await fetchJson("GET", `${baseUrl}/api/saturday-schedules`, { token: staffAuth.token, expected: 200 });

  await fetchJson("GET", `${baseUrl}/api/reports`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/reports/stats`, { token: staffAuth.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/reports/analytics`, { token: adminAuthSession.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/reports/by-staff`, { token: adminAuthSession.token, expected: 200 });
  await fetchJson("GET", `${baseUrl}/api/reports/by-date-range?start=2026-01-01&end=2026-12-31`, {
    token: adminAuthSession.token,
    expected: 200,
  });

  const csv = await fetchRaw("GET", `${baseUrl}/api/reports/export-csv`, { token: adminAuthSession.token, expected: 200 });
  assert.match(String(csv.headers.get("content-type")), /text\/csv/i);
  assert.ok(csv.buffer.length > 10);

  const pdf = await fetchRaw("GET", `${baseUrl}/api/reports/export-pdf`, { token: adminAuthSession.token, expected: 200 });
  assert.match(String(pdf.headers.get("content-type")), /application\/pdf/i);
  assert.ok(pdf.buffer.length > 10);

  const staffPdf = await fetchRaw("GET", `${baseUrl}/api/reports/export-staff-pdf`, { token: adminAuthSession.token, expected: 200 });
  assert.match(String(staffPdf.headers.get("content-type")), /application\/pdf/i);
  assert.ok(staffPdf.buffer.length > 10);

  await fetchJson("GET", `${baseUrl}/api/settings/line-group`, { token: adminAuthSession.token, expected: 200 });

  console.log("[smoke] Firebase end-to-end smoke passed");
}

main()
  .catch((error) => {
    console.error("[smoke] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupRunArtifacts();
  });
