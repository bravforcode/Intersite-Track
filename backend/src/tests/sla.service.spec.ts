import test from "node:test";
import assert from "node:assert";
import { businessCalendarService } from "../services/businessCalendar.service.js";
import { slaService } from "../services/sla.service.js";

test("SLA Service", async (t) => {
  // Clear any existing state and prep mock holidays
  await businessCalendarService.ensureInitialized([
    { id: "h1", date: "2025-04-14", name: "Songkran 1", type: "holiday", created_at: "", created_by: "" }, // Mon
    { id: "h2", date: "2025-04-15", name: "Songkran 2", type: "holiday", created_at: "", created_by: "" }, // Tue
  ]);

  await t.test("calculateInitialSLA generates correct default structure for 'medium' (5 days)", async () => {
    // 2025-04-10 = Thursday. 5 biz days = Fri(11), Skip(12-15), Wed(16), Thu(17), Fri(18), Skip(19,20), Mon(21)
    const { 
      sla_target_days, sla_deadline_date, sla_status, sla_alert_state 
    } = await slaService.calculateInitialSLA("2025-04-10T08:00:00Z", "medium");

    assert.strictEqual(sla_target_days, 5);
    assert.strictEqual(sla_deadline_date, "2025-04-21");
    assert.strictEqual(sla_status, "fine");
    assert.strictEqual(sla_alert_state, "none");
  });

  await t.test("calculateInitialSLA applies 'urgent' priority correctly (1 day)", async () => {
    // 2025-04-10 = Thursday. 1 biz day = Friday, April 11
    const { 
      sla_target_days, sla_deadline_date 
    } = await slaService.calculateInitialSLA("2025-04-10T08:00:00Z", "urgent");

    assert.strictEqual(sla_target_days, 1);
    assert.strictEqual(sla_deadline_date, "2025-04-11");
  });

  await t.test("recomputeForPriorityChange re-evaluates keeping original anchor", async () => {
    // Anchor: 2025-04-10. Wait, originally "medium" (5 days -> Apr 18).
    // Now change to "high" (2 days).
    const result = await slaService.recomputeForPriorityChange("2025-04-10T08:00:00Z", "high");
    assert.strictEqual(result.sla_target_days, 2);
    // 2025-04-10 (Thurs) + 2 biz days = Fri(11), Skip(12,13), Skip(14,15), Wed(16) -> April 16
    assert.strictEqual(result.sla_deadline_date, "2025-04-16");
  });

  await t.test("evaluateStatus detects 'fine' state", async () => {
    const r = await slaService.evaluateStatus("2025-04-10T08:00:00Z", "2025-04-18", "2025-04-11T09:00:00Z");
    assert.strictEqual(r.status, "fine");
    assert.strictEqual(r.elapsed_business_days, 1);
    assert.strictEqual(r.is_new_breach, false);
  });

  await t.test("evaluateStatus detects 'warning' state (1 business day left)", async () => {
    // Anchor 10th. Deadline 18th. Let's fast forward to April 17th (Thursday).
    // Only April 18th is left.
    const r = await slaService.evaluateStatus("2025-04-10T08:00:00Z", "2025-04-18", "2025-04-17T09:00:00Z");
    assert.strictEqual(r.status, "warning");
    // Elapsed days: 11(Fri), 16(Wed), 17(Thu) -> wait, anchor was 10.
    // 11(Fri), 16(Wed) -> diff 2 biz days between 10 and 17. Wait diff from 10 to 17:
    // 11(1), 16(2), 17(3). So 3 elapsed days.
    assert.strictEqual(r.elapsed_business_days, 3);
    assert.strictEqual(r.is_new_breach, false);
  });

  await t.test("evaluateStatus detects 'warning' state (0 business days left / on deadline date)", async () => {
    // Current date is the deadline date.
    const r = await slaService.evaluateStatus("2025-04-10T08:00:00Z", "2025-04-18", "2025-04-18T09:00:00Z");
    assert.strictEqual(r.status, "warning");
    assert.strictEqual(r.elapsed_business_days, 4); // 11, 16, 17, 18
  });

  await t.test("evaluateStatus detects 'breached' state", async () => {
    // Fast forward to April 19th (Saturday - weekend) - wait, if nowStr > deadlineStr, it's breached.
    // Or April 21 (Monday). Let's use 21st.
    const r = await slaService.evaluateStatus("2025-04-10T08:00:00Z", "2025-04-18", "2025-04-21T08:00:00Z");
    assert.strictEqual(r.status, "breached");
    assert.strictEqual(r.is_new_breach, true);
    // elapsed: 11, 16, 17, 18, 21 = 5
    assert.strictEqual(r.elapsed_business_days, 5);
  });
});
