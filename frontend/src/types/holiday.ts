export interface Holiday {
  id: string;
  date: string;       // "YYYY-MM-DD"
  name: string;
  type: "holiday" | "special";
  created_at: string;
  created_by: string;
}

export interface CreateHolidayDTO {
  date: string;
  name: string;
  type: "holiday" | "special";
}

export interface SaturdaySchedule {
  id: string;
  date: string;
  user_ids: string[];
  user_names: string[];
  note: string | null;
  created_at: string;
  created_by: string;
}

export interface CreateSaturdayDTO {
  date: string;
  user_ids: string[];
  note?: string | null;
}
