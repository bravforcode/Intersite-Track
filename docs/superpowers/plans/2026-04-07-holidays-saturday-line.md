# Holidays, Saturday Duty & LINE Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มหน้าวันหยุดประจำปี + ตารางเวรเสาร์ + LINE notifications + แก้ LINE bot เข้า group ได้ + Word tutorial

**Architecture:** Firebase Firestore เป็น database หลัก, Express backend + React frontend ตาม pattern เดิม, Cron job ใน server/cron.ts, LINE Webhook รับ Group ID อัตโนมัติ

**Tech Stack:** TypeScript, React 19, Express, Firebase Admin SDK, Firestore, LINE Messaging API, multer (Excel import), date-fns, lucide-react, motion/react, python-docx

---

## File Map

### New Files (Backend)
- `server/controllers/holiday.controller.ts` — CRUD holidays + LINE webhook
- `server/controllers/saturdaySchedule.controller.ts` — CRUD saturday schedules + import
- `server/controllers/lineWebhook.controller.ts` — receive LINE webhook events, save group ID
- `server/database/queries/holiday.queries.ts` — Firestore queries for holidays
- `server/database/queries/saturdaySchedule.queries.ts` — Firestore queries for saturday_schedules
- `server/database/queries/appSettings.queries.ts` — Firestore queries for app_settings (group ID)
- `server/routes/holiday.routes.ts` — route definitions
- `server/routes/saturdaySchedule.routes.ts` — route definitions
- `server/routes/lineWebhook.routes.ts` — POST /api/line/webhook (no auth — LINE signs with channel secret)

### New Files (Frontend)
- `src/components/holidays/HolidaysPage.tsx` — main page
- `src/components/holidays/HolidayFormModal.tsx` — add/edit modal
- `src/components/saturday/SaturdaySchedulePage.tsx` — main page
- `src/components/saturday/SaturdayFormModal.tsx` — add/edit modal
- `src/components/saturday/SaturdayImportModal.tsx` — import Excel modal
- `src/components/dashboard/HolidayWidget.tsx` — next holiday widget
- `src/components/dashboard/SaturdayWidget.tsx` — this week's duty widget
- `src/services/holidayService.ts` — API calls
- `src/services/saturdayService.ts` — API calls
- `src/types/holiday.ts` — TypeScript interfaces

### Modified Files
- `server/routes/index.ts` — add 3 new route imports
- `server/cron.ts` — add holiday + saturday cron jobs
- `server/services/line.service.ts` — add notifyHoliday, notifySaturdayDuty methods
- `src/App.tsx` — add 2 new tabs + lazy imports + route rendering
- `src/components/dashboard/DashboardPage.tsx` — add HolidayWidget + SaturdayWidget
- `scripts/generate-firebase-doc.py` — expand tutorial content

---

## Task 1: LINE Webhook — รับ Group ID อัตโนมัติ

**Goal:** เมื่อ bot ถูกเพิ่มเข้า group → บันทึก Group ID ลง Firestore

**Files:**
- Create: `server/database/queries/appSettings.queries.ts`
- Create: `server/controllers/lineWebhook.controller.ts`
- Create: `server/routes/lineWebhook.routes.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: สร้าง appSettings queries**

สร้างไฟล์ `server/database/queries/appSettings.queries.ts`:

```typescript
import { db, Timestamp } from "../../config/firebase-admin.js";

export async function getLineGroupId(): Promise<string | null> {
  const doc = await db.collection("app_settings").doc("line_config").get();
  if (!doc.exists) return null;
  return doc.data()?.group_id ?? null;
}

export async function saveLineGroupId(groupId: string): Promise<void> {
  await db.collection("app_settings").doc("line_config").set({
    group_id: groupId,
    updated_at: Timestamp.now(),
  }, { merge: true });
}
```

- [ ] **Step 2: สร้าง LINE webhook controller**

สร้างไฟล์ `server/controllers/lineWebhook.controller.ts`:

```typescript
import { Request, Response } from "express";
import { saveLineGroupId, getLineGroupId } from "../database/queries/appSettings.queries.js";
import { logger } from "../utils/logger.js";

export async function handleLineWebhook(req: Request, res: Response): Promise<void> {
  // LINE ต้องการ 200 response ทันที
  res.status(200).json({ status: "ok" });

  const events = req.body?.events ?? [];

  for (const event of events) {
    // Bot ถูกเพิ่มเข้า group
    if (event.type === "join" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      await saveLineGroupId(groupId);
      logger.info(`LINE Group ID saved: ${groupId}`);
    }

    // Bot ได้รับ message ใน group — บันทึก group ID ด้วยเผื่อไม่ได้ join event
    if (event.type === "message" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      const existing = await getLineGroupId();
      if (!existing) {
        await saveLineGroupId(groupId);
        logger.info(`LINE Group ID saved from message: ${groupId}`);
      }
    }
  }
}
```

- [ ] **Step 3: สร้าง webhook route (ไม่ต้องการ auth — LINE ส่งมาโดยตรง)**

สร้างไฟล์ `server/routes/lineWebhook.routes.ts`:

```typescript
import { Router } from "express";
import { handleLineWebhook } from "../controllers/lineWebhook.controller.js";

const router = Router();

// LINE Messaging API webhook — no auth middleware (LINE signs with channel secret)
router.post("/webhook", handleLineWebhook);

export default router;
```

- [ ] **Step 4: ลงทะเบียน route ใน index.ts**

แก้ไข `server/routes/index.ts` เพิ่ม:

```typescript
import lineWebhookRoutes from "./lineWebhook.routes.js";
// ... existing imports ...

router.use("/line", lineWebhookRoutes);
```

- [ ] **Step 5: update LINE service ให้ดึง group ID จาก Firestore แบบ dynamic**

แก้ไข `server/services/line.service.ts` — เปลี่ยน `LINE_GROUP_ID` จาก env เป็นดึงจาก Firestore:

```typescript
import axios from "axios";
import axiosRetry from "axios-retry";
import { logger } from "../utils/logger.js";
import { getLineGroupId } from "../database/queries/appSettings.queries.js";

// @ts-ignore
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

