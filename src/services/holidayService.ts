import api from "./api";
import type { Holiday, CreateHolidayDTO } from "../types/holiday";

export const holidayService = {
  async getHolidays(year?: string, month?: string): Promise<Holiday[]> {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<Holiday[]>(`/api/holidays${query}`);
  },

  async createHoliday(dto: CreateHolidayDTO): Promise<{ id: string }> {
    return api.post<{ id: string }>("/api/holidays", dto);
  },

  async updateHoliday(id: string, dto: Partial<CreateHolidayDTO>): Promise<void> {
    return api.put<void>(`/api/holidays/${id}`, dto);
  },

  async deleteHoliday(id: string): Promise<void> {
    return api.delete<void>(`/api/holidays/${id}`);
  },
};
