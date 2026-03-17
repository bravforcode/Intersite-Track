import api from "./api";
import type { User, Department, CreateUserDTO, UpdateUserDTO } from "../types";

export const userService = {
  getUsers: () => api.get<User[]>("/api/users"),
  getUser: (id: number) => api.get<User>(`/api/users/${id}`),
  createUser: (dto: CreateUserDTO) => api.post<{ id: number }>("/api/users", dto),
  updateUser: (id: number, dto: UpdateUserDTO) => api.put<void>(`/api/users/${id}`, dto),
  deleteUser: (id: number) => api.delete<void>(`/api/users/${id}`),
  getDepartments: () => api.get<Department[]>("/api/departments"),
  createDepartment: (name: string) => api.post<{ id: number }>("/api/departments", { name }),
  updateDepartment: (id: number, name: string) => api.put<void>(`/api/departments/${id}`, { name }),
  deleteDepartment: (id: number) => api.delete<void>(`/api/departments/${id}`),
};

export default userService;