async function pushMessage(to: string, message: string): Promise<boolean> {
  if (!LINE_TOKEN || !to) return false;
  try {
    await axios.post(
      LINE_MESSAGING_API,
      { to, messages: [{ type: "text", text: message }] },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` } }
    );
    logger.info(`LINE message sent to ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to send LINE message to ${to}: ${error.response?.data || error.message}`);
    return false;
  }
}

export const lineService = {
  async sendMessage(to: string, message: string): Promise<boolean> {
    return pushMessage(to, message);
  },

  async sendToUserAndGroup(userId: string, message: string): Promise<void> {
    const targets: Promise<boolean>[] = [pushMessage(userId, message)];
    const groupId = await getLineGroupId();
    if (groupId) targets.push(pushMessage(groupId, message));
    await Promise.allSettled(targets);
  },

  async sendToGroup(message: string): Promise<boolean> {
    const groupId = await getLineGroupId();
    if (!groupId) return false;
    return pushMessage(groupId, message);
  },

  async notifyAdmin(message: string): Promise<boolean> {
    if (!LINE_ADMIN_USER_ID) return false;
    return pushMessage(LINE_ADMIN_USER_ID, message);
  },

  async notifyNewTask(to: string, taskTitle: string, projectName?: string): Promise<boolean> {
    const projectInfo = projectName ? `ในโปรเจกต์: ${projectName}` : "";
    const msg = `🔔 มีงานใหม่มอบหมายถึงคุณ!\n\nชื่องาน: ${taskTitle}\n${projectInfo}\n\nกรุณาเข้าตรวจสอบในระบบ Intersite Track`;
    await this.sendToUserAndGroup(to, msg);
    return true;
  },

  async notifyBlocker(to: string, taskTitle: string, description: string): Promise<boolean> {
    const msg = `⚠️ แจ้งเตือนงานติดปัญหา (Blocker)!\n\nงาน: ${taskTitle}\nปัญหา: ${description}\n\nกรุณาเร่งดำเนินการแก้ไขหรือตรวจสอบ`;
    await this.sendToUserAndGroup(to, msg);
    return true;
  },

  async notifyUpcomingDeadline(to: string, taskTitle: string, dueDate: string, daysLeft: number): Promise<boolean> {
    const msg = `⏰ แจ้งเตือนกำหนดส่งงาน!\n\nงาน: ${taskTitle}\nกำหนดส่ง: ${dueDate}\n(เหลือเวลาอีก ${daysLeft} วัน)\n\nกรุณาเร่งดำเนินการให้เสร็จสิ้นตามกำหนด`;
    await this.sendToUserAndGroup(to, msg);
    return true;
  },

  async notifyHolidayPersonal(to: string, holidayName: string, date: string, type: "tomorrow" | "today" | "weekly_summary", holidayList?: string[]): Promise<boolean> {
    let msg = "";
    if (type === "tomorrow") {
      msg = `🎉 พรุ่งนี้วันหยุด!\n\n${holidayName}\nวันที่: ${date}\n\nขอให้พักผ่อนอย่างมีความสุขนะครับ 😊`;
    } else if (type === "today") {
      msg = `🌟 วันนี้วันหยุด!\n\n${holidayName}\n\nขอให้มีความสุขกับวันหยุดนะครับ 🎊`;
    } else if (type === "weekly_summary") {
      msg = `📅 สรุปวันหยุดสัปดาห์นี้:\n\n${holidayList?.join("\n") ?? "ไม่มีวันหยุด"}\n\nทำงานดีๆ นะครับ 💪`;
    }
    return pushMessage(to, msg);
  },

  async notifySaturdayDutyPersonal(to: string, date: string): Promise<boolean> {
    const msg = `📋 เวรทำงานวันเสาร์!\n\nคุณมีเวรทำงานวันเสาร์ที่ ${date}\nกรุณามาทำงานตามเวลาที่กำหนด ✅`;
    return pushMessage(to, msg);
  },

  async notifySaturdayDutyGroup(date: string, names: string[]): Promise<boolean> {
    const nameList = names.join(", ");
    const msg = `📢 เวรทำงานวันเสาร์ที่ ${date}\n\nผู้มีเวร: ${nameList}\n\nขอให้ทำงานอย่างมีความสุขครับ 💪`;
    return this.sendToGroup(msg);
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add server/database/queries/appSettings.queries.ts server/controllers/lineWebhook.controller.ts server/routes/lineWebhook.routes.ts server/routes/index.ts server/services/line.service.ts
git commit -m "feat: LINE webhook to auto-save group ID from Firestore"
```

---

## Task 2: เปิด LINE Bot Join Group + ตั้งค่า Webhook URL

**Goal:** ให้ bot เข้า group ได้และรับ webhook events

- [ ] **Step 1: เปิด "Allow bot to join group chats"**

ไปที่ LINE Developers Console → เลือก Channel → Messaging API tab → **"Allow bot to join group chats"** → กด **Edit** → เปลี่ยนเป็น **Enabled**

- [ ] **Step 2: ตั้งค่า Webhook URL**

**สำหรับ Development (ใช้ ngrok):**

```bash
# ติดตั้ง ngrok (ถ้ายังไม่มี)
# https://ngrok.com/download

# รัน ngrok (port ต้องตรงกับ server port 3694)
ngrok http 3694
```

copy HTTPS URL ที่ได้ (เช่น `https://abc123.ngrok.io`) → ไป LINE Developers Console → Messaging API tab → **Webhook URL** → ใส่ `https://abc123.ngrok.io/api/line/webhook` → กด **Update** → กด **Verify**

- [ ] **Step 3: เพิ่ม bot เข้า LINE Group**

1. เปิด LINE → สร้าง group ใหม่ (เช่น "TaskAm Notifications")
2. เพิ่ม bot `@441sptre` เข้า group
3. ดู server logs → ควรเห็น `LINE Group ID saved: Cxxxxxxx`
4. หรือส่ง message ใดๆ ใน group → bot จะบันทึก group ID

- [ ] **Step 4: ทดสอบด้วย curl**

```bash
# ตรวจสอบว่า Group ID บันทึกแล้ว
curl -X GET http://localhost:3694/api/settings/line-group \
  -H "Authorization: Bearer YOUR_TOKEN"
```

> หมายเหตุ: endpoint นี้จะสร้างใน Task 3

---

## Task 3: Holidays Backend — Firestore Queries + API

**Files:**
- Create: `server/database/queries/holiday.queries.ts`
- Create: `server/controllers/holiday.controller.ts`
- Create: `server/routes/holiday.routes.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: สร้าง holiday queries**

สร้างไฟล์ `server/database/queries/holiday.queries.ts`:

```typescript
import { db, Timestamp, FieldValue } from "../../config/firebase-admin.js";

export interface Holiday {
  id: string;
  date: string;         // "YYYY-MM-DD"
  name: string;
  type: "holiday" | "special";
  created_at: string;
  created_by: string;
}

export interface CreateHolidayDTO {
  date: string;
  name: string;
  type: "holiday" | "special";
  created_by: string;
}

export async function findAllHolidays(year?: string, month?: string): Promise<Holiday[]> {
  let query = db.collection("holidays").orderBy("date", "asc") as FirebaseFirestore.Query;

  const snap = await query.get();
  let holidays = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));

  if (year) {
    holidays = holidays.filter(h => h.date.startsWith(year));
  }
  if (month) {
    const paddedMonth = month.padStart(2, "0");
    holidays = holidays.filter(h => h.date.substring(5, 7) === paddedMonth);
  }

  return holidays;
}

export async function findHolidayById(id: string): Promise<Holiday | null> {
  const doc = await db.collection("holidays").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Holiday;
}

export async function createHoliday(data: CreateHolidayDTO): Promise<string> {
  const ref = await db.collection("holidays").add({
    ...data,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateHoliday(id: string, data: Partial<Omit<Holiday, "id" | "created_at" | "created_by">>): Promise<void> {
  await db.collection("holidays").doc(id).update(data);
}

export async function deleteHoliday(id: string): Promise<void> {
  await db.collection("holidays").doc(id).delete();
}

export async function findUpcomingHolidays(days: number): Promise<Holiday[]> {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  const todayStr = today.toISOString().substring(0, 10);
  const futureStr = future.toISOString().substring(0, 10);

  const snap = await db.collection("holidays")
    .where("date", ">=", todayStr)
    .where("date", "<=", futureStr)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));
}
```

- [ ] **Step 2: สร้าง holiday controller**

สร้างไฟล์ `server/controllers/holiday.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import {
  findAllHolidays, findHolidayById, createHoliday, updateHoliday, deleteHoliday,
} from "../database/queries/holiday.queries.js";
import { getLineGroupId } from "../database/queries/appSettings.queries.js";

export async function getHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { year, month } = req.query as { year?: string; month?: string };
    const holidays = await findAllHolidays(year, month);
    res.json(holidays);
  } catch (err) { next(err); }
}

export async function createHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, name, type } = req.body;
    if (!date || !name || !type) {
      res.status(400).json({ error: "กรุณาระบุวันที่, ชื่อวันหยุด และประเภท" });
      return;
    }
    const id = await createHoliday({ date, name, type, created_by: req.user!.id });
    res.json({ id });
  } catch (err) { next(err); }
}

