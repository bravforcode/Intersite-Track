# ระบบบริหารจัดการงานเจ้าหน้าที่ — TaskAm

ระบบบริหารจัดการงานและติดตามความคืบหน้าสำหรับองค์กร พัฒนาด้วย React + Express + PostgreSQL

## ✨ ฟีเจอร์หลัก

- **จัดการผู้ใช้** — เพิ่ม/แก้ไข/ลบ ผู้ใช้ แบ่งเป็น Admin และ Staff
- **จัดการเจ้าหน้าที่** — แสดงรายชื่อ, หน่วยงาน, ตำแหน่ง
- **มอบหมายงาน** — สร้างงาน กำหนดผู้รับผิดชอบ ระดับความสำคัญ กำหนดส่ง
- **Checklist หัวข้อทำงาน** — สร้าง checklist แบบ parent/child ติ๊กเช็คเพื่อคำนวณ % อัตโนมัติ
- **ติดตามความคืบหน้า** — ดูสถานะงาน อัปเดตความคืบหน้า แนบรูปภาพ
- **แจ้งเตือน** — แจ้งเตือนเมื่อได้รับมอบหมายงาน/สถานะเปลี่ยน
- **รายงาน** — สรุปงานตามเจ้าหน้าที่ ตามช่วงเวลา export CSV
- **ค้นหาและกรอง** — ค้นหางาน กรองตามสถานะ ระดับความสำคัญ ผู้รับผิดชอบ
- **ข้อมูลหลัก** — จัดการหน่วยงาน และประเภทงาน

## 🛠 เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Express.js, Node.js |
| Database | PostgreSQL |
| Icons | Lucide React |
| Upload | Multer (รูปภาพ) |

## 📋 ความต้องการ

- Node.js 18+
- PostgreSQL 14+

## 🚀 วิธีติดตั้ง

```bash
# 1. Clone
git clone https://github.com/bigbossa/TaskAm.git
cd TaskAm

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env (คัดลอกจาก .env.example)
cp .env.example .env
# แก้ไขค่า PGDATABASE, PGUSER, PGPASSWORD, PGHOST, PGPORT ให้ตรงกับ PostgreSQL ของคุณ

# 4. สร้าง database ใน PostgreSQL
psql -U postgres -c "CREATE DATABASE task"

# 5. รันเซิร์ฟเวอร์
npm run dev
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3694**

## 👤 บัญชีทดสอบ

| Username | Password | Role | ชื่อ |
|----------|----------|------|------|
| `admin` | `admin123` | Admin | ผู้ดูแล ระบบ |
| `somchai` | `staff123` | Staff | สมชาย ใจดี |
| `somying` | `staff123` | Staff | สมหญิง รักงาน |
| `wichai` | `staff123` | Staff | วิชัย มุ่งมั่น |
| `pranee` | `staff123` | Staff | ปราณี สุขใจ |

## 📁 โครงสร้างโปรเจค

```
TaskAm/
├── server.ts          # Express backend + API routes + DB setup
├── src/
│   ├── App.tsx        # React frontend (ทุกหน้า/คอมโพเนนต์)
│   ├── main.tsx       # Entry point
│   └── index.css      # Tailwind + Fonts
├── index.html
├── .env.example       # ตัวอย่างค่า environment
├── package.json
├── vite.config.ts
└── tsconfig.json
```
