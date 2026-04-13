# คู่มือ Quick Login และการเพิ่มผู้ร่วมดูแล Firebase

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

## 2. การเตรียมบัญชีทดสอบ

บัญชีที่ถูกสร้าง:
- Admin: `admin@taskam.local` / `admin123`
- Staff: `somchai@taskam.local` / `staff123`

แนวทางปัจจุบัน:
- สร้างบัญชีผ่านหน้า Sign Up ของระบบ หรือผ่าน Firebase Console > Authentication
- สร้างหรือแก้ไขโปรไฟล์ใน Firestore collection `users`
- กำหนด `role` เป็น `admin` หรือ `staff` ให้ตรงกับ Quick Login card ที่หน้าเว็บใช้
- ใช้อีเมลโดเมน `.local` เพื่อแยกจากบัญชีใช้งานจริง

ข้อมูลโปรไฟล์ที่ถูกบันทึก:
- Admin:
  `username = "Admin Test"`
  `role = "admin"`
- Staff:
  `username = "Somchai Test"`
  `role = "staff"`

### วิธีเตรียมข้อมูลผ่าน Firebase Console

1. เปิด Firebase Console ของโปรเจกต์ `internsite-f9cd7`
2. ไปที่ `Authentication` แล้วสร้างผู้ใช้ `admin@taskam.local` และ `somchai@taskam.local`
3. ไปที่ `Firestore Database` แล้วสร้างหรือแก้ไข document ใน collection `users` โดยใช้ `uid` ของผู้ใช้แต่ละคนเป็น document id
4. ใส่ข้อมูลอย่างน้อย:
   - `email`
   - `username`
   - `role`
   - `first_name`
   - `last_name`
5. ตรวจสอบว่าหน้า Login สามารถใช้ Quick Login ได้ทั้ง 2 บทบาท

### เช็กลิสต์หลังรัน

1. เห็นผู้ใช้ `admin@taskam.local` และ `somchai@taskam.local` ใน `Authentication -> Users`
2. เห็น document คู่กันใน Firestore collection `users`
3. ล็อกอินผ่านหน้าเว็บด้วยปุ่ม Quick Login ได้ทั้ง 2 บทบาท

## 3. การเพิ่มผู้ร่วมดูแล Firebase

แนวทางใน dashboard อาจต่างกันเล็กน้อยตาม plan และ UI รุ่นที่ใช้อยู่

path ที่ให้ใช้ก่อน:
- `Project Settings -> Team -> Invite Member`

ถ้า dashboard รุ่นใหม่พาออกไปที่ระดับ organization ให้ใช้:
- `Organization Settings -> Team`

### ขั้นตอน

1. เปิดโปรเจกต์ใน Firebase หรือ Google Cloud Console
2. ไปที่หน้าจัดการ IAM หรือ Team access ที่ใช้งานอยู่
3. กรอกอีเมลของผู้ร่วมงาน
4. เลือก role เป็น `Administrator`
5. ส่งคำเชิญ
6. ให้ผู้รับเปิดอีเมลและกดรับคำเชิญก่อนจึงจะเข้าใช้งานได้

### สิทธิ์ที่ควรให้ทีมร่วมดูแล

แนะนำให้ให้สิทธิ์เฉพาะเท่าที่จำเป็นสำหรับ:
- Authentication
- Firestore Database
- Project configuration
- Deployment และ environment management

หลีกเลี่ยงการให้ owner-level access ถ้าไม่จำเป็น

## 4. ข้อเสนอแนะสำหรับทีม

- ใช้ Quick Login เฉพาะเครื่องพัฒนาและ environment ทดสอบ
- ถ้าต้องการปิดชั่วคราวใน staging ให้ตั้ง `VITE_ENABLE_QUICK_LOGIN=false`
- ถ้าทีมต้องแชร์สิทธิ์ดูฐานข้อมูลและ auth ร่วมกัน ให้ใช้ IAM role ที่จำกัดขอบเขตงานแทนการแชร์ account เดียว