export async function updateHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, name, type } = req.body;
    await updateHoliday(req.params.id, { date, name, type });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteHoliday(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getLineGroupIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = await getLineGroupId();
    res.json({ group_id: groupId });
  } catch (err) { next(err); }
}
```

- [ ] **Step 3: สร้าง holiday routes**

สร้างไฟล์ `server/routes/holiday.routes.ts`:

```typescript
import { Router } from "express";
import {
  getHolidays, createHolidayHandler, updateHolidayHandler, deleteHolidayHandler,
  getLineGroupIdHandler,
} from "../controllers/holiday.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getHolidays);
router.post("/", requireAuth, requireRole("admin"), createHolidayHandler);
router.put("/:id", requireAuth, requireRole("admin"), updateHolidayHandler);
router.delete("/:id", requireAuth, requireRole("admin"), deleteHolidayHandler);

export default router;
```

- [ ] **Step 4: เพิ่ม settings route สำหรับ Group ID**

เพิ่มใน `server/routes/index.ts`:

```typescript
import holidayRoutes from "./holiday.routes.js";
// เพิ่ม import ...

router.use("/holidays", holidayRoutes);

// settings endpoint สำหรับ line group id
router.get("/settings/line-group", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { getLineGroupId } = await import("../database/queries/appSettings.queries.js");
    const groupId = await getLineGroupId();
    res.json({ group_id: groupId });
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Commit**

```bash
git add server/database/queries/holiday.queries.ts server/controllers/holiday.controller.ts server/routes/holiday.routes.ts server/routes/index.ts
git commit -m "feat: holidays backend CRUD with Firestore"
```

---

## Task 4: Saturday Schedule Backend

**Files:**
- Create: `server/database/queries/saturdaySchedule.queries.ts`
- Create: `server/controllers/saturdaySchedule.controller.ts`
- Create: `server/routes/saturdaySchedule.routes.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: สร้าง saturdaySchedule queries**

สร้างไฟล์ `server/database/queries/saturdaySchedule.queries.ts`:

```typescript
import { db, Timestamp } from "../../config/firebase-admin.js";

export interface SaturdaySchedule {
  id: string;
  date: string;          // "YYYY-MM-DD" must be Saturday
  user_ids: string[];
  note: string | null;
  created_at: string;
  created_by: string;
}

export interface SaturdayScheduleWithNames extends SaturdaySchedule {
  user_names: string[];  // computed from user_ids
}

export interface CreateSaturdayDTO {
  date: string;
  user_ids: string[];
  note?: string | null;
  created_by: string;
}

export async function findAllSaturdaySchedules(year?: string, month?: string): Promise<SaturdaySchedule[]> {
  const snap = await db.collection("saturday_schedules").orderBy("date", "asc").get();
  let schedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaturdaySchedule));

  if (year) schedules = schedules.filter(s => s.date.startsWith(year));
  if (month) {
    const paddedMonth = month.padStart(2, "0");
    schedules = schedules.filter(s => s.date.substring(5, 7) === paddedMonth);
  }
  return schedules;
}

export async function findSaturdayScheduleById(id: string): Promise<SaturdaySchedule | null> {
  const doc = await db.collection("saturday_schedules").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as SaturdaySchedule;
}

export async function findSaturdayScheduleByDate(date: string): Promise<SaturdaySchedule | null> {
  const snap = await db.collection("saturday_schedules").where("date", "==", date).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as SaturdaySchedule;
}

export async function createSaturdaySchedule(data: CreateSaturdayDTO): Promise<string> {
  const ref = await db.collection("saturday_schedules").add({
    ...data,
    note: data.note ?? null,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateSaturdaySchedule(id: string, data: Partial<Pick<SaturdaySchedule, "user_ids" | "note" | "date">>): Promise<void> {
  await db.collection("saturday_schedules").doc(id).update(data);
}

export async function deleteSaturdaySchedule(id: string): Promise<void> {
  await db.collection("saturday_schedules").doc(id).delete();
}

export async function addUserToSaturdaySchedule(id: string, userId: string): Promise<void> {
  const doc = await db.collection("saturday_schedules").doc(id).get();
  if (!doc.exists) throw new Error("Schedule not found");
  const current = (doc.data()?.user_ids ?? []) as string[];
  if (current.includes(userId)) return;
  await db.collection("saturday_schedules").doc(id).update({ user_ids: [...current, userId] });
}

export async function findUpcomingSaturdaySchedules(days: number): Promise<SaturdaySchedule[]> {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  const todayStr = today.toISOString().substring(0, 10);
  const futureStr = future.toISOString().substring(0, 10);

  const snap = await db.collection("saturday_schedules")
    .where("date", ">=", todayStr)
    .where("date", "<=", futureStr)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaturdaySchedule));
}
```

- [ ] **Step 2: สร้าง saturdaySchedule controller**

สร้างไฟล์ `server/controllers/saturdaySchedule.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import {
  findAllSaturdaySchedules, findSaturdayScheduleById, createSaturdaySchedule,
  updateSaturdaySchedule, deleteSaturdaySchedule, addUserToSaturdaySchedule,
} from "../database/queries/saturdaySchedule.queries.js";
import { findAllUsers } from "../database/queries/user.queries.js";

export async function getSaturdaySchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { year, month } = req.query as { year?: string; month?: string };
    const schedules = await findAllSaturdaySchedules(year, month);

    // Enrich with user names
    const users = await findAllUsers();
    const userMap = new Map(users.map(u => [u.id, `${u.first_name} ${u.last_name}`]));

    const enriched = schedules.map(s => ({
      ...s,
      user_names: s.user_ids.map(uid => userMap.get(uid) ?? uid),
    }));

    res.json(enriched);
  } catch (err) { next(err); }
}

export async function createSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, user_ids, note } = req.body;
    if (!date || !Array.isArray(user_ids)) {
      res.status(400).json({ error: "กรุณาระบุวันที่และรายชื่อผู้มีเวร" });
      return;
    }
    const id = await createSaturdaySchedule({ date, user_ids, note: note ?? null, created_by: req.user!.id });
    res.json({ id });
  } catch (err) { next(err); }
}

export async function updateSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, user_ids, note } = req.body;
    await updateSaturdaySchedule(req.params.id, { date, user_ids, note });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteSaturdaySchedule(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function joinSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addUserToSaturdaySchedule(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function importSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // รับ JSON array จาก frontend (frontend parse Excel แล้วส่งมา)
    const { schedules } = req.body as { schedules: Array<{ date: string; user_ids: string[] }> };
    if (!Array.isArray(schedules)) {
      res.status(400).json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" });
      return;
    }

    const results: string[] = [];
    for (const s of schedules) {
      const id = await createSaturdaySchedule({
        date: s.date,
        user_ids: s.user_ids,
        note: null,
        created_by: req.user!.id,
      });
      results.push(id);
    }

    res.json({ imported: results.length, ids: results });
  } catch (err) { next(err); }
}
```

- [ ] **Step 3: สร้าง saturday routes**

สร้างไฟล์ `server/routes/saturdaySchedule.routes.ts`:

```typescript
import { Router } from "express";
import {
  getSaturdaySchedules, createSaturdayScheduleHandler, updateSaturdayScheduleHandler,
  deleteSaturdayScheduleHandler, joinSaturdayScheduleHandler, importSaturdayScheduleHandler,
} from "../controllers/saturdaySchedule.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getSaturdaySchedules);
router.post("/", requireAuth, requireRole("admin"), createSaturdayScheduleHandler);
router.post("/import", requireAuth, requireRole("admin"), importSaturdayScheduleHandler);
router.put("/:id", requireAuth, requireRole("admin"), updateSaturdayScheduleHandler);
router.delete("/:id", requireAuth, requireRole("admin"), deleteSaturdayScheduleHandler);
router.post("/:id/join", requireAuth, joinSaturdayScheduleHandler);

export default router;
```

- [ ] **Step 4: เพิ่ม route ใน index.ts**

เพิ่มใน `server/routes/index.ts`:

```typescript
import saturdayScheduleRoutes from "./saturdaySchedule.routes.js";

