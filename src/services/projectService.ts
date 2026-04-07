import api from "./api";
import { Project, ProjectMilestone, ProjectWeeklyUpdate } from "../types/project";
import { Blocker } from "../types";

function buildQuery(filters: any): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const projectService = {
  getProjects: async (filters?: any) => {
    return api.get<Project[]>(`/api/projects${buildQuery(filters)}`);
  },

  getProject: async (id: string) => {
    return api.get<Project>(`/api/projects/${id}`);
  },

  createProject: async (project: Partial<Project>) => {
    return api.post<{ id: string }>("/api/projects", project);
  },

  updateProject: async (id: string, project: Partial<Project>) => {
    return api.put<void>(`/api/projects/${id}`, project);
  },

  deleteProject: async (id: string) => {
    return api.delete<void>(`/api/projects/${id}`);
  },

  addMilestone: async (projectId: string, milestone: Partial<ProjectMilestone>) => {
    return api.post<{ id: string }>(`/api/projects/${projectId}/milestones`, milestone);
  },

  updateMilestoneStatus: async (milestoneId: string, status: 'pending' | 'completed') => {
    return api.patch<void>(`/api/projects/milestones/${milestoneId}`, { status });
  },

  addBlocker: async (projectId: string, blocker: Partial<any>) => {
    return api.post<{ id: string }>(`/api/projects/${projectId}/blockers`, blocker);
  },

  resolveBlocker: async (blockerId: string) => {
    return api.patch<void>(`/api/projects/blockers/${blockerId}/resolve`);
  },

  addWeeklyUpdate: async (projectId: string, update: Partial<ProjectWeeklyUpdate>) => {
    return api.post<{ id: string }>(`/api/projects/${projectId}/weekly-updates`, update);
  },
};

export default projectService;
