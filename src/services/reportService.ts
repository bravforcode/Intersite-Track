import api from "./api";
import type { StaffReport } from "../types";

export const reportService = {
  getStaffReport: () => api.get<StaffReport[]>("/api/reports/by-staff"),

  getDateRangeReport: (start: string, end: string) =>
    api.get<Record<string, unknown>[]>(`/api/reports/by-date-range?start=${start}&end=${end}`),
};

export default reportService;
