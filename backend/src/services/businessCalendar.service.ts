// Local definition to avoid top-level import of firebase queries
export interface Holiday {
  id: string;
  date: string;         // "YYYY-MM-DD"
  name: string;
  type: "holiday" | "special";
  created_at: string;
  created_by: string;
}

/**
 * Service for calculating business days and operational dates.
 * Follows Global Skip Saturday/Sunday/Holiday logic for Phase 2E SLA Rules.
 */
class BusinessCalendarService {
  private holidaysMap: Map<string, Holiday> = new Map();
  private isInitialized = false;
  private lastFetched = 0;
  // Cache valid for 1 hour to reduce DB hits
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; 

  /**
   * Caches holidays from DB if not already initialized or cache expired.
   * Can be injected with custom holidays for testing.
   */
  public async ensureInitialized(mockHolidays?: Holiday[]): Promise<void> {
    if (mockHolidays) {
      this.holidaysMap.clear();
      for (const h of mockHolidays) {
        if (h.type === "holiday" || h.type === "special") {
          this.holidaysMap.set(h.date, h);
        }
      }
      this.isInitialized = true;
      this.lastFetched = Date.now();
      return;
    }

    if (!this.isInitialized || Date.now() - this.lastFetched > this.CACHE_TTL_MS) {
      await this.reloadHolidays();
    }
  }

  public async reloadHolidays(): Promise<void> {
    try {
      const { findAllHolidays } = await import("../database/queries/holiday.queries.js");
      const holidays = await findAllHolidays();
      this.holidaysMap.clear();
      for (const h of holidays) {
        if (h.type === "holiday" || h.type === "special") {
          this.holidaysMap.set(h.date, h);
        }
      }
      this.isInitialized = true;
      this.lastFetched = Date.now();
    } catch (error) {
      console.error("[BusinessCalendar] Failed to load holidays:", error);
      // In production, we should probably still let the system run without throwing if DB is temporarily down,
      // but log an alert. The map will remain as it was or empty.
    }
  }

  /**
   * Normalizes a date or datetime string to a YYYY-MM-DD string timezone-safe (Asia/Bangkok concept).
   * Note: Assuming input is either YYYY-MM-DD or standard ISO format.
   */
  public normalizeDateString(dateStr: string): string {
    return dateStr.substring(0, 10);
  }

  public async isHoliday(dateStr: string): Promise<boolean> {
    await this.ensureInitialized();
    const normalized = this.normalizeDateString(dateStr);
    return this.holidaysMap.has(normalized);
  }

  /**
   * Returns true if the date is a Saturday (6) or Sunday (0).
   */
  public isWeekend(dateStr: string): boolean {
    const normalized = this.normalizeDateString(dateStr);
    const d = new Date(`${normalized}T12:00:00Z`);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  }

  /**
   * Returns true if the date is a standard working day (not weekend, not holiday).
   */
  public async isBusinessDay(dateStr: string): Promise<boolean> {
    if (this.isWeekend(dateStr)) return false;
    if (await this.isHoliday(dateStr)) return false;
    return true;
  }

  /**
   * Adds `daysToAdd` business days to the `startDate`.
   * e.g., if target is 1 business day, and today is Friday, it returns Monday.
   */
  public async addBusinessDays(startDateStr: string, daysToAdd: number): Promise<string> {
    await this.ensureInitialized();
    const normalizedStart = this.normalizeDateString(startDateStr);
    
    // Use noon UTC to avoid daylight saving or timezone edge cases during day additions
    const current = new Date(`${normalizedStart}T12:00:00Z`);
    let added = 0;
    
    // If we require 0 days target, just ensure the start day itself is valid or roll to next valid day
    if (daysToAdd <= 0) {
      let dateStr = current.toISOString().substring(0, 10);
      while (this.isWeekend(dateStr) || this.holidaysMap.has(dateStr)) {
        current.setUTCDate(current.getUTCDate() + 1);
        dateStr = current.toISOString().substring(0, 10);
      }
      return dateStr;
    }

    while (added < daysToAdd) {
      current.setUTCDate(current.getUTCDate() + 1);
      const dateStr = current.toISOString().substring(0, 10);
      
      const dayOfWeek = current.getUTCDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
      const isHol = this.holidaysMap.has(dateStr);
      
      if (!isWknd && !isHol) {
        added++;
      }
    }
    
    return current.toISOString().substring(0, 10);
  }

  /**
   * Counts how many business days have elapsed between startDate and endDate.
   */
  public async diffBusinessDays(startDateStr: string, endDateStr: string): Promise<number> {
    await this.ensureInitialized();
    const startObj = new Date(`${this.normalizeDateString(startDateStr)}T12:00:00Z`);
    const endObj = new Date(`${this.normalizeDateString(endDateStr)}T12:00:00Z`);
    
    if (endObj < startObj) {
      return 0; // Return absolute 0 if end is before start
    }

    let diff = 0;
    const current = new Date(startObj);

    // Continue until current hits end date
    while (current.toISOString().substring(0, 10) < endObj.toISOString().substring(0, 10)) {
      current.setUTCDate(current.getUTCDate() + 1);
      const dateStr = current.toISOString().substring(0, 10);
      
      const dayOfWeek = current.getUTCDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
      const isHol = this.holidaysMap.has(dateStr);
      
      if (!isWknd && !isHol) {
        diff++;
      }
    }
    
    return diff;
  }
}

export const businessCalendarService = new BusinessCalendarService();
