export type DailyStatusReference = "today" | "tomorrow";

const THAI_WEEKDAYS = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
] as const;

export interface OperationalDayStatusInput {
  date: string;
  holidayName?: string | null;
  hasSaturdayDuty?: boolean;
}

export interface OperationalDayStatus {
  date: string;
  weekdayName: string;
  formattedDate: string;
  isWorkday: boolean;
  statusLabel: "วันทำงาน" | "วันหยุด";
  detail: string | null;
}

function parseIsoDate(dateStr: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid ISO date: ${dateStr}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function toUtcNoon(dateStr: string): Date {
  const { year, month, day } = parseIsoDate(dateStr);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function getDayOfWeek(dateStr: string): number {
  return toUtcNoon(dateStr).getUTCDay();
}

export function getThaiWeekday(dateStr: string): string {
  return THAI_WEEKDAYS[getDayOfWeek(dateStr)] ?? "";
}

export function formatThaiDate(dateStr: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(toUtcNoon(dateStr));
}

export function classifyOperationalDay(input: OperationalDayStatusInput): OperationalDayStatus {
  const { date, holidayName = null, hasSaturdayDuty = false } = input;
  const weekday = getDayOfWeek(date);
  const weekdayName = getThaiWeekday(date);
  const formattedDate = formatThaiDate(date);

  if (holidayName) {
    return {
      date,
      weekdayName,
      formattedDate,
      isWorkday: false,
      statusLabel: "วันหยุด",
      detail: holidayName,
    };
  }

  if (weekday === 0) {
    return {
      date,
      weekdayName,
      formattedDate,
      isWorkday: false,
      statusLabel: "วันหยุด",
      detail: null,
    };
  }

  if (weekday === 6) {
    return {
      date,
      weekdayName,
      formattedDate,
      isWorkday: hasSaturdayDuty,
      statusLabel: hasSaturdayDuty ? "วันทำงาน" : "วันหยุด",
      detail: hasSaturdayDuty ? "คุณมีเวรวันเสาร์" : null,
    };
  }

  return {
    date,
    weekdayName,
    formattedDate,
    isWorkday: true,
    statusLabel: "วันทำงาน",
    detail: null,
  };
}

export function buildDailyStatusMessage(reference: DailyStatusReference, status: OperationalDayStatus): string {
  const referenceLabel = reference === "today" ? "วันนี้" : "พรุ่งนี้";
  const lines = [
    `📅 แจ้งเตือน${referenceLabel}`,
    "",
    `${referenceLabel}: ${status.weekdayName}ที่ ${status.formattedDate}`,
    `สถานะ: ${status.statusLabel}`,
  ];

  if (status.detail) {
    lines.push(`รายละเอียด: ${status.detail}`);
  }

  return lines.join("\n");
}
