# Intersite Track

ระบบบริหารจัดการงานและติดตามความคืบหน้าสำหรับองค์กร พัฒนาด้วย React, Express และ Supabase PostgreSQL โดยออกแบบให้รองรับการมอบหมายงานหลายคน ติดตามสถานะแบบละเอียด แจ้งเตือนภายในระบบ และจัดการข้อมูลพื้นฐานสำหรับการใช้งานจริงในหน่วยงาน

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![Supabase](https://img.shields.io/badge/supabase-auth%20%2B%20postgres-3ECF8E)

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [ความสามารถหลัก](#ความสามารถหลัก)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [สถาปัตยกรรม](#สถาปัตยกรรม)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ข้อกำหนดก่อนเริ่มต้น](#ข้อกำหนดก่อนเริ่มต้น)
- [การติดตั้งและรันโปรเจกต์](#การติดตั้งและรันโปรเจกต์)
- [Environment Variables](#environment-variables)
- [สิทธิ์การใช้งานในระบบ](#สิทธิ์การใช้งานในระบบ)
- [API Overview](#api-overview)
- [Database และ Migration](#database-และ-migration)
- [การ Deploy](#การ-deploy)
- [หมายเหตุสำหรับผู้พัฒนา](#หมายเหตุสำหรับผู้พัฒนา)

---

## ภาพรวมระบบ

Intersite Track เป็นระบบสำหรับติดตามงานของทีมและองค์กร โดยรวมทั้งงานด้านการมอบหมายงาน การติดตามความคืบหน้า การจัดการบุคลากร และรายงานภาพรวมไว้ในแอปเดียว

แนวทางของระบบนี้คือ:

- ใช้ `Supabase Auth` สำหรับยืนยันตัวตน
- ใช้ `Supabase PostgreSQL` เป็นฐานข้อมูลหลัก
- ใช้ `Express API` เป็น backend กลางสำหรับ business logic และสิทธิ์การเข้าถึง
- ใช้ `React + Vite` เป็น frontend แบบ SPA
- ใช้ backend ตัวเดียวครอบทั้ง API และ Vite middleware ระหว่างพัฒนา

---

## ความสามารถหลัก

### 1. Authentication และโปรไฟล์ผู้ใช้

- สมัครสมาชิกผ่าน `Supabase Auth`
- เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
- ดึง application profile จาก backend หลัง login สำเร็จ
- รองรับ reset password และ resend verification email
- เปลี่ยนรหัสผ่านผ่าน backend โดยอาศัย Supabase Admin API

### 2. การจัดการผู้ใช้และสิทธิ์

- รองรับ role หลัก 2 ระดับ: `admin` และ `staff`
- Admin สามารถ:
  - ดูรายชื่อผู้ใช้ทั้งหมด
  - สร้างผู้ใช้ใหม่
  - แก้ไขข้อมูลผู้ใช้
  - ลบผู้ใช้
  - จัดการหน่วยงานและประเภทงาน
- การสร้างผู้ใช้ใหม่จะสร้างทั้ง:
  - Supabase Auth user
  - application profile ในฐานข้อมูล
- ถ้าบันทึก profile ไม่สำเร็จ ระบบจะ rollback การสร้าง auth user ให้

### 3. การจัดการงาน

- สร้างงานใหม่พร้อมหัวข้อ รายละเอียด ประเภทงาน ระดับความสำคัญ และวันครบกำหนด
- มอบหมายงานให้เจ้าหน้าที่หลายคนในงานเดียว
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
  - `pending`
  - `in_progress`
  - `completed`
  - `cancelled`
- อัปเดตสถานะงานผ่าน API แยก
- เจ้าหน้าที่สามารถเปลี่ยนสถานะได้เฉพาะงานที่ตนได้รับมอบหมาย
- เมื่อเปลี่ยนสถานะ ระบบจะส่ง notification ให้ผู้เกี่ยวข้อง
- มี progress bar สำหรับแสดงความคืบหน้าของงาน

### 5. Checklist แบบ Parent/Child

- สร้าง checklist ในงานได้หลายรายการ
- รองรับโครงสร้าง parent/child
- บันทึกรายการ checklist แยกจาก task หลัก
- ระบบคำนวณเปอร์เซ็นต์ความคืบหน้าให้อัตโนมัติจาก checklist ที่ถูกติ๊ก
- เมื่อ checklist เปลี่ยน ระบบจะอัปเดต `progress` และ `status` ของงานตามจริง

### 6. การอัปเดตความคืบหน้าและแนบรูปภาพ

- เพิ่ม update ในแต่ละงานได้
- ระบุข้อความอัปเดตและเปอร์เซ็นต์ความคืบหน้า
- แนบรูปภาพประกอบการอัปเดตได้
- backend รองรับ upload ไฟล์ภาพผ่าน `multer`
- เก็บประวัติ update ของงานพร้อมชื่อผู้บันทึก

### 7. Dashboard และมุมมองงาน

- Dashboard แสดงสถิติภาพรวมของระบบ
- แสดงรายการงานล่าสุดหรือที่เกี่ยวข้องกับผู้ใช้
- รองรับมุมมองงานแบบการ์ดและ `Kanban Board`
- ใช้ animation และ transition เพื่อทำให้การใช้งานลื่นขึ้น
- มี skeleton loading และ UI state สำหรับระหว่างโหลดข้อมูล

### 8. Notifications

- แจ้งเตือนเมื่อ:
  - ได้รับมอบหมายงานใหม่
  - งานถูกแก้ไข
  - สถานะงานเปลี่ยน
  - เจ้าของงานได้รับอัปเดตความคืบหน้า
- มี unread count
- รองรับ mark as read และ mark all as read
- frontend ดึง notification ซ้ำทุก 30 วินาที

### 9. รายงาน

- สรุปสถิติงานภาพรวม
- รายงานตามเจ้าหน้าที่
- รายงานตามช่วงวันที่
- ใช้สำหรับดูภาพรวมภาระงานและสถานะของทีม

### 10. ข้อมูลพื้นฐานของระบบ

- จัดการหน่วยงาน
- จัดการประเภทงาน
- หน้า settings รวมข้อมูล master data สำหรับ admin

### 11. ประสบการณ์ใช้งาน

- รองรับ `Dark / Light mode`
- ใช้แนวทาง UI แบบ glassmorphism
- มี feature flags สำหรับเปิด/ปิดความสามารถบางส่วน
- มี confetti effect สำหรับบาง interaction
- รองรับ responsive layout

---

## เทคโนโลยีที่ใช้

| ส่วน | รายละเอียด |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| UI Motion | Motion |
| Icons | Lucide React |
| Drag and Drop | `@hello-pangea/dnd` |
| Backend | Express 4, Node.js |
| Runtime Dev | `tsx` |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Upload | Multer |
| Rate Limiting | `express-rate-limit` |

---

## สถาปัตยกรรม

### Runtime Overview

```text
Browser
  -> React SPA
  -> Supabase Auth (sign in / sign up / session)
  -> Express API (/api/*)
  -> PostgreSQL (Supabase)
```

### Development Mode

ในโหมด development แอปใช้ process เดียว:

- `server.ts` สร้าง Express server
- `Vite` ถูก mount เป็น middleware ภายใน Express
- API และ frontend จึงรันผ่านพอร์ตเดียวกันคือ `3694`

ข้อดีคือ:

- ไม่ต้องเปิดหลาย process
- ไม่ต้องตั้งค่า CORS เพิ่ม
- เรียก API และ asset ภายใต้ origin เดียวกัน

### Auth Flow

1. ผู้ใช้ login ผ่าน `Supabase Auth`
2. frontend ได้ access token
3. frontend เรียก `POST /api/auth/profile`
4. backend ตรวจ token และ map ไปยัง user profile ในฐานข้อมูลแอป
5. หลังจากนั้น API อื่นจะใช้ `Authorization: Bearer <token>`

### Backend Responsibility

backend เป็นจุดรวมของ logic ที่ไม่ควรอยู่ฝั่ง client เช่น:

- ตรวจ role และ permission
- จัดการ assignment ของ task
- สร้าง notification
- คุมการสร้างผู้ใช้ผ่าน Supabase Admin API
- คำนวณ progress จาก checklist
- เขียน audit log

---

## โครงสร้างโปรเจกต์

```text
Intersite-Track/
├── server.ts
├── server/
│   ├── config/
│   │   └── supabase.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── task.controller.ts
│   │   ├── taskUpdate.controller.ts
│   │   ├── report.controller.ts
│   │   ├── department.controller.ts
│   │   ├── taskType.controller.ts
│   │   └── notification.controller.ts
│   ├── database/
│   │   ├── connection.ts
│   │   ├── init.ts
│   │   └── queries/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── task.routes.ts
│   │   ├── department.routes.ts
│   │   ├── taskType.routes.ts
│   │   ├── notification.routes.ts
│   │   └── report.routes.ts
│   └── utils/
│       └── auditLogger.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── taskService.ts
│   │   ├── userService.ts
│   │   └── notificationService.ts
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── config/
│   │   └── features.ts
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── staff/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── layout/
│   │   └── common/
│   └── types/
├── supabase/
│   └── migrations/
├── uploads/
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## ข้อกำหนดก่อนเริ่มต้น

- Node.js `18` ขึ้นไป
- npm
- โปรเจกต์ Supabase 1 ตัว
- ค่าการเชื่อมต่อ PostgreSQL ของ Supabase

---

## การติดตั้งและรันโปรเจกต์

### 1. Clone repository

```bash
git clone https://github.com/tawankh/Intersite-Track.git
cd Intersite-Track
```

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. สร้างไฟล์ `.env`

```bash
cp .env.example .env
```

จากนั้นใส่ค่าจริงของ Supabase และ PostgreSQL ให้ครบ

### 4. เตรียม database schema

โปรเจกต์นี้คาดหวังว่า schema จะถูกจัดการผ่าน `supabase/migrations`

บน startup backend จะ:

- ตรวจว่าเชื่อมต่อฐานข้อมูลได้
- ไม่ได้สร้างตารางให้อัตโนมัติ

ดังนั้นก่อนรัน ควร apply migrations ให้เรียบร้อยในโปรเจกต์ Supabase ของคุณ

### 5. รันโหมดพัฒนา

```bash
npm run dev
```

เปิดใช้งานที่:

```text
http://localhost:3694
```

### Scripts ที่มีในโปรเจกต์

```bash
npm run dev      # Start Express + Vite middleware
npm run build    # Build frontend
npm run preview  # Preview build จาก Vite
npm run lint     # TypeScript type check
npm run clean    # ลบ dist
```

---

## Environment Variables

สร้าง `.env` จาก `.env.example` แล้วกำหนดค่าต่อไปนี้

```env
# ─── Supabase ────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Supabase PostgreSQL ─────────────────────────────────────────
PGHOST=db.your-project.supabase.co
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=your-db-password
PGSSL=true

# ─── Application ────────────────────────────────────────────────
NODE_ENV=development
PORT=3694

# ─── Frontend (Vite) ────────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### คำอธิบายตัวแปร

| ตัวแปร | ใช้งานโดย | หน้าที่ |
| --- | --- | --- |
| `SUPABASE_URL` | backend | URL ของโปรเจกต์ Supabase |
| `SUPABASE_ANON_KEY` | backend | ใช้ประกอบ client หรือการตรวจ token บางส่วน |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | ใช้สร้าง/ลบ user ผ่าน Supabase Admin API |
| `PGHOST` | backend | host ของ PostgreSQL |
| `PGPORT` | backend | port ของ PostgreSQL |
| `PGDATABASE` | backend | ชื่อฐานข้อมูล |
| `PGUSER` | backend | database user |
| `PGPASSWORD` | backend | database password |
| `PGSSL` | backend | เปิด SSL ในการเชื่อมต่อฐานข้อมูล |
| `PORT` | backend | port ของแอป |
| `VITE_SUPABASE_URL` | frontend | Supabase URL สำหรับ browser client |
| `VITE_SUPABASE_ANON_KEY` | frontend | anon key สำหรับ browser client |

ข้อควรระวัง:

- `SUPABASE_SERVICE_ROLE_KEY` ต้องเก็บไว้ฝั่ง server เท่านั้น
- อย่านำ service role ไปใส่ในตัวแปร `VITE_*`

---

## สิทธิ์การใช้งานในระบบ

### Admin

- ดูข้อมูลทั้งหมดในระบบ
- สร้าง แก้ไข ลบ ผู้ใช้
- สร้าง แก้ไข ลบ งาน
- จัดการหน่วยงาน
- จัดการประเภทงาน
- เข้าถึงหน้า settings

### Staff

- ดูงานที่เกี่ยวข้องและข้อมูลในระบบตามที่ backend อนุญาต
- อัปเดตสถานะงานของงานที่ตนได้รับมอบหมาย
- เพิ่ม progress update ในงาน
- ดู notification ของตัวเอง

### Enforcement ใน backend

- ทุก route หลักใช้ `requireAuth`
- route ที่กระทบข้อมูลสำคัญใช้ `requireRole("admin")`
- staff ถูกบล็อกไม่ให้เปลี่ยนสถานะงานที่ไม่ได้รับมอบหมาย

---

## API Overview

ตัวอย่าง endpoint หลักของระบบ

### Auth

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | สมัครสมาชิกและสร้าง app profile |
| `POST` | `/api/auth/profile` | ดึง profile จาก token ปัจจุบัน |
| `PUT` | `/api/users/:id/password` | เปลี่ยนรหัสผ่านผู้ใช้ |

### Users

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/users` | ดึงผู้ใช้ทั้งหมด |
| `GET` | `/api/users/:id` | ดึงข้อมูลผู้ใช้รายคน |
| `POST` | `/api/users` | สร้างผู้ใช้ใหม่ |
| `PUT` | `/api/users/:id` | แก้ไขผู้ใช้ |
| `DELETE` | `/api/users/:id` | ลบผู้ใช้ |
| `GET` | `/api/users/:id/tasks` | ดูงานของผู้ใช้ |

### Tasks

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/tasks` | ดึงรายการงานพร้อมรองรับ query filter |
| `POST` | `/api/tasks` | สร้างงาน |
| `GET` | `/api/tasks/:id` | ดึงรายละเอียดงาน |
| `PUT` | `/api/tasks/:id` | แก้ไขงาน |
| `PATCH` | `/api/tasks/:id/status` | เปลี่ยนสถานะงาน |
| `DELETE` | `/api/tasks/:id` | ลบงาน |
| `GET` | `/api/tasks/:id/updates` | ดึงประวัติการอัปเดตงาน |
| `POST` | `/api/tasks/:id/updates` | เพิ่มการอัปเดตงาน |
| `GET` | `/api/tasks/:id/checklists` | ดึง checklist ของงาน |
| `POST` | `/api/tasks/:id/checklists` | บันทึก checklist |
| `POST` | `/api/tasks/upload` | อัปโหลดรูปภาพ |

### Notifications

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/notifications/:userId` | ดึง notification ของผู้ใช้ |
| `GET` | `/api/notifications/:userId/unread-count` | ดึงจำนวน unread |
| `PATCH` | `/api/notifications/:id/read` | mark รายการเดียวว่าอ่านแล้ว |
| `PATCH` | `/api/notifications/read-all/:userId` | mark ทั้งหมดว่าอ่านแล้ว |

### Departments

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/departments` | ดึงหน่วยงานทั้งหมด |
| `POST` | `/api/departments` | เพิ่มหน่วยงาน |
| `PUT` | `/api/departments/:id` | แก้ไขหน่วยงาน |
| `DELETE` | `/api/departments/:id` | ลบหน่วยงาน |

### Task Types

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/task-types` | ดึงประเภทงานทั้งหมด |
| `POST` | `/api/task-types` | เพิ่มประเภทงาน |
| `PUT` | `/api/task-types/:id` | แก้ไขประเภทงาน |
| `DELETE` | `/api/task-types/:id` | ลบประเภทงาน |

### Reports / Stats

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/reports` | ดึงสถิติภาพรวม |
| `GET` | `/api/reports/stats` | alias สำหรับสถิติภาพรวม |
| `GET` | `/api/reports/by-staff` | รายงานตามเจ้าหน้าที่ |
| `GET` | `/api/reports/by-date-range?start=YYYY-MM-DD&end=YYYY-MM-DD` | รายงานตามช่วงวันที่ |
| `GET` | `/api/stats` | alias ของ stats |

---

## Database และ Migration

โปรเจกต์นี้ใช้ PostgreSQL ของ Supabase เป็นฐานข้อมูลหลัก และมี directory `supabase/migrations` สำหรับจัดการ schema

รูปแบบข้อมูลสำคัญในระบบโดยสรุป:

- `users`
- `departments`
- `task_types`
- `tasks`
- `task_assignments`
- `task_updates`
- `task_checklists`
- `notifications`
- `audit_logs`

แนวทางที่ใช้ในโค้ด:

- backend เชื่อม PostgreSQL ตรงผ่าน `pg`
- auth ใช้ Supabase แยกจาก data access layer
- backend จะตรวจแค่ว่าต่อฐานข้อมูลได้ตอน start
- schema ควรถูกจัดการผ่าน migration ไม่ใช่ hardcode ใน startup

---

## การ Deploy

### แนวทางแนะนำ

สามารถ deploy ได้บนแพลตฟอร์มที่รองรับ Node.js application เช่น:

- Vercel
- Render
- Railway
- VPS ทั่วไป

### สิ่งที่ต้องเตรียมก่อน deploy

- ตั้งค่า environment variables ให้ครบ
- ให้ backend เข้าถึง Supabase PostgreSQL ได้
- apply migrations ใน Supabase ก่อน deploy production
- เปิด static serving สำหรับ frontend build

### Production behavior

เมื่อ `NODE_ENV=production`

- Express จะ serve ไฟล์จาก `dist/`
- route ที่ไม่ใช่ `/api/*` จะ fallback ไป `dist/index.html`

ดังนั้น flow production โดยทั่วไปคือ:

```bash
npm run build
NODE_ENV=production npm run dev
```

ถ้าจะ deploy แยก frontend/backend ควรจัดการ routing ใหม่ให้ชัดเจนก่อน

---

## หมายเหตุสำหรับผู้พัฒนา

### Feature flags

ไฟล์ `src/config/features.ts` ใช้สำหรับเปิด/ปิดความสามารถบางส่วน เช่น:

- theme toggle
- glassmorphism UI
- confetti
- skeleton loading
- kanban board

### สิ่งที่มีในโค้ดแต่ควรตรวจสอบก่อนเปิดใช้จริง

- ฟีเจอร์บางส่วนมีโครงสร้างเตรียมไว้สำหรับการขยายต่อ
- ก่อนเปิดใช้ใน production ควรตรวจ route, migration และ UI flow ให้ครบทุกจุด

### การพัฒนาเพิ่มเติมที่เหมาะสม

- เพิ่ม test coverage สำหรับ API และ frontend interaction
- เพิ่ม seed script สำหรับข้อมูลเริ่มต้น
- เพิ่ม deployment config เฉพาะแพลตฟอร์ม
- เพิ่มเอกสาร schema และ ER diagram
- แยก README สำหรับ contributor และ operational runbook

---

## ผู้พัฒนา

พัฒนาโดย [tawankh](https://github.com/tawankh)
