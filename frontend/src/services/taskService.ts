import api from "./api";
import { authService } from "./authService";
import type {
  Task,
  TaskUpdate,
  TaskComment,
  TaskActivity,
  TaskChecklistRow,
  ChecklistItem,
  CreateTaskDTO,
  UpdateTaskDTO,
  Stats,
  TaskWorkspace,
} from "../types";
import type { Blocker } from "../types/project";

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
}

function buildQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const taskService = {
  getTasks: (filters?: TaskFilters) =>
    api.get<Task[]>(`/api/tasks${buildQuery(filters ?? {})}`),

  getTask: (id: string) => api.get<Task>(`/api/tasks/${id}`),

  getWorkspace: (filters?: TaskFilters) =>
    api.get<TaskWorkspace>(`/api/tasks/workspace${buildQuery(filters ?? {})}`),

  createTask: (dto: CreateTaskDTO) => api.post<{ id: string }>("/api/tasks", dto),

  updateTask: (id: string, dto: UpdateTaskDTO) => api.put<void>(`/api/tasks/${id}`, dto),

  deleteTask: (id: string) => api.delete<void>(`/api/tasks/${id}`),

  updateStatus: (id: string, status: string, progress?: number) =>
    api.patch<void>(`/api/tasks/${id}/status`, { status, ...(progress !== undefined && { progress }) }),

  getUpdates: (taskId: string) => api.get<TaskUpdate[]>(`/api/tasks/${taskId}/updates`),

  addUpdate: (taskId: string, data: { user_id: string; update_text: string; progress: number; attachment_url?: string }) =>
    api.post<void>(`/api/tasks/${taskId}/updates`, data),

  getComments: (taskId: string) => api.get<TaskComment[]>(`/api/tasks/${taskId}/comments`),

  addComment: (taskId: string, message: string) =>
    api.post<TaskComment>(`/api/tasks/${taskId}/comments`, { message }),

  getActivity: (taskId: string) => api.get<TaskActivity[]>(`/api/tasks/${taskId}/activity`),

  getGlobalActivity: (limit: number = 50) =>
    api.get<TaskActivity[]>(`/api/tasks/global/activity?limit=${limit}`),

  getChecklists: (taskId: string) => api.get<TaskChecklistRow[]>(`/api/tasks/${taskId}/checklists`),

  getBlockers: (taskId: string) => api.get<Blocker[]>(`/api/tasks/${taskId}/blockers`),

  saveChecklists: (taskId: string, items: ChecklistItem[]) =>
    api.post<{ success: boolean; progress: number }>(`/api/tasks/${taskId}/checklists`, { items }),

  toggleChecklist: (taskId: string, checklistId: string) =>
    api.patch<{ success: boolean; progress: number; status: string }>(`/api/tasks/${taskId}/checklists/${checklistId}/toggle`),

  getStats: () => api.get<Stats>("/api/stats"),

  uploadImage: async (file: File): Promise<string> => {
    const token = await authService.getToken();
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/tasks/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
    const data = await res.json();
    return data.url;
  },
};

export default taskService;
