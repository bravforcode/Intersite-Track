import { supabaseAdmin } from "../../config/supabase.js";
import { Project, ProjectMilestone, Blocker, ProjectWeeklyUpdate } from "../../types/project.js";

/** Find all projects with optional filters */
export async function findAllProjects(filters: any = {}) {
  let query = supabaseAdmin
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, username, first_name, last_name),
      tasks(id, title, status, priority, progress, due_date),
      blockers(*)
    `)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
  if (filters.type) query = query.eq("type", filters.type);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Find project by ID with details */
export async function findProjectById(id: number) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, username, first_name, last_name),
      tasks(*, assignments:users(id, first_name, last_name)),
      milestones:project_milestones(*),
      blockers(*, reporter:users!blockers_reported_by_fkey(id, first_name, last_name)),
      weekly_updates:project_weekly_updates(*, user:users!project_weekly_updates_user_id_fkey(id, first_name, last_name))
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Create a new project */
export async function createProject(project: Partial<Project>) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert(project)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Update a project */
export async function updateProject(id: number, project: Partial<Project>) {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ ...project, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/** Delete a project */
export async function deleteProject(id: number) {
  const { error } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Milestones Queries */
export async function createMilestone(milestone: Partial<ProjectMilestone>) {
  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .insert(milestone)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateMilestone(id: number, milestone: Partial<ProjectMilestone>) {
  const { error } = await supabaseAdmin
    .from("project_milestones")
    .update(milestone)
    .eq("id", id);

  if (error) throw error;
}

/** Blockers Queries */
export async function createBlocker(blocker: Partial<Blocker>) {
  const { data, error } = await supabaseAdmin
    .from("blockers")
    .insert(blocker)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateBlocker(id: number, blocker: Partial<Blocker>) {
  const { error } = await supabaseAdmin
    .from("blockers")
    .update(blocker)
    .eq("id", id);

  if (error) throw error;
}

/** Weekly Updates Queries */
export async function createWeeklyUpdate(update: Partial<ProjectWeeklyUpdate>) {
  const { data, error } = await supabaseAdmin
    .from("project_weekly_updates")
    .insert(update)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