router.use("/saturday-schedules", saturdayScheduleRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add server/database/queries/saturdaySchedule.queries.ts server/controllers/saturdaySchedule.controller.ts server/routes/saturdaySchedule.routes.ts server/routes/index.ts
git commit -m "feat: saturday schedule backend CRUD with Firestore"
```

---

## Task 5: Cron Jobs สำหรับ Holiday และ Saturday Notifications

**Files:**
- Modify: `server/cron.ts`

- [ ] **Step 1: แทนที่ cron.ts ด้วยเวอร์ชัน scheduler-based**

ก่อนอื่น install node-cron:

```bash
cd /c/TaskAm-main/TaskAm-main
npm install node-cron
npm install --save-dev @types/node-cron
```

- [ ] **Step 2: แก้ไข server/cron.ts**

แทนที่เนื้อหาทั้งหมดด้วย:

```typescript
import cron from "node-cron";
import { findAllTasks } from "./database/queries/task.queries.js";
import { findAllHolidays, findUpcomingHolidays } from "./database/queries/holiday.queries.js";
import { findUpcomingSaturdaySchedules } from "./database/queries/saturdaySchedule.queries.js";
import { findAllUsers, findUserById } from "./database/queries/user.queries.js";
import { lineService } from "./services/line.service.js";
import { createNotification } from "./database/queries/notification.queries.js";
import { logger } from "./utils/logger.js";

// ─── Task Deadline Check ──────────────────────────────────────────────────────

export async function checkUpcomingDeadlines() {
  logger.info("Checking for upcoming deadlines...");
  try {
    const tasks = await findAllTasks();
    const now = new Date();
    const alertDays = [1, 2];

    for (const task of tasks) {
      if (!task.due_date || task.status === "completed" || task.status === "cancelled") continue;
      const dueDate = new Date(task.due_date);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (alertDays.includes(diffDays)) {
        for (const assignee of (task.assignments || [])) {
          await createNotification(assignee.id, "ใกล้ครบกำหนดส่ง", `งาน "${task.title}" จะครบกำหนดส่งในอีก ${diffDays} วัน`, "task_deadline", task.id);
          if ((assignee as any).line_user_id) {
            await lineService.notifyUpcomingDeadline((assignee as any).line_user_id, task.title, task.due_date, diffDays);
          }
        }
      }
    }
    logger.info("Deadline check completed.");
  } catch (err: any) {
    logger.error("Error in checkUpcomingDeadlines", { error: err.message });
  }
}

// ─── Holiday Notifications ───────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

async function getAllUsersWithLineId() {
  const users = await findAllUsers();
  return users.filter(u => u.line_user_id);
}

export async function checkTodayHoliday() {
  logger.info("Checking today holiday...");
  try {
    const today = new Date().toISOString().substring(0, 10);
    const holidays = await findAllHolidays();
    const todayHoliday = holidays.find(h => h.date === today);
    if (!todayHoliday) return;

    const users = await getAllUsersWithLineId();
    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, todayHoliday.name, formatThaiDate(todayHoliday.date), "today");
    }
    logger.info(`Sent today holiday notification: ${todayHoliday.name}`);
  } catch (err: any) {
    logger.error("Error in checkTodayHoliday", { error: err.message });
  }
}

export async function checkTomorrowHoliday() {
  logger.info("Checking tomorrow holiday...");
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().substring(0, 10);

    const holidays = await findAllHolidays();
    const tomorrowHoliday = holidays.find(h => h.date === tomorrowStr);
    if (!tomorrowHoliday) return;

    const users = await getAllUsersWithLineId();
    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, tomorrowHoliday.name, formatThaiDate(tomorrowHoliday.date), "tomorrow");
    }
    logger.info(`Sent tomorrow holiday notification: ${tomorrowHoliday.name}`);
  } catch (err: any) {
    logger.error("Error in checkTomorrowHoliday", { error: err.message });
  }
}

export async function sendWeeklyHolidaySummary() {
  logger.info("Sending weekly holiday summary...");
  try {
    const today = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().substring(0, 10);
    const weekEndStr = weekEnd.toISOString().substring(0, 10);

    const holidays = await findAllHolidays();
    const weekHolidays = holidays.filter(h => h.date >= todayStr && h.date <= weekEndStr);
    if (weekHolidays.length === 0) return;

    const holidayList = weekHolidays.map(h => `• ${h.name} — ${formatThaiDate(h.date)}`);
    const users = await getAllUsersWithLineId();

    for (const user of users) {
      await lineService.notifyHolidayPersonal(user.line_user_id!, "", "", "weekly_summary", holidayList);
    }
    logger.info(`Sent weekly holiday summary: ${weekHolidays.length} holidays`);
  } catch (err: any) {
    logger.error("Error in sendWeeklyHolidaySummary", { error: err.message });
  }
}

// ─── Saturday Duty Notifications ─────────────────────────────────────────────

export async function checkFridaySaturdayReminder() {
  logger.info("Checking Friday saturday duty reminder...");
  try {
    const today = new Date();
    if (today.getDay() !== 5) return; // Only run on Friday (5)

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().substring(0, 10);

    const schedules = await findUpcomingSaturdaySchedules(2);
    const tomorrowSchedule = schedules.find(s => s.date === tomorrowStr);
    if (!tomorrowSchedule) return;

    for (const userId of tomorrowSchedule.user_ids) {
      const user = await findUserById(userId);
      if (user?.line_user_id) {
        await lineService.notifySaturdayDutyPersonal(user.line_user_id, formatThaiDate(tomorrowStr));
      }
    }
    logger.info(`Sent Friday saturday duty reminders for ${tomorrowStr}`);
  } catch (err: any) {
    logger.error("Error in checkFridaySaturdayReminder", { error: err.message });
  }
}

export async function checkSaturdayDuty() {
  logger.info("Checking saturday duty...");
  try {
    const today = new Date();
    if (today.getDay() !== 6) return; // Only run on Saturday (6)

    const todayStr = today.toISOString().substring(0, 10);
    const schedules = await findUpcomingSaturdaySchedules(1);
    const todaySchedule = schedules.find(s => s.date === todayStr);
    if (!todaySchedule) return;

    // Send personal notifications
    const names: string[] = [];
    for (const userId of todaySchedule.user_ids) {
      const user = await findUserById(userId);
      if (user) {
        names.push(`${user.first_name} ${user.last_name}`);
        if (user.line_user_id) {
          await lineService.notifySaturdayDutyPersonal(user.line_user_id, formatThaiDate(todayStr));
        }
      }
    }

    // Send group notification
    if (names.length > 0) {
      await lineService.notifySaturdayDutyGroup(formatThaiDate(todayStr), names);
    }

    logger.info(`Sent saturday duty notifications for ${todayStr}: ${names.join(", ")}`);
  } catch (err: any) {
    logger.error("Error in checkSaturdayDuty", { error: err.message });
  }
}

// ─── Cron Schedules ──────────────────────────────────────────────────────────

// Task deadlines: ทุกวัน 08:00
cron.schedule("0 8 * * *", checkUpcomingDeadlines, { timezone: "Asia/Bangkok" });

// วันหยุดวันนี้: ทุกวัน 08:00
cron.schedule("0 8 * * *", checkTodayHoliday, { timezone: "Asia/Bangkok" });

// วันหยุดพรุ่งนี้: ทุกวัน 20:00
cron.schedule("0 20 * * *", checkTomorrowHoliday, { timezone: "Asia/Bangkok" });

// สรุปวันหยุดสัปดาห์: ทุกวันจันทร์ 08:00
cron.schedule("0 8 * * 1", sendWeeklyHolidaySummary, { timezone: "Asia/Bangkok" });

// เวรเสาร์ reminder: ทุกวันศุกร์ 18:00
cron.schedule("0 18 * * 5", checkFridaySaturdayReminder, { timezone: "Asia/Bangkok" });

