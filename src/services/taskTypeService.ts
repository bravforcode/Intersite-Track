import api from "./api";
import type { TaskType } from "../types";

export const taskTypeService = {
  getTaskTypes: () => api.get<TaskType[]>("/api/task-types"),
  createTaskType: (name: string) => api.post<{ id: string }>("/api/task-types", { name }),
  updateTaskType: (id: string, name: string) => api.put<void>(`/api/task-types/${id}`, { name }),
  deleteTaskType: (id: string) => api.delete<void>(`/api/task-types/${id}`),
};

export default taskTypeService;
