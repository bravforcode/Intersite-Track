# Design: วันหยุด, เวรเสาร์, LINE Notifications & Firebase Tutorial

**Date:** 2026-04-07  
**Project:** Intersite Track (TaskAm)  
**Scope:** 5 deliverables — LINE bot group fix, holidays page, Saturday duty page, dashboard widgets, Word tutorial

---

## 1. Overview

เพิ่ม 2 หน้าใหม่ใน Sidebar + Dashboard Widgets + LINE notifications + Word tutorial

```
Deliverables:
1. Fix LINE Bot → Allow join group chats (Firestore stores group ID)
2. หน้า "วันหยุด" → CRUD + Dashboard Widget + LINE 3 แบบ
3. หน้า "เวรเสาร์" → CRUD + Import Excel + Dashboard Widget + LINE แจ้งเตือน
4. Cron Jobs → เพิ่มใน server/cron.ts
5. Word Tutorial → Python script สร้าง .docx
```

---

## 2. Database: Firestore Collections ใหม่

### `holidays` collection
```
{
  id: string,          // auto-generated
  date: string,        // "YYYY-MM-DD"
  name: string,        // "วันปีใหม่"
  type: "holiday" | "special",  // แดง = นักขัตฤกษ์, เหลือง = พิเศษ
  created_at: Timestamp,
  created_by: string   // user id
}
```

### `saturday_schedules` collection
```
{
  id: string,          // auto-generated
  date: string,        // "YYYY-MM-DD" (must be Saturday)
  user_ids: string[],  // array of user IDs on duty
  note: string | null, // optional note
  created_at: Timestamp,
  created_by: string
}
```

### `app_settings` collection (for LINE Group ID)
```
{
  id: "line_config",
  group_id: string,    // LINE Group ID (C...)
  updated_at: Timestamp
}
```

---

## 3. Backend: API Endpoints

### Holidays
```
GET    /api/holidays             → list all (filter: ?year=2026&month=4)
POST   /api/holidays             → create (admin only)
PUT    /api/holidays/:id         → update (admin only)
DELETE /api/holidays/:id         → delete (admin only)
```

### Saturday Schedules
```
GET    /api/saturday-schedules         → list all (filter: ?year=2026&month=4)
POST   /api/saturday-schedules         → create (admin only)
PUT    /api/saturday-schedules/:id     → update (admin only)
DELETE /api/saturday-schedules/:id     → delete (admin only)
POST   /api/saturday-schedules/:id/join  → staff self-register
POST   /api/saturday-schedules/import  → import from Excel (admin only)
```

### LINE Group ID
```
GET    /api/settings/line-group  → get current group ID
POST   /api/settings/line-group  → save group ID (admin only, via webhook)
```

---

## 4. LINE Bot: Fix Group Join

**ปัญหา:** "Allow bot to join group chats" Disabled  
**แก้:** เปิดใน LINE Official Account Manager → Settings → Messaging API → Allow bot to join group chats → Enable

**รับ Group ID อัตโนมัติ:**  
เพิ่ม Webhook handler ใน backend: เมื่อ bot ถูกเพิ่มเข้า group จะได้รับ event `join` พร้อม `groupId` → บันทึกลง Firestore `app_settings/line_config`

```typescript
// server/controllers/lineWebhook.controller.ts
// POST /api/line/webhook
// - event.type === "join" → save event.source.groupId to Firestore
// - event.type === "message" → echo or ignore
```

**Webhook URL** ต้องเป็น HTTPS → ใช้ ngrok ในการ dev หรือ deploy จริง

---

## 5. Frontend: หน้า "วันหยุด"

**Tab ใหม่ใน Sidebar:** "วันหยุด" (icon: Calendar) — มองเห็นทุก role

**HolidaysPage component:**
- Filter bar: เลือกปี / เลือกเดือน
- ตาราง: ลำดับ | วัน | วันที่ | ชื่อวันหยุด | ประเภท
- Badge: สีแดง = วันหยุดนักขัตฤกษ์, สีเหลือง = วันพิเศษ
- Admin: ปุ่ม "เพิ่มวันหยุด", edit inline, ปุ่มลบ
- Staff: ดูได้อย่างเดียว

**HolidayFormModal:**
- fields: วันที่ (date picker), ชื่อวันหยุด, ประเภท

---

## 6. Frontend: หน้า "เวรเสาร์"

**Tab ใหม่ใน Sidebar:** "เวรเสาร์" (icon: CalendarCheck) — มองเห็นทุก role

**SaturdaySchedulePage component:**
- Filter: เลือกเดือน/ปี
- ตาราง: วันที่เสาร์ | รายชื่อผู้มาทำงาน | หมายเหตุ | actions
- Admin: เพิ่ม/แก้ไข/ลบ, ปุ่ม Import Excel
- Staff: ดูได้ + ปุ่ม "ลงทะเบียนเวรตัวเอง"

