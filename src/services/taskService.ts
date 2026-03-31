import api from "./api";
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

  getTask: (id: number) => api.get<Task>(`/api/tasks/${id}`),

  getWorkspace: (filters?: TaskFilters) =>
    api.get<TaskWorkspace>(`/api/tasks/workspace${buildQuery(filters ?? {})}`),

  createTask: (dto: CreateTaskDTO) => api.post<{ id: number }>("/api/tasks", dto),

  updateTask: (id: number, dto: UpdateTaskDTO) => api.put<void>(`/api/tasks/${id}`, dto),

  deleteTask: (id: number) => api.delete<void>(`/api/tasks/${id}`),

  updateStatus: (id: number, status: string, progress?: number) =>
    api.patch<void>(`/api/tasks/${id}/status`, { status, ...(progress !== undefined && { progress }) }),

  getUpdates: (taskId: number) => api.get<TaskUpdate[]>(`/api/tasks/${taskId}/updates`),

  addUpdate: (taskId: number, data: { user_id: number; update_text: string; progress: number; attachment_url?: string }) =>
    api.post<void>(`/api/tasks/${taskId}/updates`, data),

  getComments: (taskId: number) => api.get<TaskComment[]>(`/api/tasks/${taskId}/comments`),

  addComment: (taskId: number, message: string) =>
    api.post<TaskComment>(`/api/tasks/${taskId}/comments`, { message }),

  getActivity: (taskId: number) => api.get<TaskActivity[]>(`/api/tasks/${taskId}/activity`),

  getChecklists: (taskId: number) => api.get<TaskChecklistRow[]>(`/api/tasks/${taskId}/checklists`),

  saveChecklists: (taskId: number, items: ChecklistItem[]) =>
    api.post<{ success: boolean; progress: number }>(`/api/tasks/${taskId}/checklists`, { items }),

  toggleChecklist: (taskId: number, checklistId: number) =>
    api.patch<{ success: boolean; progress: number; status: string }>(`/api/tasks/${taskId}/checklists/${checklistId}/toggle`),

  getStats: () => api.get<Stats>("/api/stats"),

  uploadImage: async (file: File): Promise<string> => {
    const token = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!).token
      : null;
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
