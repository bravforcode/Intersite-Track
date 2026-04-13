import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDailyStatusMessage,
  classifyOperationalDay,
  formatThaiDate,
  getThaiWeekday,
} from "../../backend/src/utils/dayStatus.ts";

test("formats thai date and weekday from ISO date without timezone drift", () => {
  assert.equal(getThaiWeekday("2026-04-11"), "วันเสาร์");
  assert.match(formatThaiDate("2026-04-11"), /11 เมษายน 2569/);
});

test("treats saturday duty as workday for assigned users", () => {
  const status = classifyOperationalDay({
    date: "2026-04-11",
    hasSaturdayDuty: true,
  });

  assert.equal(status.isWorkday, true);
  assert.equal(status.statusLabel, "วันทำงาน");
  assert.equal(status.detail, "คุณมีเวรวันเสาร์");
});

test("treats sunday without holiday record as holiday", () => {
  const status = classifyOperationalDay({
    date: "2026-04-12",
  });

  assert.equal(status.isWorkday, false);
  assert.equal(status.statusLabel, "วันหยุด");
  assert.equal(status.detail, null);
});

test("holiday record overrides normal workday status in notification message", () => {
  const status = classifyOperationalDay({
    date: "2026-04-13",
    holidayName: "วันสงกรานต์",
    hasSaturdayDuty: true,
  });

  const message = buildDailyStatusMessage("tomorrow", status);

  assert.equal(status.isWorkday, false);
  assert.equal(status.statusLabel, "วันหยุด");
  assert.match(message, /พรุ่งนี้: วันจันทร์ที่ 13 เมษายน 2569/);
  assert.match(message, /สถานะ: วันหยุด/);
  assert.match(message, /รายละเอียด: วันสงกรานต์/);
});
