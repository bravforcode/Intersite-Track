import test from "node:test";
import assert from "node:assert/strict";
import { businessCalendarService, Holiday } from "../services/businessCalendar.service.js";

// Mock holidays list for testing
const mockHolidays: Holiday[] = [
  { id: "1", date: "2026-04-13", name: "Songkran 1", type: "holiday", created_at: "", created_by: "" },
  { id: "2", date: "2026-04-14", name: "Songkran 2", type: "holiday", created_at: "", created_by: "" },
  { id: "3", date: "2026-04-15", name: "Songkran 3", type: "holiday", created_at: "", created_by: "" },
];

test("Business Calendar Service", async (t) => {
  // Initialize with mock holidays
  await businessCalendarService.ensureInitialized(mockHolidays);

  await t.test("isHoliday returns correct values", async () => {
    assert.equal(await businessCalendarService.isHoliday("2026-04-13"), true);
    assert.equal(await businessCalendarService.isHoliday("2026-04-14"), true);
    assert.equal(await businessCalendarService.isHoliday("2026-04-16"), false);
  });

  await t.test("isWeekend identifies weekends correctly", () => {
    // 2026-04-11 is a Saturday
    // 2026-04-12 is a Sunday
    // 2026-04-13 is a Monday
    assert.equal(businessCalendarService.isWeekend("2026-04-11"), true);
    assert.equal(businessCalendarService.isWeekend("2026-04-12"), true);
    assert.equal(businessCalendarService.isWeekend("2026-04-13"), false);
  });

  await t.test("isBusinessDay identifies actual working days", async () => {
    // 11-12 Weekend, 13-15 Holiday
    assert.equal(await businessCalendarService.isBusinessDay("2026-04-11"), false); // Saturday
    assert.equal(await businessCalendarService.isBusinessDay("2026-04-13"), false); // Holiday
    assert.equal(await businessCalendarService.isBusinessDay("2026-04-16"), true);  // Normal Thursday
  });

  await t.test("addBusinessDays calculation behaves accurately", async () => {
    // Start on Friday, 2026-04-10
    // +1 should be Thursday, 2026-04-16 because:
    // 11 is Sat, 12 is Sun, 13-15 are Holidays.
    const result1 = await businessCalendarService.addBusinessDays("2026-04-10", 1);
    assert.equal(result1, "2026-04-16");

    // +2 should be Friday, 2026-04-17
    const result2 = await businessCalendarService.addBusinessDays("2026-04-10", 2);
    assert.equal(result2, "2026-04-17");

    // +3 should be Monday, 2026-04-20
    const result3 = await businessCalendarService.addBusinessDays("2026-04-10", 3);
    assert.equal(result3, "2026-04-20");

    // Start on Holiday 2026-04-13
    // +1 should be 2026-04-16
    const result4 = await businessCalendarService.addBusinessDays("2026-04-13", 1);
    assert.equal(result4, "2026-04-16");

    // 0 days added should return the start date or push to next business day. 
    // In our implementation, if days=0 and it is on a weekend/holiday, it currently rolls to the next available business day.
    const result5 = await businessCalendarService.addBusinessDays("2026-04-12", 0); // Sunday -> Rolls through 13,14,15, stops at 16
    assert.equal(result5, "2026-04-16");
    
    // Normal day 0 added
    const result6 = await businessCalendarService.addBusinessDays("2026-04-10", 0); 
    assert.equal(result6, "2026-04-10");
  });

  await t.test("diffBusinessDays calculation behaves accurately", async () => {
    // 10th (Fri) to 16th (Thu, post holidays) -> diff should be 1
    const diff1 = await businessCalendarService.diffBusinessDays("2026-04-10", "2026-04-16");
    assert.equal(diff1, 1);

    // 10th to 17th -> diff should be 2
    const diff2 = await businessCalendarService.diffBusinessDays("2026-04-10", "2026-04-17");
    assert.equal(diff2, 2);

    // 10th to 20th(Mon) -> diff should be 3
    const diff3 = await businessCalendarService.diffBusinessDays("2026-04-10", "2026-04-20");
    assert.equal(diff3, 3);
  });
});
