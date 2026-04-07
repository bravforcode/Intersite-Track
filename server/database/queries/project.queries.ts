import { db } from "../../config/firebase-admin.js";

export async function findAllProjects(filters: any = {}) {
  let query: FirebaseFirestore.Query = db
    .collection("projects")
    .orderBy("created_at", "desc");

  const snap = await query.get();
  let projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (filters.status) projects = projects.filter((p: any) => p.status === filters.status);
  if (filters.owner_id) projects = projects.filter((p: any) => p.owner_id === filters.owner_id);
  if (filters.type) projects = projects.filter((p: any) => p.type === filters.type);

  return projects;
}

export async function findProjectById(id: string) {
  const doc = await db.collection("projects").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function createProject(project: any): Promise<string> {
  const ref = db.collection("projects").doc();
  await ref.set({
    ...project,
    created_at: project.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateProject(id: string, project: any): Promise<void> {
  await db.collection("projects").doc(id).update({
    ...project,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await db.collection("projects").doc(id).delete();
}

export async function createMilestone(milestone: any): Promise<string> {
  const ref = db.collection("project_milestones").doc();
  await ref.set({ ...milestone, created_at: new Date().toISOString() });
  return ref.id;
}

export async function updateMilestone(id: string, milestone: any): Promise<void> {
  await db.collection("project_milestones").doc(id).update(milestone);
}

export async function createBlocker(blocker: any): Promise<string> {
  const ref = db.collection("task_blockers").doc();
  await ref.set({ ...blocker, created_at: new Date().toISOString() });
  return ref.id;
}

export async function updateBlocker(id: string, blocker: any): Promise<void> {
  await db.collection("task_blockers").doc(id).update(blocker);
}

export async function createWeeklyUpdate(update: any): Promise<string> {
  const ref = db.collection("project_weekly_updates").doc();
  await ref.set({ ...update, created_at: new Date().toISOString() });
  return ref.id;
}
