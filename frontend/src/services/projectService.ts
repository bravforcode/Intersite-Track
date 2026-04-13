import api from "./api";
import type { Project, ProjectMilestone, ProjectWeeklyUpdate } from "../types/project";

function buildQuery(filters?: Record<string, unknown>): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const projectService = {
  getProjects: async (filters?: Record<string, unknown>) =>
    api.get<Project[]>(`/api/projects${buildQuery(filters)}`),

  getProject: async (id: string) =>
    api.get<Project>(`/api/projects/${id}`),

  createProject: async (project: Partial<Project>) =>
    api.post<{ id: string }>("/api/projects", project),

  updateProject: async (id: string, project: Partial<Project>) =>
    api.put<void>(`/api/projects/${id}`, project),

  deleteProject: async (id: string) =>
    api.delete<void>(`/api/projects/${id}`),

  addMilestone: async (projectId: string, milestone: Partial<ProjectMilestone>) =>
    api.post<{ id: string }>(`/api/projects/${projectId}/milestones`, milestone),

  updateMilestoneStatus: async (milestoneId: string, status: "pending" | "completed") =>
    api.patch<void>(`/api/projects/milestones/${milestoneId}`, { status }),

  addBlocker: async (projectId: string, blocker: Partial<Record<string, unknown>>) =>
    api.post<{ id: string }>(`/api/projects/${projectId}/blockers`, blocker),

  resolveBlocker: async (blockerId: string) =>
    api.patch<void>(`/api/projects/blockers/${blockerId}/resolve`),

  addWeeklyUpdate: async (projectId: string, update: Partial<ProjectWeeklyUpdate>) =>
    api.post<{ id: string }>(`/api/projects/${projectId}/weekly-updates`, update),
};

export default projectService;