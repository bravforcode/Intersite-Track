import api from "./api";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../types/holiday";

export const saturdayService = {
  async getSchedules(year?: number, month?: number): Promise<SaturdaySchedule[]> {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (month) params.set("month", String(month));
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<SaturdaySchedule[]>(`/api/saturday-schedules${query}`);
  },

  async createSchedule(dto: CreateSaturdayDTO): Promise<{ id: string }> {
    return api.post<{ id: string }>("/api/saturday-schedules", dto);
  },

  async updateSchedule(id: string, dto: Partial<CreateSaturdayDTO>): Promise<void> {
    return api.put<void>(`/api/saturday-schedules/${id}`, dto);
  },

  async deleteSchedule(id: string): Promise<void> {
    return api.delete<void>(`/api/saturday-schedules/${id}`);
  },

  async joinSchedule(id: string): Promise<void> {
    return api.post<void>(`/api/saturday-schedules/${id}/join`, {});
  },

  async importSchedules(schedules: CreateSaturdayDTO[]): Promise<{ imported: number }> {
    return api.post<{ imported: number }>("/api/saturday-schedules/import", { schedules });
  },
};