// เวรเสาร์วันนี้: ทุกวันเสาร์ 08:00
cron.schedule("0 8 * * 6", checkSaturdayDuty, { timezone: "Asia/Bangkok" });

logger.info("Cron jobs scheduled.");
```

- [ ] **Step 3: Import cron.ts ใน server entry point**

ตรวจสอบว่า server entry import cron.ts แล้ว — หาไฟล์ server entry:

```bash
ls /c/TaskAm-main/TaskAm-main/server*.ts
```

ถ้ายังไม่ได้ import cron ใน server.ts ให้เพิ่ม:
```typescript
import "./server/cron.js";
```

- [ ] **Step 4: Commit**

```bash
git add server/cron.ts package.json package-lock.json
git commit -m "feat: cron jobs for holiday and saturday duty LINE notifications"
```

---

## Task 6: Frontend Types และ Services

**Files:**
- Create: `src/types/holiday.ts`
- Create: `src/services/holidayService.ts`
- Create: `src/services/saturdayService.ts`

- [ ] **Step 1: สร้าง types**

สร้างไฟล์ `src/types/holiday.ts`:

```typescript
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
```

- [ ] **Step 2: สร้าง holidayService**

สร้างไฟล์ `src/services/holidayService.ts`:

```typescript
import api from "./api";
import type { Holiday, CreateHolidayDTO } from "../types/holiday";

export const holidayService = {
  async getHolidays(year?: string, month?: string): Promise<Holiday[]> {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data, error } = await api.get<Holiday[]>(`/api/holidays${query}`);
    if (error) throw new Error(error);
    return data ?? [];
  },

  async createHoliday(dto: CreateHolidayDTO): Promise<{ id: string }> {
    const { data, error } = await api.post<{ id: string }>("/api/holidays", dto);
    if (error) throw new Error(error);
    return data!;
  },

  async updateHoliday(id: string, dto: Partial<CreateHolidayDTO>): Promise<void> {
    const { error } = await api.put(`/api/holidays/${id}`, dto);
    if (error) throw new Error(error);
  },

  async deleteHoliday(id: string): Promise<void> {
    const { error } = await api.delete(`/api/holidays/${id}`);
    if (error) throw new Error(error);
  },
};
```

- [ ] **Step 3: สร้าง saturdayService**

สร้างไฟล์ `src/services/saturdayService.ts`:

```typescript
import api from "./api";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../types/holiday";

