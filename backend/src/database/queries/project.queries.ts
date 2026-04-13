import { db } from "../../config/firebase-admin.js";

async function enrichProjectsWithOwner(projects: any[]): Promise<any[]> {
  const ownerIds = [...new Set(projects.map((p: any) => p.owner_id).filter(Boolean))] as string[];
  if (ownerIds.length === 0) return projects;
  const ownerDocs = await Promise.all(ownerIds.map(id => db.collection("users").doc(id).get()));
  const ownerMap = new Map<string, any>();
  for (const doc of ownerDocs) {
    if (doc.exists) {
      const d = doc.data()!;
      ownerMap.set(doc.id, { id: doc.id, first_name: d.first_name ?? "", last_name: d.last_name ?? "" });
    }
  }
  return projects.map((p: any) => ({
    ...p,
    owner: p.owner_id ? (ownerMap.get(p.owner_id) ?? null) : null,
  }));
}

export async function findAllProjects(filters: any = {}) {
  const snap = await db.collection("projects").orderBy("created_at", "desc").get();
  let projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (filters.status) projects = projects.filter((p: any) => p.status === filters.status);
  if (filters.owner_id) projects = projects.filter((p: any) => p.owner_id === filters.owner_id);
  if (filters.type) projects = projects.filter((p: any) => p.type === filters.type);

  return enrichProjectsWithOwner(projects);
}

export async function findProjectById(id: string) {
  const [projectDoc, milestonesSnap, blockersSnap, updatesSnap, tasksSnap] = await Promise.all([
    db.collection("projects").doc(id).get(),
    db.collection("project_milestones").where("project_id", "==", id).get(),
    db.collection("task_blockers").where("project_id", "==", id).get(),
    db.collection("project_weekly_updates").where("project_id", "==", id).get(),
    db.collection("tasks").where("project_id", "==", id).get(),
  ]);

  if (!projectDoc.exists) return null;

  const project: any = { id: projectDoc.id, ...projectDoc.data() };

  // Enrich with owner
  if (project.owner_id) {
    const ownerDoc = await db.collection("users").doc(project.owner_id).get();
    if (ownerDoc.exists) {
      const d = ownerDoc.data()!;
      project.owner = { id: ownerDoc.id, first_name: d.first_name ?? "", last_name: d.last_name ?? "" };
    }
  }

  // Enrich blockers with reporter info
  const blockers = await Promise.all(
    blockersSnap.docs.map(async doc => {
      const data = doc.data();
      let reporter = null;
      if (data.reported_by) {
        const rDoc = await db.collection("users").doc(data.reported_by).get();
        if (rDoc.exists) {
          const rd = rDoc.data()!;
          reporter = { id: rDoc.id, first_name: rd.first_name ?? "", last_name: rd.last_name ?? "" };
        }
      }
      return { id: doc.id, ...data, reporter };
    })
  );

  project.milestones = milestonesSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((left: any, right: any) => String(left.created_at ?? "").localeCompare(String(right.created_at ?? "")));
  project.blockers = blockers.sort((left: any, right: any) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
  project.weekly_updates = updatesSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((left: any, right: any) => String(right.week_start_date ?? "").localeCompare(String(left.week_start_date ?? "")));
  project.tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return project;
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
