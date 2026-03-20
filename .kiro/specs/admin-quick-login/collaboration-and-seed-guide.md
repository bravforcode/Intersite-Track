# คู่มือ Quick Login และการเพิ่มผู้ร่วมดูแล Supabase

เอกสารนี้ใช้สำหรับตั้งค่า Quick Login ใน `development` และ `staging` เท่านั้น

คำเตือน:
- ห้ามรัน seed test accounts ใน `production`
- ห้ามเปิด `VITE_ENABLE_QUICK_LOGIN=true` ใน `production`
- บัญชีทดสอบทั้งหมดใช้โดเมน `.local` เพื่อบอกชัดเจนว่าไม่ใช่บัญชีใช้งานจริง

## 1. การเปิด Quick Login ให้แสดงบนหน้าเข้าสู่ระบบ

กำหนดค่าในไฟล์ `.env` ของ frontend:

```env
VITE_APP_ENV=development
VITE_ENABLE_QUICK_LOGIN=true
```

ค่าที่แนะนำ:
- `development`: แสดง Quick Login
- `staging`: แสดง Quick Login
- `production`: ซ่อน Quick Login อัตโนมัติ

หมายเหตุ:
- แม้จะตั้ง `VITE_ENABLE_QUICK_LOGIN=true` แต่ถ้า environment เป็น `production` ระบบจะไม่แสดงปุ่ม Quick Login

## 2. การ seed บัญชีทดสอบ

ไฟล์ seed:

`supabase/seeds/quick-login-test-accounts.sql`

บัญชีที่ถูกสร้าง:
- Admin: `admin@taskam.local` / `admin123`
- Staff: `somchai@taskam.local` / `staff123`

สิ่งที่สคริปต์ทำ:
- สร้างหรืออัปเดตผู้ใช้ใน `auth.users`
- สร้างหรืออัปเดต identity ใน `auth.identities`
- ตั้งค่า `email_confirmed_at` และ `confirmed_at` เพื่อข้ามขั้นตอนยืนยันอีเมลสำหรับบัญชีทดสอบ
- สร้างหรืออัปเดตโปรไฟล์ใน `public.users`
- รันซ้ำได้โดยไม่สร้างข้อมูลซ้ำ

ข้อมูลโปรไฟล์ที่ถูกบันทึก:
- Admin:
  `username = "Admin Test"`
  `role = "admin"`
- Staff:
  `username = "Somchai Test"`
  `role = "staff"`

### วิธีรันผ่าน Supabase Dashboard

1. เปิด Supabase Dashboard ของโปรเจกต์ `Intersite Track`
2. ไปที่ `SQL Editor`
3. เปิดไฟล์ `supabase/seeds/quick-login-test-accounts.sql`
4. คัดลอก SQL ทั้งไฟล์แล้วรัน
5. ตรวจสอบผลใน:
   `Authentication -> Users`
   และ `Table Editor -> public.users`

### วิธีรันผ่าน psql

```bash
psql "$DATABASE_URL" -f supabase/seeds/quick-login-test-accounts.sql
```

### เช็กลิสต์หลังรัน

1. เห็นผู้ใช้ `admin@taskam.local` และ `somchai@taskam.local` ใน `Authentication -> Users`
2. เห็นแถวคู่กันใน `public.users`
3. ล็อกอินผ่านหน้าเว็บด้วยปุ่ม Quick Login ได้ทั้ง 2 บทบาท

## 3. การเพิ่มผู้ร่วมดูแล Supabase

แนวทางใน dashboard อาจต่างกันเล็กน้อยตาม plan และ UI รุ่นที่ใช้อยู่

path ที่ให้ใช้ก่อน:
- `Project Settings -> Team -> Invite Member`

ถ้า dashboard รุ่นใหม่พาออกไปที่ระดับ organization ให้ใช้:
- `Organization Settings -> Team`

### ขั้นตอน

1. เปิดโปรเจกต์ใน Supabase Dashboard
2. ไปที่ `Project Settings -> Team -> Invite Member`
3. กรอกอีเมลของผู้ร่วมงาน
4. เลือก role เป็น `Administrator`
5. ส่งคำเชิญ
6. ให้ผู้รับเปิดอีเมลและกดรับคำเชิญก่อนจึงจะเข้าใช้งานได้

### สิทธิ์ของ role `Administrator`

`Administrator` เหมาะกับการให้ทีมช่วยดูแลโปรเจกต์ร่วมกัน เพราะมีสิทธิ์สูงใน project และ organization resources ส่วนใหญ่ เช่น:
- เข้าถึงฐานข้อมูลและเครื่องมืออย่าง SQL Editor / Table Editor
- จัดการ Authentication และดูรายชื่อผู้ใช้
- ดูค่าการเชื่อมต่อและ API keys ของโปรเจกต์
- ดูและจัดการการตั้งค่าบิลลิงได้ในขอบเขตที่ระบบอนุญาต
- จัดการสมาชิกระดับ Administrator / Developer ได้

ข้อจำกัดสำคัญ:
- ไม่สามารถแก้ organization settings บางส่วน
- ไม่สามารถโอนโปรเจกต์ออกจาก organization
- ไม่สามารถเพิ่ม owner ใหม่แทน role `Owner`

## 4. ข้อเสนอแนะสำหรับทีม

- ใช้ Quick Login เฉพาะเครื่องพัฒนาและ environment ทดสอบ
- ถ้าต้องการปิดชั่วคราวใน staging ให้ตั้ง `VITE_ENABLE_QUICK_LOGIN=false`
- ถ้าทีมต้องแชร์สิทธิ์ดูฐานข้อมูลและ auth ร่วมกัน ให้ใช้ role `Administrator` แทนการแชร์ account เดียว