export const saturdayService = {
  async getSchedules(year?: string, month?: string): Promise<SaturdaySchedule[]> {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data, error } = await api.get<SaturdaySchedule[]>(`/api/saturday-schedules${query}`);
    if (error) throw new Error(error);
    return data ?? [];
  },

  async createSchedule(dto: CreateSaturdayDTO): Promise<{ id: string }> {
    const { data, error } = await api.post<{ id: string }>("/api/saturday-schedules", dto);
    if (error) throw new Error(error);
    return data!;
  },

  async updateSchedule(id: string, dto: Partial<CreateSaturdayDTO>): Promise<void> {
    const { error } = await api.put(`/api/saturday-schedules/${id}`, dto);
    if (error) throw new Error(error);
  },

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await api.delete(`/api/saturday-schedules/${id}`);
    if (error) throw new Error(error);
  },

  async joinSchedule(id: string): Promise<void> {
    const { error } = await api.post(`/api/saturday-schedules/${id}/join`, {});
    if (error) throw new Error(error);
  },

  async importSchedules(schedules: CreateSaturdayDTO[]): Promise<{ imported: number }> {
    const { data, error } = await api.post<{ imported: number }>("/api/saturday-schedules/import", { schedules });
    if (error) throw new Error(error);
    return data!;
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add src/types/holiday.ts src/services/holidayService.ts src/services/saturdayService.ts
git commit -m "feat: holiday and saturday frontend types and services"
```

---

## Task 7: HolidaysPage Frontend

**Files:**
- Create: `src/components/holidays/HolidayFormModal.tsx`
- Create: `src/components/holidays/HolidaysPage.tsx`

- [ ] **Step 1: สร้าง HolidayFormModal**

สร้างไฟล์ `src/components/holidays/HolidayFormModal.tsx`:

```tsx
import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import type { Holiday, CreateHolidayDTO } from "../../types/holiday";

interface HolidayFormModalProps {
  holiday?: Holiday | null;
  onSave: (dto: CreateHolidayDTO) => Promise<void>;
  onClose: () => void;
}

export function HolidayFormModal({ holiday, onSave, onClose }: HolidayFormModalProps) {
  const [date, setDate] = useState(holiday?.date ?? "");
  const [name, setName] = useState(holiday?.name ?? "");
  const [type, setType] = useState<"holiday" | "special">(holiday?.type ?? "holiday");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name) { setError("กรุณากรอกข้อมูลให้ครบ"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ date, name, type });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title={holiday ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อวันหยุด</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น วันปีใหม่" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as "holiday" | "special")}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="holiday">วันหยุดนักขัตฤกษ์ (แดง)</option>
            <option value="special">วันหยุดพิเศษ (เหลือง)</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: สร้าง HolidaysPage**

สร้างไฟล์ `src/components/holidays/HolidaysPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import { holidayService } from "../../services/holidayService";
import { HolidayFormModal } from "./HolidayFormModal";
import type { Holiday, CreateHolidayDTO } from "../../types/holiday";
import type { User } from "../../types";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface HolidaysPageProps {
  user: User;
}

export function HolidaysPage({ user }: HolidaysPageProps) {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await holidayService.getHolidays(year, month || undefined);
      setHolidays(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [year, month]);

  async function handleSave(dto: CreateHolidayDTO) {
    if (editingHoliday) {
      await holidayService.updateHoliday(editingHoliday.id, dto);
    } else {
      await holidayService.createHoliday(dto);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบวันหยุดนี้?")) return;
    await holidayService.deleteHoliday(id);
    await load();
  }

  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - 1 + i).toString());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
            <CalendarDays size={20} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">วันหยุดประจำปี</h1>
            <p className="text-sm text-slate-500">ตารางวันหยุดของบริษัท</p>
          </div>
        </div>
        {user.role === "admin" && (
          <button
            onClick={() => { setEditingHoliday(null); setFormOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> เพิ่มวันหยุด
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">ทุกเดือน</option>
          {MONTHS.map((m, i) => <option key={i} value={(i + 1).toString()}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">ไม่พบวันหยุด</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-12">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">วันที่</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ชื่อวันหยุด</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ประเภท</th>
                {user.role === "admin" && <th className="px-4 py-3 text-right font-medium text-slate-600">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {holidays.map((h, idx) => (
                <motion.tr
                  key={h.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatThaiDate(h.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{h.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      h.type === "holiday" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {h.type === "holiday" ? "นักขัตฤกษ์" : "พิเศษ"}
                    </span>
                  </td>
                  {user.role === "admin" && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingHoliday(h); setFormOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <HolidayFormModal
          holiday={editingHoliday}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingHoliday(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/holidays/HolidayFormModal.tsx src/components/holidays/HolidaysPage.tsx
git commit -m "feat: holidays page UI with CRUD"
```

---

## Task 8: SaturdaySchedulePage Frontend

**Files:**
- Create: `src/components/saturday/SaturdayFormModal.tsx`
- Create: `src/components/saturday/SaturdayImportModal.tsx`
- Create: `src/components/saturday/SaturdaySchedulePage.tsx`

- [ ] **Step 1: สร้าง SaturdayFormModal**

สร้างไฟล์ `src/components/saturday/SaturdayFormModal.tsx`:

```tsx
import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../../types/holiday";
import type { User } from "../../types";

interface SaturdayFormModalProps {
  schedule?: SaturdaySchedule | null;
  users: User[];
  onSave: (dto: CreateSaturdayDTO) => Promise<void>;
  onClose: () => void;
}

export function SaturdayFormModal({ schedule, users, onSave, onClose }: SaturdayFormModalProps) {
  const [date, setDate] = useState(schedule?.date ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(schedule?.user_ids ?? []);
  const [note, setNote] = useState(schedule?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUser(uid: string) {
    setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  }

  function isSaturday(d: string) {
    const day = new Date(d + "T00:00:00").getDay();
    return day === 6;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { setError("กรุณาระบุวันที่"); return; }
    if (!isSaturday(date)) { setError("กรุณาเลือกวันเสาร์เท่านั้น"); return; }
    if (selectedIds.length === 0) { setError("กรุณาเลือกผู้มีเวรอย่างน้อย 1 คน"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ date, user_ids: selectedIds, note: note || null });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title={schedule ? "แก้ไขเวรเสาร์" : "เพิ่มเวรเสาร์"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ (วันเสาร์เท่านั้น)</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">เลือกผู้มีเวร</label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {users.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{u.first_name} {u.last_name}</span>
                <span className="text-xs text-slate-400">{u.position}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ไม่บังคับ)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="หมายเหตุ..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: สร้าง SaturdayImportModal**

สร้างไฟล์ `src/components/saturday/SaturdayImportModal.tsx`:

```tsx
import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { saturdayService } from "../../services/saturdayService";
import type { User } from "../../types";
import type { CreateSaturdayDTO } from "../../types/holiday";

interface SaturdayImportModalProps {
  users: User[];
  onImported: () => void;
  onClose: () => void;
}

interface PreviewRow {
  date: string;
  names: string[];
  user_ids: string[];
  unmatched: string[];
}

export function SaturdayImportModal({ users, onImported, onClose }: SaturdayImportModalProps) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  function parseCSV(text: string): PreviewRow[] {
    const lines = text.trim().split("\n").slice(1); // skip header
    const rows: PreviewRow[] = [];

    for (const line of lines) {
      const [date, ...nameParts] = line.split(",").map(s => s.trim());
      if (!date) continue;

      const names = nameParts.filter(Boolean);
      const user_ids: string[] = [];
      const unmatched: string[] = [];

      for (const name of names) {
        const found = users.find(u =>
          `${u.first_name} ${u.last_name}`.includes(name) ||
          name.includes(u.first_name)
        );
        if (found) user_ids.push(found.id);
        else unmatched.push(name);
      }

      rows.push({ date, names, user_ids, unmatched });
    }
    return rows;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows);
        setStep("preview");
        setError(null);
      } catch {
        setError("ไม่สามารถอ่านไฟล์ได้");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const schedules: CreateSaturdayDTO[] = preview
        .filter(r => r.user_ids.length > 0)
        .map(r => ({ date: r.date, user_ids: r.user_ids, note: null }));
      await saturdayService.importSchedules(schedules);
      onImported();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Import เวรเสาร์จาก CSV">
      <div className="space-y-4">
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

        {step === "upload" && (
          <div>
            <p className="text-sm text-slate-600 mb-3">
              อัปโหลดไฟล์ CSV รูปแบบ:<br />
              <code className="text-xs bg-slate-100 px-2 py-1 rounded">วันที่,ชื่อ1,ชื่อ2,...</code><br />
              <code className="text-xs bg-slate-100 px-2 py-1 rounded">2026-04-12,สมชาย,สมหญิง</code>
            </p>
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />
          </div>
        )}

        {step === "preview" && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Preview ({preview.length} แถว)</p>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {preview.map((row, i) => (
                <div key={i} className="px-3 py-2">
                  <span className="text-sm font-medium text-slate-900">{row.date}</span>
                  <span className="text-sm text-slate-600 ml-2">{row.names.join(", ")}</span>
                  {row.unmatched.length > 0 && (
                    <span className="text-xs text-amber-600 ml-2">⚠️ ไม่พบ: {row.unmatched.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => setStep("upload")} className="flex-1">เลือกไฟล์ใหม่</Button>
              <Button onClick={handleImport} disabled={loading} className="flex-1">
                {loading ? "กำลัง import..." : `Import ${preview.filter(r => r.user_ids.length > 0).length} แถว`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: สร้าง SaturdaySchedulePage**

สร้างไฟล์ `src/components/saturday/SaturdaySchedulePage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Upload, CalendarCheck, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { saturdayService } from "../../services/saturdayService";
import { userService } from "../../services/userService";
import { SaturdayFormModal } from "./SaturdayFormModal";
import { SaturdayImportModal } from "./SaturdayImportModal";
import type { SaturdaySchedule, CreateSaturdayDTO } from "../../types/holiday";
import type { User } from "../../types";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface SaturdaySchedulePageProps {
  user: User;
}

export function SaturdaySchedulePage({ user }: SaturdaySchedulePageProps) {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [schedules, setSchedules] = useState<SaturdaySchedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SaturdaySchedule | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        saturdayService.getSchedules(year, month),
        userService.getUsers(),
      ]);
      setSchedules(s);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [year, month]);

  async function handleSave(dto: CreateSaturdayDTO) {
    if (editingSchedule) {
      await saturdayService.updateSchedule(editingSchedule.id, dto);
    } else {
      await saturdayService.createSchedule(dto);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบเวรนี้?")) return;
    await saturdayService.deleteSchedule(id);
    await load();
  }

  async function handleJoin(id: string) {
    await saturdayService.joinSchedule(id);
    await load();
  }

  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - 1 + i).toString());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ตารางเวรเสาร์</h1>
            <p className="text-sm text-slate-500">กำหนดการทำงานวันเสาร์</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Upload size={16} /> Import CSV
              </button>
              <button
                onClick={() => { setEditingSchedule(null); setFormOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={16} /> เพิ่มเวร
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={year} onChange={e => setYear(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">ทุกเดือน</option>
          {MONTHS.map((m, i) => <option key={i} value={(i + 1).toString()}>{m}</option>)}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center text-slate-400 text-sm py-8">กำลังโหลด...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">ไม่พบตารางเวรเสาร์</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{formatThaiDate(s.date)}</p>
                  {s.note && <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>}
                </div>
                {user.role === "admin" && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingSchedule(s); setFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.user_names.map((name, i) => (
                  <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">{name}</span>
                ))}
              </div>
              {user.role === "staff" && !s.user_ids.includes(user.id) && (
                <button
                  onClick={() => handleJoin(s.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg py-1.5 transition-colors"
                >
                  <UserPlus size={13} /> ลงทะเบียนเวรตัวเอง
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {formOpen && (
        <SaturdayFormModal
          schedule={editingSchedule}
          users={users}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingSchedule(null); }}
        />
      )}
      {importOpen && (
        <SaturdayImportModal
          users={users}
          onImported={load}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/saturday/
git commit -m "feat: saturday schedule page UI with CRUD and import"
```

---

## Task 9: Dashboard Widgets

**Files:**
- Create: `src/components/dashboard/HolidayWidget.tsx`
- Create: `src/components/dashboard/SaturdayWidget.tsx`
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: สร้าง HolidayWidget**

สร้างไฟล์ `src/components/dashboard/HolidayWidget.tsx`:

```tsx
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { holidayService } from "../../services/holidayService";
import type { Holiday } from "../../types/holiday";

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long" });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function HolidayWidget() {
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().substring(0, 10);
        const year = new Date().getFullYear().toString();
        const holidays = await holidayService.getHolidays(year);
        const upcoming = holidays.filter(h => h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
        setNextHoliday(upcoming[0] ?? null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
          <CalendarDays size={16} className="text-rose-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">วันหยุดถัดไป</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : nextHoliday ? (
        <div>
          <p className="font-bold text-slate-900">{nextHoliday.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{formatThaiDate(nextHoliday.date)}</p>
          <p className="text-xs text-rose-600 mt-1 font-medium">
            {daysUntil(nextHoliday.date) === 0 ? "วันนี้! 🎉" : `อีก ${daysUntil(nextHoliday.date)} วัน`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">ไม่มีวันหยุดที่กำลังจะถึง</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: สร้าง SaturdayWidget**

สร้างไฟล์ `src/components/dashboard/SaturdayWidget.tsx`:

```tsx
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { saturdayService } from "../../services/saturdayService";
import type { SaturdaySchedule } from "../../types/holiday";

function getNextSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = day === 6 ? 0 : 6 - day;
  d.setDate(d.getDate() + daysUntilSat);
  return d.toISOString().substring(0, 10);
}

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long" });
}

export function SaturdayWidget() {
  const [schedule, setSchedule] = useState<SaturdaySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const satDate = getNextSaturday();
        const year = satDate.substring(0, 4);
        const month = satDate.substring(5, 7).replace(/^0/, "");
        const schedules = await saturdayService.getSchedules(year, month);
        const found = schedules.find(s => s.date === satDate);
        setSchedule(found ?? null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const nextSat = getNextSaturday();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <CalendarCheck size={16} className="text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">เวรเสาร์ ({formatThaiDate(nextSat)})</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : schedule ? (
        <div className="flex flex-wrap gap-1.5">
          {schedule.user_names.map((name, i) => (
            <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">{name}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">ยังไม่มีตารางเวร</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: เพิ่ม widgets ใน DashboardPage**

แก้ไข `src/components/dashboard/DashboardPage.tsx` — เพิ่ม import และเพิ่ม widgets ก่อน StatCard section:

เพิ่ม imports (ด้านบนไฟล์):
```typescript
import { HolidayWidget } from "./HolidayWidget";
import { SaturdayWidget } from "./SaturdayWidget";
```

เพิ่ม widget row ก่อน StatCard row (หา `<div className` ที่มี StatCard แล้วเพิ่มก่อน):
```tsx
{/* Holiday & Saturday Widgets */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
  <HolidayWidget />
  <SaturdayWidget />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/HolidayWidget.tsx src/components/dashboard/SaturdayWidget.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: holiday and saturday widgets on dashboard"
```

---

## Task 10: เพิ่ม Tabs ใน App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: เพิ่ม lazy imports**

เพิ่ม imports ใน `src/App.tsx` (ต่อจาก lazy imports เดิม):

```typescript
import { CalendarDays, CalendarCheck } from "lucide-react";

const HolidaysPage = lazy(() =>
  import("./components/holidays/HolidaysPage").then(m => ({ default: m.HolidaysPage }))
);
const SaturdaySchedulePage = lazy(() =>
  import("./components/saturday/SaturdaySchedulePage").then(m => ({ default: m.SaturdaySchedulePage }))
);
```

- [ ] **Step 2: เพิ่ม tabs**

แก้ไข array `tabs` ใน App.tsx — เพิ่ม 2 tabs ใหม่หลัง `notifications`:

```typescript
const tabs = [
  { key: "dashboard", label: "แดชบอร์ด", icon: <LayoutDashboard size={20} /> },
  { key: "projects", label: "จัดการโปรเจกต์", icon: <Briefcase size={20} /> },
  { key: "workload", label: "ภาระงานทีม", icon: <BarChartHorizontal size={20} /> },
  { key: "tasks", label: "จัดการงาน", icon: <ClipboardList size={20} /> },
  ...(user.role === "admin" ? [{ key: "staff", label: "พนักงาน", icon: <Users size={20} /> }] : []),
  { key: "reports", label: "รายงาน", icon: <BarChart3 size={20} /> },
  { key: "notifications", label: "การแจ้งเตือน", icon: <Bell size={20} /> },
  { key: "holidays", label: "วันหยุด", icon: <CalendarDays size={20} /> },
  { key: "saturday", label: "เวรเสาร์", icon: <CalendarCheck size={20} /> },
  ...(user.role === "admin" ? [{ key: "settings", label: "ข้อมูลพื้นฐาน", icon: <Database size={20} /> }] : []),
];
```

- [ ] **Step 3: เพิ่ม tabTitles**

เพิ่มใน `tabTitles`:
```typescript
holidays: "วันหยุดประจำปี",
saturday: "ตารางเวรเสาร์",
```

- [ ] **Step 4: เพิ่ม route rendering**

เพิ่มใน `<AnimatePresence>` block (ต่อจาก settings tab):

```tsx
{activeTab === "holidays" && (
  <React.Fragment key="holidays">
    <Suspense fallback={<PageFallback />}>
      <HolidaysPage user={user} />
    </Suspense>
  </React.Fragment>
)}
{activeTab === "saturday" && (
  <React.Fragment key="saturday">
    <Suspense fallback={<PageFallback />}>
      <SaturdaySchedulePage user={user} />
    </Suspense>
  </React.Fragment>
)}
```

- [ ] **Step 5: ทดสอบ build**

```bash
cd /c/TaskAm-main/TaskAm-main
npm run lint
```

Expected: ไม่มี TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add holidays and saturday schedule tabs to sidebar"
```

---

## Task 11: Import cron.ts ใน Server Entry

**Files:**
- Find and modify server entry point

- [ ] **Step 1: หา server entry file**

```bash
ls /c/TaskAm-main/TaskAm-main/*.ts
```

- [ ] **Step 2: ตรวจสอบว่า cron.ts ถูก import**

อ่านไฟล์ server entry (ชื่ออาจเป็น `server.ts` หรือ `index.ts`) — ตรวจสอบว่ามี import cron:

```bash
grep -n "cron" /c/TaskAm-main/TaskAm-main/server.ts
```

ถ้าไม่มี ให้เพิ่ม (หลัง imports อื่นๆ):
```typescript
import "./server/cron.js";
```

ถ้ามีอยู่แล้ว ข้ามขั้นตอนนี้

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "chore: ensure cron jobs are imported in server entry"
```

---

## Task 12: Word Tutorial — อัปเดต Python Script

**Files:**
- Modify: `scripts/generate-firebase-doc.py`

- [ ] **Step 1: อ่านไฟล์เดิมก่อน**

```bash
cat /c/TaskAm-main/TaskAm-main/scripts/generate-firebase-doc.py | head -100
```

- [ ] **Step 2: เพิ่ม sections ใหม่ใน script**

เปิดไฟล์ `scripts/generate-firebase-doc.py` และเพิ่ม sections ก่อน `doc.save(OUTPUT_FILE)`:

```python
# ─── Section: LINE Messaging API ─────────────────────────────────────────────
add_heading(doc, "7. การตั้งค่า LINE Messaging API", level=1)
add_body(doc, "ระบบ Intersite Track ใช้ LINE Messaging API เพื่อส่งการแจ้งเตือนไปยังผู้ใช้งานผ่าน LINE")

add_heading(doc, "7.1 ขั้นตอนสร้าง LINE Channel", level=2)
steps_line = [
    "เข้า https://developers.line.biz/ และ Login ด้วย LINE account",
    "เลือก Provider (organization) ที่ต้องการ",
    "กด 'Create a Messaging API channel'",
    "กรอกข้อมูล Channel name, description, category",
    "กด 'Create' เพื่อสร้าง Channel",
]
for i, step in enumerate(steps_line, 1):
    add_body(doc, f"{i}. {step}")

add_heading(doc, "7.2 การได้ Channel Access Token", level=2)
add_body(doc, "ไปที่ Channel Settings → Messaging API tab → Channel access token → กด 'Issue'")
add_code(doc, "LINE_CHANNEL_ACCESS_TOKEN=your-token-here")

add_heading(doc, "7.3 การรับ LINE User ID ของ Admin", level=2)
add_body(doc, "เพิ่ม bot เป็นเพื่อนใน LINE แล้วส่งข้อความอะไรก็ได้ จากนั้นดู server logs จะเห็น userId")
add_code(doc, "LINE_ADMIN_USER_ID=Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")

add_heading(doc, "7.4 การรับ LINE Group ID อัตโนมัติ", level=2)
add_body(doc, "ระบบรับ Group ID อัตโนมัติผ่าน LINE Webhook:")
group_steps = [
    "เปิด 'Allow bot to join group chats' ใน LINE Official Account Manager → Settings → Messaging API",
    "ตั้งค่า Webhook URL: https://your-domain.com/api/line/webhook",
    "สร้าง LINE Group และเพิ่ม bot เข้า group",
    "เมื่อ bot เข้า group ระบบจะบันทึก Group ID ลง Firestore อัตโนมัติ",
]
for i, step in enumerate(group_steps, 1):
    add_body(doc, f"{i}. {step}")

add_heading(doc, "7.5 การทดสอบ LINE API", level=2)
add_code(doc, 'curl -X POST https://api.line.me/v2/bot/message/push \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"to":"USER_ID","messages":[{"type":"text","text":"Test"}]}\'')

# ─── Section: วันหยุดและเวรเสาร์ ─────────────────────────────────────────────
add_heading(doc, "8. ระบบวันหยุดและตารางเวรเสาร์", level=1)

add_heading(doc, "8.1 วันหยุดประจำปี (Holidays)", level=2)
add_body(doc, "Firestore collection: holidays")
add_code(doc, '{\n  id: string,\n  date: "YYYY-MM-DD",\n  name: string,\n  type: "holiday" | "special",\n  created_at: string,\n  created_by: string\n}')
add_body(doc, "API Endpoints:")
add_code(doc, "GET  /api/holidays?year=2026&month=4\nPOST /api/holidays  (admin only)\nPUT  /api/holidays/:id  (admin only)\nDEL  /api/holidays/:id  (admin only)")

add_heading(doc, "8.2 ตารางเวรเสาร์ (Saturday Schedule)", level=2)
add_body(doc, "Firestore collection: saturday_schedules")
add_code(doc, '{\n  id: string,\n  date: "YYYY-MM-DD",  // must be Saturday\n  user_ids: string[],\n  user_names: string[],  // computed\n  note: string | null,\n  created_at: string,\n  created_by: string\n}')

add_heading(doc, "8.3 การแจ้งเตือน LINE อัตโนมัติ", level=2)
schedule_table = [
    ("ทุกวัน 08:00", "แจ้งวันหยุดวันนี้ + deadline งาน"),
    ("ทุกวัน 20:00", "แจ้งวันหยุดพรุ่งนี้"),
    ("ทุกวันจันทร์ 08:00", "สรุปวันหยุดสัปดาห์นี้"),
    ("ทุกวันศุกร์ 18:00", "แจ้งเวรเสาร์พรุ่งนี้ (เฉพาะผู้มีเวร)"),
    ("ทุกวันเสาร์ 08:00", "แจ้งเวรเสาร์วันนี้ (ส่วนตัว + group)"),
]
table = doc.add_table(rows=1, cols=2)
table.style = "Table Grid"
hdr = table.rows[0].cells
hdr[0].text = "เวลา"
hdr[1].text = "การแจ้งเตือน"
for time, desc in schedule_table:
    row = table.add_row().cells
    row[0].text = time
    row[1].text = desc
doc.add_paragraph()

# ─── Section: Environment Variables ──────────────────────────────────────────
add_heading(doc, "9. Environment Variables (.env)", level=1)
add_code(doc, """# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour-key\\n-----END PRIVATE KEY-----\\n"

# Firebase JS SDK (Frontend)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=1:sender-id:web:app-id

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-token
LINE_ADMIN_USER_ID=Uxxxxxxxxxxxxxxx
LINE_GROUP_ID=  # ไม่ต้องใส่ — ระบบรับจาก webhook อัตโนมัติ

# Application
NODE_ENV=development
PORT=3694""")
```

- [ ] **Step 3: รัน script เพื่อสร้าง .docx ใหม่**

```bash
cd /c/TaskAm-main/TaskAm-main
pip install python-docx
python scripts/generate-firebase-doc.py
```

Expected: สร้างไฟล์ `Firebase_Tutorial.docx` สำเร็จ

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-firebase-doc.py Firebase_Tutorial.docx
git commit -m "docs: update Firebase tutorial with LINE and holiday/saturday sections"
```

---

## Task 13: Integration Test — ทดสอบทั้งระบบ

- [ ] **Step 1: Start server**

```bash
cd /c/TaskAm-main/TaskAm-main
npm run dev
```

Expected: Server เริ่มที่ port 3694 ไม่มี TypeScript errors

- [ ] **Step 2: ทดสอบ LINE webhook locally**

```bash
# Terminal แยก — ใช้ ngrok
ngrok http 3694
```

ตั้งค่า Webhook URL ใน LINE Developers Console เป็น `https://xxx.ngrok.io/api/line/webhook`

- [ ] **Step 3: ทดสอบ LINE bot join group**

เพิ่ม bot เข้า LINE group → ดู server logs ควรเห็น:
```
LINE Group ID saved: Cxxxxxxxxx
```

- [ ] **Step 4: ทดสอบ Holidays API**

```bash
# สมมติ token ได้จาก login
TOKEN="your-firebase-jwt"

# Create holiday
curl -X POST http://localhost:3694/api/holidays \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-13","name":"วันสงกรานต์","type":"holiday"}'

# Get holidays
curl http://localhost:3694/api/holidays?year=2026 \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `{"id":"xxx"}` และ list วันหยุด

- [ ] **Step 5: ทดสอบ Saturday Schedule API**

```bash
curl -X POST http://localhost:3694/api/saturday-schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-12","user_ids":["user-id-1"],"note":"เวรแรก"}'
```

Expected: `{"id":"xxx"}`

- [ ] **Step 6: ทดสอบ UI**

เปิด browser → http://localhost:3694
- ตรวจสอบ tab "วันหยุด" และ "เวรเสาร์" ปรากฏใน sidebar
- ตรวจสอบ Dashboard widgets แสดง
- Admin: เพิ่ม/แก้ไข/ลบวันหยุด
- Admin: เพิ่ม/แก้ไข/ลบ/import เวรเสาร์
- Staff: ดูข้อมูลได้, ลงทะเบียนเวรเองได้

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete holidays, saturday duty, LINE group webhook integration"
```

---

## Self-Review Checklist

- ✅ LINE Webhook รับ Group ID อัตโนมัติ → Task 1
- ✅ Allow bot join group → Task 2
- ✅ Holidays backend CRUD → Task 3
- ✅ Saturday backend CRUD + import → Task 4
- ✅ Cron jobs ทุก scenario → Task 5
- ✅ Frontend types + services → Task 6
- ✅ HolidaysPage → Task 7
- ✅ SaturdaySchedulePage → Task 8
- ✅ Dashboard widgets → Task 9
- ✅ App.tsx tabs → Task 10
- ✅ Server cron import → Task 11
- ✅ Word tutorial → Task 12
- ✅ Integration test → Task 13

**Type consistency:**
- `Holiday` interface ใช้ consistent ทั้ง backend (holiday.queries.ts) และ frontend (types/holiday.ts)
- `SaturdaySchedule` consistent ทั้ง 2 ฝั่ง
- `lineService.notifyHolidayPersonal` / `notifySaturdayDutyPersonal` / `notifySaturdayDutyGroup` ถูก define ใน Task 1 และใช้ใน Task 5

**Note สำคัญ:**
- Webhook URL ต้องเป็น HTTPS — ใช้ ngrok ในช่วง development
- `node-cron` ต้องติดตั้งก่อน (Task 5 Step 1)
- Firebase credentials ต้องอยู่ใน `.env` เพื่อให้ server เริ่มได้
