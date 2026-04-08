# Intersite Track

ระบบบริหารจัดการงานและติดตามความคืบหน้าสำหรับองค์กร พัฒนาด้วย React, Express, Firebase Auth, Firestore และ LINE Messaging API โดยออกแบบให้รองรับการมอบหมายงานหลายคน ติดตามสถานะแบบละเอียด แจ้งเตือนทั้งในระบบและผ่าน LINE รวมถึงงานปฏิบัติการภายในองค์กร เช่น วันหยุดและเวรวันเสาร์

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![Firebase](https://img.shields.io/badge/firebase-auth%20%2B%20firestore-FFCA28)

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [สถาปัตยกรรมปัจจุบัน](#สถาปัตยกรรมปัจจุบัน)
- [เริ่มต้นใช้งาน](#เริ่มต้นใช้งาน)
- [การตั้งค่า LINE Notification](#การตั้งค่า-line-notification)
- [ความสามารถหลัก](#ความสามารถหลัก)
- [ฟีเจอร์ขั้นสูง (Advanced Features)](#ฟีเจอร์ขั้นสูง-advanced-features)

---

## ภาพรวมระบบ

Intersite Track เป็นระบบสำหรับติดตามงานของทีมและองค์กร โดยรวมทั้งงานด้านการมอบหมายงาน การติดตามความคืบหน้า การจัดการบุคลากร และรายงานภาพรวมไว้ในแอปเดียว

แนวทางของระบบนี้คือ:

- ใช้ `Firebase Auth` สำหรับยืนยันตัวตน
- ใช้ `Firestore` เป็นฐานข้อมูลหลัก
- ใช้ `Express API` เป็น backend กลางสำหรับ business logic และสิทธิ์การเข้าถึง
- ใช้ `React + Vite` เป็น frontend แบบ SPA
- ใช้ `LINE Messaging API` สำหรับแจ้งเตือนภายนอกระบบ
- ใช้ backend ตัวเดียวครอบทั้ง API, cron jobs และ Vite middleware ระหว่างพัฒนา

---

## สถาปัตยกรรมปัจจุบัน

### Frontend

- React 19 + Vite
- หน้าใช้งานหลัก: Dashboard, Tasks, Projects, Reports, Notifications, Holidays, Saturday Schedule

### Backend

- Express
- Firebase Admin SDK
- Firestore query layer แยกตามโดเมน
- Cron jobs สำหรับ deadline alerts, holiday reminders และ saturday duty reminders

### Integrations

- LINE Messaging API สำหรับ push message
- LINE webhook สำหรับบันทึก Group ID อัตโนมัติ
- Trello scripts สำหรับงานสรุปและเชื่อม workflow เสริม

---

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. สร้างไฟล์ `.env`

คัดลอกจาก `.env.example` แล้วใส่ค่าจริงของ Firebase และ LINE

```bash
copy .env.example .env
```

### 3. ใส่ค่า Firebase ให้ครบ

ต้องมีอย่างน้อย:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4. ใส่ค่า LINE ให้ครบ

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_ADMIN_USER_ID`

หมายเหตุ: `LINE_GROUP_ID` ไม่จำเป็นต้องตั้งค่าเองใน flow ปัจจุบัน เพราะระบบจะบันทึก `group_id` ลง Firestore อัตโนมัติผ่าน webhook เมื่อ bot ถูกเพิ่มเข้า group

### 5. รันระบบ

```bash
npm run dev
```

ค่าเริ่มต้นคือ `http://localhost:3694`

### 6. ตรวจสอบความพร้อมของโปรเจกต์

```bash
npm run lint
npm run test:unit
npm run build
```

---

## การตั้งค่า LINE Notification

### 1. เปิด Messaging API

ใน LINE Developers Console ต้องมี:

- Channel Access Token
- Webhook เปิดใช้งาน
- เปิด `Allow bot to join group chats`

### 2. ตั้งค่า webhook

ตั้ง LINE webhook ไปที่:

```text
https://<your-domain>/api/line/webhook
```

ตอนพัฒนาในเครื่องต้องใช้ URL ที่เป็น HTTPS เช่น ngrok หรือ deploy preview

### 3. ผูกผู้ใช้กับ LINE

ผู้ใช้ที่ต้องการรับข้อความส่วนตัวต้องมี `line_user_id` อยู่ในข้อมูล user

### 4. ให้ bot เข้า group

เมื่อ bot ถูกเพิ่มเข้า group ระบบจะรับ event `join` หรือ `message` แล้วบันทึก `group_id` ลง Firestore ที่ `app_settings/line_config` โดยอัตโนมัติ

### 5. ตรวจสอบการเชื่อมต่อ

```bash
npx tsx scripts/check-line.ts
npx tsx scripts/test-line.ts
```

---

## ความสามารถหลัก

### 1. Authentication และโปรไฟล์ผู้ใช้

- สมัครสมาชิกผ่าน `Firebase Auth`
- เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
- ดึง application profile จาก backend หลัง login สำเร็จ
- รองรับ reset password และ resend verification email
- เปลี่ยนรหัสผ่านผ่าน backend โดยอาศัย Firebase Admin SDK

### 2. การจัดการผู้ใช้และสิทธิ์

- รองรับ role หลัก 2 ระดับ: `admin` (แอดมิน) และ `staff` (พนักงาน)
- แอดมิน สามารถ:
  - ดูรายชื่อพนักงานทั้งหมด
  - สร้างพนักงานใหม่
  - แก้ไขข้อมูลพนักงาน
  - ลบพนักงาน
  - จัดการหน่วยงานและประเภทงาน
- การสร้างพนักงานใหม่จะสร้างทั้ง:
  - Firebase Auth user
  - application profile ในฐานข้อมูล
- ถ้าบันทึก profile ไม่สำเร็จ ระบบจะ rollback การสร้าง auth user ให้

### 3. การจัดการงาน

- สร้างงานใหม่พร้อมหัวข้อ รายละเอียด ประเภทงาน ระดับความสำคัญ และวันครบกำหนด
- มอบหมายงานให้พนักงานหลายคนในงานเดียว
- แก้ไขรายละเอียดงานและผู้รับผิดชอบ
- ลบงาน
- ดูรายการงานทั้งหมดและดูรายละเอียดรายงานทีละงาน
- ค้นหาและกรองงานตาม:
  - คำค้น
  - สถานะ
  - Priority
  - ผู้รับผิดชอบ
  - ช่วงวันที่

### 4. สถานะงานและความคืบหน้า

- รองรับสถานะ:
  - `pending` (รอดำเนินการ)
  - `in_progress` (กำลังดำเนินการ)
  - `completed` (เสร็จสิ้น)
  - `cancelled` (ยกเลิก)
- อัปเดตสถานะงานผ่าน API แยก
- พนักงานสามารถเปลี่ยนสถานะได้เฉพาะงานที่ตนได้รับมอบหมาย
- เมื่อเปลี่ยนสถานะ ระบบจะส่ง notification ให้ผู้เกี่ยวข้อง
- มี progress bar สำหรับแสดงความคืบหน้าของงาน

### 5. Checklist แบบ Parent/Child

- สร้าง checklist ในงานได้หลายรายการ
- รองรับโครงสร้าง parent/child
- บันทึกรายการ checklist แยกจาก task หลัก
- ระบบคำนวณเปอร์เซ็นต์ความคืบหน้าให้อัตโนมัติจาก checklist ที่ถูกติ๊ก

---

## ฟีเจอร์ขั้นสูง (Advanced Features)

### 1. ระบบรายงาน PDF (PDF Reporting)

- ออกรายงานสรุปงานและภาระงานพนักงานในรูปแบบ PDF
- รองรับภาษาไทยสมบูรณ์ด้วยฟอนต์ Noto Sans Thai

### 2. การแจ้งเตือนผ่าน LINE (LINE Notification)

- แจ้งเตือนงานใหม่, การแก้ไขงาน, และการเปลี่ยนสถานะผ่าน LINE Messaging API
- ระบบแจ้งเตือนงานใกล้ครบกำหนด (Deadline Alert) อัตโนมัติ
- รองรับแจ้งเตือนวันหยุดวันนี้, วันหยุดพรุ่งนี้ และสรุปวันหยุดประจำสัปดาห์
- รองรับแจ้งเตือนเวรวันเสาร์แบบรายบุคคลและแบบ group
- บันทึก LINE Group ID อัตโนมัติผ่าน webhook

### 3. ระบบวิเคราะห์ข้อมูล (Advanced Analytics)

- แดชบอร์ดแสดงผลด้วยกราฟ Burn-down Chart และการเปรียบเทียบภาระงานหน่วยงาน

### 4. การจัดการไฟล์ (File Management)

- รองรับการแนบไฟล์หลากหลายประเภท (PDF, Excel, Word, รูปภาพ) สูงสุด 25MB

### 5. PWA (Progressive Web App)

- รองรับการติดตั้งเป็นแอปพลิเคชันบนมือถือ เพื่อความสะดวกในการเข้าถึง
