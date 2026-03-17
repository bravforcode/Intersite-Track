import api from "./api";
import type { Task, TaskUpdate, ChecklistItem, CreateTaskDTO, UpdateTaskDTO, Stats } from "../types";

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  date_from?: string;
  date_to?: string;
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

  getTask: (id: number) => api.get<Task>(`/api/tasks/${id}`),

  createTask: (dto: CreateTaskDTO) => api.post<{ id: number }>("/api/tasks", dto),

  updateTask: (id: number, dto: UpdateTaskDTO) => api.put<void>(`/api/tasks/${id}`, dto),

  deleteTask: (id: number) => api.delete<void>(`/api/tasks/${id}`),

  updateStatus: (id: number, status: string, progress: number) =>
    api.patch<void>(`/api/tasks/${id}/status`, { status, progress }),

  getUpdates: (taskId: number) => api.get<TaskUpdate[]>(`/api/tasks/${taskId}/updates`),

  addUpdate: (taskId: number, data: { user_id: number; update_text: string; progress: number; attachment_url?: string }) =>
    api.post<void>(`/api/tasks/${taskId}/updates`, data),

  getChecklists: (taskId: number) => api.get<ChecklistItem[]>(`/api/tasks/${taskId}/checklists`),

  saveChecklists: (taskId: number, items: ChecklistItem[]) =>
    api.post<{ success: boolean; progress: number }>(`/api/tasks/${taskId}/checklists`, { items }),

  toggleChecklist: (id: number) => api.patch<void>(`/api/checklists/${id}/toggle`),

  getStats: () => api.get<Stats>("/api/stats"),

  uploadImage: async (file: File): Promise<string> => {
    const token = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!).token
      : null;
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload", {
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