**SaturdayFormModal:**
- fields: วันที่ (date picker — Saturday only), เลือก users (multi-select), หมายเหตุ

**Import Excel:**
- รับไฟล์ .xlsx, format: วันที่ | ชื่อ-นามสกุล
- Map ชื่อกับ user ใน Firestore
- Preview ก่อน import

---

## 7. Dashboard Widgets (2 กล่อง)

เพิ่มใน DashboardPage ด้านบน:

**Widget 1: วันหยุดถัดไป**
```
🗓️ วันหยุดถัดไป
วันสงกรานต์ — 13 เม.ย. (อีก 6 วัน)
```

**Widget 2: เวรเสาร์สัปดาห์นี้**
```
📋 เวรเสาร์สัปดาห์นี้ (12 เม.ย.)
ณัฐ, อัตร, รุ่ง
```

---

## 8. LINE Notifications (Cron Jobs)

เพิ่มใน `server/cron.ts`:

### วันหยุด
| เวลา | action |
|------|--------|
| ทุกวัน 20:00 | ตรวจหาวันหยุดพรุ่งนี้ → แจ้งเตือนส่วนตัวทุกคน |
| ทุกวัน 08:00 | ตรวจหาวันหยุดวันนี้ → แจ้งเตือนส่วนตัวทุกคน |
| ทุกวันจันทร์ 08:00 | สรุปวันหยุดสัปดาห์นี้ → แจ้งเตือนส่วนตัวทุกคน |

### เวรเสาร์
| เวลา | action |
|------|--------|
| ทุกวันศุกร์ 18:00 | แจ้งเตือนส่วนตัวคนที่มีเวรวันเสาร์พรุ่งนี้ |
| ทุกวันเสาร์ 08:00 | แจ้งเตือนส่วนตัวคนที่มีเวรวันนี้ + แจ้ง LINE Group ว่าใครมาบ้าง |

**ข้อความตัวอย่าง:**
```
🎉 พรุ่งนี้วันหยุด!
วันสงกรานต์ — 13 เมษายน 2569
ขอให้พักผ่อนอย่างมีความสุขนะครับ 😊

---

📋 เวรทำงานวันเสาร์นี้ (12 เมษายน)
คุณ ณัฐ พรปวีณ์ มีเวรทำงานวันนี้นะครับ
กรุณามาทำงานตามเวลาที่กำหนด ✅

---

📢 เวรทำงานวันเสาร์ที่ 12 เมษายน 2569
ผู้มีเวร: ณัฐ, อัตร, รุ่ง
ขอให้ทำงานอย่างมีความสุขครับ 💪
```

---

## 9. Word Tutorial Document

**Script:** `scripts/generate-firebase-doc.py` (มีอยู่แล้ว — เพิ่มเนื้อหา)

**เนื้อหา tutorial:**
1. ภาพรวมระบบ Intersite Track
2. Firebase Admin SDK — ติดตั้งและ config
3. Firestore — Collections ทั้งหมด + schema
4. Firebase Auth — Auth flow, create/login user
5. LINE Messaging API — ติดตั้ง, credentials, ส่ง push message
6. LINE Webhook — รับ event, รับ Group ID
7. Environment Variables — .env ทั้งหมด
8. วิธี run dev/build
9. Cron Jobs — schedule และ notification logic

---

## 10. File Structure (ใหม่)

```
src/components/
  holidays/
    HolidaysPage.tsx
    HolidayFormModal.tsx
  saturday/
    SaturdaySchedulePage.tsx
    SaturdayFormModal.tsx
    SaturdayImportModal.tsx
  dashboard/
    HolidayWidget.tsx        (ใหม่)
    SaturdayWidget.tsx       (ใหม่)

server/
  controllers/
    holiday.controller.ts
    saturday.controller.ts
    lineWebhook.controller.ts
  database/queries/
    holiday.queries.ts
    saturday.queries.ts
  routes/
    holiday.routes.ts
    saturday.routes.ts
    lineWebhook.routes.ts

scripts/
  generate-firebase-doc.py   (เพิ่มเนื้อหา)
```

---

## 11. Implementation Order

1. **Fix LINE bot group join** → เปิด setting + เพิ่ม webhook handler
2. **Holidays backend** → Firestore queries + API routes
3. **Holidays frontend** → HolidaysPage + HolidayFormModal
4. **Saturday backend** → Firestore queries + API routes + import
5. **Saturday frontend** → SaturdaySchedulePage + modals
6. **Dashboard widgets** → HolidayWidget + SaturdayWidget
7. **Cron jobs** → เพิ่มใน cron.ts
8. **Word tutorial** → update Python script
