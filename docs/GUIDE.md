# Intersite Track — คู่มือการใช้งาน

## 📋 สารบัญ
1. [ข้อมูลระบบ](#ข้อมูลระบบ)
2. [การตั้งค่า LINE Bot](#การตั้งค่า-line-bot)
3. [ใช้งาน Dashboard](#ใช้งาน-dashboard)
4. [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
5. [FAQ](#faq)

---

## ข้อมูลระบบ

**ชื่อระบบ:** Intersite Track  
**ประเภท:** Task Management + Holiday Schedule + Saturday Duty Roster  
**สถานะ:** ✅ Running  
**URL:** http://localhost:3694 (dev) / Production URL (coming soon)

---

## การตั้งค่า LINE Bot

### 1️⃣ เพิ่ม Bot เป็นเพื่อน (ทำหนึ่งครั้งต่อคน)

**วิธี A: ใช้ LINE ID**
- เปิด LINE
- กด **ค้นหา** → พิมพ์ `@441sptre`
- กด **เพิ่มเพื่อน**

**วิธี B: ใช้ QR Code**
- ไปที่ LINE OA Manager → https://manager.line.biz
- กดที่ชื่อ account gracia
- ค้นหา QR code → scan จาก LINE

✅ **หลังจาก add แล้ว** คุณจะได้รับแจ้งเตือนทั้งหมด

---

### 2️⃣ ประเภทแจ้งเตือน

| ประเภท | ส่งไป | ใครได้รับ |
|-------|------|---------|
| **Task ใหม่** | DM ส่วนตัว | คนที่ assign ให้ |
| **Deadline เตือน** | DM ส่วนตัว | คนที่รับผิดชอบ |
| **Blocker แจ้ง** | DM ส่วนตัว | คนที่รับผิดชอบ + Admin |
| **วันหยุดประจำปี** | Broadcast | ทุกคนที่ add bot |
| **วันเสาร์มีงาน** | Broadcast | ทุกคนที่ add bot |

---

## ใช้งาน Dashboard

### 📊 หน้าแรก - Dashboard
ดูภาพรวมการใช้งาน:
- **Tasks** - งานที่มอบหมาย, deadline ใกล้
- **Calendar** - วันหยุดถัดไป
- **Saturday Duty** - เวรทำงานวันเสาร์นี้

### 📝 Tab: Tasks
1. **ดูงาน** - ดับเบิลคลิก task เพื่อดูรายละเอียด
2. **เพิ่มงาน** - กด **+ New Task**
   - ชื่องาน, คำอธิบาย, กำหนดส่ง
   - เลือกคนรับผิดชอบ
   - กด **Create**
3. **อัปเดตสถานะ** - เปลี่ยน Status (To Do → In Progress → Done)
4. **Blocker** - กด ⚠️ เพื่อแจ้งปัญหา

---

### 📅 Tab: Holidays
**ดูวันหยุดประจำปี**
- ตัวกรองตามปี/เดือน
- ดูนับถอยหลัง (วันหยุดถัดไป)
- Admin เท่านั้น: เพิ่ม/แก้ไข/ลบวันหยุด

---

### 🗓️ Tab: Saturday Schedule
**เวรทำงานวันเสาร์**
- **ดูตารางเวร** - ใครมีงาน วันไหน
- **ร่วมเวร** - กด **Join as Volunteer** ถ้ายินดี
- **Admin เท่านั้น** - เพิ่มแบบ:
  - **Add Single** - วันเดียว
  - **Import CSV** - จากไฟล์

---

## ฟีเจอร์หลัก

### ✅ Task Management
```
มอบหมาย → ได้รับแจ้ง LINE → อัปเดตสถานะ → ทำเสร็จ
```
- สร้างงาน → ได้ไป LINE DM ผู้รับผิดชอบ
- Deadline เตือน → 3 วันก่อนถึงกำหนด
- Blocker → แจ้ง Admin ทันที

### 📍 Holiday Management
- บันทึกวันหยุดประจำปี 2569
- แจ้งเตือน LINE ทุกคน:
  - วันก่อนหน้า 1 วัน
  - ถ้าเป็นวันนี้
  - **สรุปรายสัปดาห์**

### 📊 Saturday Duty Roster
- ดูใครมีเวรวันเสาร์
- พนักงานสามารถเข้าร่วมเวร
- Admin แจ้งเตือน:
  - คนที่มีเวร
  - ทุกคนใน broadcast

---

## FAQ

**Q: ทำไมไม่ได้รับแจ้งเตือน LINE?**  
A: 
1. ตรวจสอบว่า add @441sptre แล้ว
2. ไป LINE Settings → Notifications → เปิด gracia
3. ตรวจสอบว่า bot ยังอยู่ในบัญชี (ลองส่ง message ให้ bot)

**Q: วันหยุดที่แสดงไม่ครบ**  
A: Contact Admin เพื่อเพิ่มวันหยุด

**Q: เวรวันเสาร์สามารถแก้ไขได้ไหม?**  
A: ติดต่อ Admin เท่านั้น (ระบบจำกัดไว้เพื่อความถูกต้อง)

**Q: ส่ง message กับ bot ได้ไหม?**  
A: ปัจจุบัน bot ไม่ตอบ message ยังแจ้งเตือนเท่านั้น

**Q: ปรับแต่ง notification ได้ไหม?**  
A: Contact Admin ผ่าน web app หรือ LINE DM

---

## 🔧 ข้อมูลเทคนิค (สำหรับ Dev)

### Env Variables
```
LINE_CHANNEL_ACCESS_TOKEN=... (broadcast API)
LINE_ADMIN_USER_ID=... (แจ้ง admin)
FIREBASE_PROJECT_ID=internsite-f9cd7
```

### API Endpoints
- `POST /api/tasks` - สร้าง task
- `POST /api/holidays` - เพิ่มวันหยุด
- `POST /api/saturday` - เพิ่มเวร
- `POST /api/line/webhook` - LINE webhook

### Database (Firestore)
```
collections:
  - users (profile)
  - tasks (task data)
  - holidays (วันหยุด)
  - saturday_schedules (เวร)
  - app_settings (group_id, config)
```

---

## 📞 ติดต่อและสนับสนุน

**Admin:** Contact via LINE DM  
**Issues:** Report ใน web app

---

**Last Updated:** 2026-04-07  
**Version:** 1.0
