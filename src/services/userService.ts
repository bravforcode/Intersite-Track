import api from "./api";
import type { User, Department, CreateUserDTO, UpdateUserDTO } from "../types";

export interface LineLinkStatus {
  is_linked: boolean;
  line_user_id: string | null;
  pending_code: string | null;
  expires_at: string | null;
}

export const userService = {
  getUsers: () => api.get<User[]>("/api/users"),
  getUser: (id: string) => api.get<User>(`/api/users/${id}`),
  createUser: (dto: CreateUserDTO) => api.post<{ id: string }>("/api/users", dto),
  updateUser: (id: string, dto: UpdateUserDTO) => api.put<void>(`/api/users/${id}`, dto),
  updateMyProfile: (dto: Pick<User, "username" | "first_name" | "last_name" | "position" | "line_user_id">) =>
    api.put<User>("/api/auth/me", dto),
  getMyLineLinkStatus: () => api.get<LineLinkStatus>("/api/auth/me/line-link/status"),
  requestMyLineLink: () => api.post<LineLinkStatus>("/api/auth/me/line-link/request", {}),
  unlinkMyLine: () => api.delete<{ success: true }>("/api/auth/me/line-link"),
  resetPassword: (id: string, newPassword: string) =>
    api.put<void>(`/api/users/${id}/password`, { new_password: newPassword }),
  deleteUser: (id: string) => api.delete<void>(`/api/users/${id}`),
  getDepartments: () => api.get<Department[]>("/api/departments"),
  createDepartment: (name: string) => api.post<{ id: string }>("/api/departments", { name }),
  updateDepartment: (id: string, name: string) => api.put<void>(`/api/departments/${id}`, { name }),
  deleteDepartment: (id: string) => api.delete<void>(`/api/departments/${id}`),
};

export default userService;
