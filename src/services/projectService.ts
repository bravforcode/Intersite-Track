import { apiClient } from "./apiClient";
import { Project, ProjectMilestone, Blocker, ProjectWeeklyUpdate } from "../types/project";

export const projectService = {
  getProjects: async (filters?: any) => {
    const { data } = await apiClient.get<Project[]>("/projects", { params: filters });
    return data;
  },

  getProject: async (id: number) => {
    const { data } = await apiClient.get<Project>(`/projects/${id}`);
    return data;
  },

  createProject: async (project: Partial<Project>) => {
    const { data } = await apiClient.post<{ id: number }>("/projects", project);
    return data;
  },

  updateProject: async (id: number, project: Partial<Project>) => {
    const { data } = await apiClient.put(`/projects/${id}`, project);
    return data;
  },

  deleteProject: async (id: number) => {
    const { data } = await apiClient.delete(`/projects/${id}`);
    return data;
  },

  addMilestone: async (projectId: number, milestone: Partial<ProjectMilestone>) => {
    const { data } = await apiClient.post<{ id: number }>(`/projects/${projectId}/milestones`, milestone);
    return data;
  },

  updateMilestoneStatus: async (milestoneId: number, status: 'pending' | 'completed') => {
    const { data } = await apiClient.patch(`/projects/milestones/${milestoneId}`, { status });
    return data;
  },

  addBlocker: async (projectId: number, blocker: Partial<Blocker>) => {
    const { data } = await apiClient.post<{ id: number }>(`/projects/${projectId}/blockers`, blocker);
    return data;
  },

  resolveBlocker: async (blockerId: number) => {
    const { data } = await apiClient.patch(`/projects/blockers/${blockerId}/resolve`);
    return data;
  },

  addWeeklyUpdate: async (projectId: number, update: Partial<ProjectWeeklyUpdate>) => {
    const { data } = await apiClient.post<{ id: number }>(`/projects/${projectId}/weekly-updates`, update);
    return data;
  },
};
