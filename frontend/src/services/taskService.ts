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

type TaskListResponse = Task[] | { data?: Task[] };
type TaskWorkspaceResponse =
  | TaskWorkspace
  | {
      data?: Task[];
      users?: TaskWorkspace["users"];
      taskTypes?: TaskWorkspace["taskTypes"];
    };

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

function normalizeTaskList(response: TaskListResponse): Task[] {
  if (Array.isArray(response)) return response;
  return Array.isArray(response.data) ? response.data : [];
}

function normalizeTaskWorkspace(response: TaskWorkspaceResponse): TaskWorkspace {
  if ("tasks" in response && Array.isArray(response.tasks)) {
    return response;
  }

  const paginatedResponse = response as {
    data?: Task[];
    users?: TaskWorkspace["users"];
    taskTypes?: TaskWorkspace["taskTypes"];
  };

  return {
    tasks: Array.isArray(paginatedResponse.data) ? paginatedResponse.data : [],
    users: Array.isArray(paginatedResponse.users) ? paginatedResponse.users : [],
    taskTypes: Array.isArray(paginatedResponse.taskTypes) ? paginatedResponse.taskTypes : [],
  };
}

export const taskService = {
  getTasks: async (filters?: TaskFilters) =>
    normalizeTaskList(await api.get<TaskListResponse>(`/api/tasks${buildQuery(filters ?? {})}`)),

  getTask: (id: string) => api.get<Task>(`/api/tasks/${id}`),

  getWorkspace: async (filters?: TaskFilters) =>
    normalizeTaskWorkspace(
      await api.get<TaskWorkspaceResponse>(`/api/tasks/workspace${buildQuery(filters ?? {})}`)
    ),

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

  uploadImage: async (taskId: string, file: File): Promise<string> => {
    const token = await authService.getToken();
    const csrfResponse = await fetch("/api/csrf-token", {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    const csrfPayload = await csrfResponse.json().catch(() => ({}));
    const csrfToken = csrfResponse.headers.get("X-CSRF-Token") ?? csrfPayload.csrfToken;

    if (!csrfResponse.ok || !csrfToken) {
      throw new Error("ไม่สามารถเริ่มเซสชันความปลอดภัยสำหรับการอัปโหลดไฟล์ได้");
    }

    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`/api/tasks/${taskId}/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-csrf-token": csrfToken,
      },
      body: formData,
      credentials: "include",
    });
    if (!res.ok) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
    const data = await res.json();
    return data.download_url;
  },
};

export default taskService;
