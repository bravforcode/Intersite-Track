// frontend/src/services/kpiService.ts

import api from "./api";
import type { KPI, KPIStats, CreateKPIInput, UpdateKPIInput } from "../types";

const BASE = "/api/kpis";

export const kpiService = {
  /** List all KPIs with optional filters */
  async list(filters: { owner_id?: string; type?: string; status?: string } = {}): Promise<KPI[]> {
    const params = new URLSearchParams();
    if (filters.owner_id) params.set("owner_id", filters.owner_id);
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return await api.get<KPI[]>(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  /** Get aggregate stats */
  async getStats(): Promise<KPIStats> {
    return await api.get<KPIStats>(`${BASE}/stats`);
  },

  /** Get a single KPI by ID */
  async getById(id: string): Promise<KPI> {
    return await api.get<KPI>(`${BASE}/${id}`);
  },

  /** Create a new KPI/OKR */
  async create(input: CreateKPIInput): Promise<KPI> {
    return await api.post<KPI>(BASE, input);
  },

  /** Update an existing KPI/OKR */
  async update(id: string, input: UpdateKPIInput): Promise<KPI> {
    return await api.put<KPI>(`${BASE}/${id}`, input);
  },

  /** Delete a KPI/OKR */
  async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
