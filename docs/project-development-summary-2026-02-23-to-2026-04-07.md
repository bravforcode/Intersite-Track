# รายงานสรุปความก้าวหน้าการพัฒนาโปรเจกต์
## Intersite Track | Week 8 - Week 12

**โปรเจกต์:** TaskAm / Intersite Track  
**ช่วงที่สรุป:** Week 8 - Week 12  
**รูปแบบเอกสาร:** สรุปงานแบบ Trello List + Cards สำหรับแนบรายงาน  
**อ้างอิงสัปดาห์จาก:** เริ่มฝึกงาน `2026-01-12`  

| Week | ช่วงวันที่ |
| --- | --- |
| Week 8 | 2 มี.ค. 2026 - 8 มี.ค. 2026 |
| Week 9 | 9 มี.ค. 2026 - 15 มี.ค. 2026 |
| Week 10 | 16 มี.ค. 2026 - 22 มี.ค. 2026 |
| Week 11 | 23 มี.ค. 2026 - 29 มี.ค. 2026 |
| Week 12 | 30 มี.ค. 2026 - 5 เม.ย. 2026 |

> หมายเหตุ  
> 1. เอกสารฉบับนี้จัดรูปแบบให้เหมาะสำหรับการนำเสนอและการแคปภาพแนบรายงาน  
> 2. Week 8 - Week 9 และบางส่วนของ Week 11 สรุปจาก specs, docs, scripts และ artefacts ใน repo เนื่องจากไม่มี commit ตรงในช่วงดังกล่าว  
> 3. งานวันที่ `7 เม.ย. 2026` อยู่ใน Week 13 จึงยังไม่รวมในฉบับนี้ตามขอบเขตที่กำหนด

---

## List: Week 8
### 2 มีนาคม 2026 - 8 มีนาคม 2026

### Card W8-1 | Project Scope
- งาน: นิยามให้ระบบใหม่ต้องเป็นมากกว่า task tracker และรองรับงานจริงในองค์กร
- ผลลัพธ์: ได้ scope หลักคือ auth, task, staff, notifications, reports และ integrations
- หลักฐาน: `.kiro/specs/intersite-track/requirements.md`
- ภาพประกอบที่ควรแนบ: หน้า requirements หรือสรุปขอบเขตฟีเจอร์

### Card W8-2 | Frontend Structure
- งาน: วางโครง `auth / dashboard / tasks / staff / reports / settings / notifications`
- ผลลัพธ์: ลดปัญหา `App.tsx` แบบก้อนใหญ่และเตรียมพร้อมสำหรับการขยายระบบ
- หลักฐาน: `.kiro/specs/intersite-track/design.md`
- ภาพประกอบที่ควรแนบ: แผนผังโครงสร้าง `src/`

### Card W8-3 | Backend Structure
- งาน: แยก `routes`, `controllers`, `middleware`, `database`, `utils`
- ผลลัพธ์: backend พร้อมรองรับ business logic ที่ซับซ้อนและเปลี่ยน data source ได้ง่ายขึ้น
- หลักฐาน: `.kiro/specs/intersite-track/design.md`
- ภาพประกอบที่ควรแนบ: แผนผังโครงสร้าง `server/`

### Card W8-4 | Deployment Plan
- งาน: กำหนดให้ระบบต้องพร้อม production และ backend เป็นผู้คุมสิทธิ์จริง
- ผลลัพธ์: ได้แนวทางสำหรับ Vercel deployment, env separation และ auth middleware
- หลักฐาน: `.kiro/specs/intersite-track/requirements.md`
- ภาพประกอบที่ควรแนบ: ส่วน deployment / auth requirement

### Card W8-5 | Trello Integration
- งาน: วาง flow สำหรับ Trello sync, webhook, retry และ sync logs
- ผลลัพธ์: integration ถูกคิดไว้ตั้งแต่ก่อนลง implementation จริง
- หลักฐาน: `.kiro/specs/trello-integration-auto-update/design.md`
- ภาพประกอบที่ควรแนบ: Trello integration design

---

## List: Week 9
### 9 มีนาคม 2026 - 15 มีนาคม 2026

### Card W9-1 | Rebrand Plan
- งาน: วางทิศทางผลิตภัณฑ์ใหม่และเตรียม rename ระบบทั้งชุด
- ผลลัพธ์: ระบบถูกยกระดับจาก prototype ไปสู่ internal platform ที่มี identity ชัดเจน
- หลักฐาน: `README` เวอร์ชันใหม่และ design docs
- ภาพประกอบที่ควรแนบ: โลโก้หรือชื่อระบบใน README

### Card W9-2 | Auth Migration
- งาน: เลือก `Supabase Auth + Supabase PostgreSQL` เป็นแกนของระบบรุ่นใหม่
- ผลลัพธ์: ได้ migration direction สำหรับ login, profile และ database access
- หลักฐาน: `.kiro/specs/intersite-track/design.md`
- ภาพประกอบที่ควรแนบ: auth flow หรือ data flow diagram

### Card W9-3 | Schema Review
- งาน: ทบทวนว่าระบบต้องมี comments, audit logs และข้อมูลเสริมอื่น ๆ
- ผลลัพธ์: เตรียมฐานสำหรับ migration และฟีเจอร์ใช้งานจริงในสัปดาห์ถัดไป
- หลักฐาน: `supabase/migrations/20260318000000_premium_features.sql`
- ภาพประกอบที่ควรแนบ: schema migration ส่วน comments / audit logs

### Card W9-4 | Refactor Checklist
- งาน: แตกโจทย์ใหญ่เป็นหมวด frontend, backend, auth, deploy และ integrations
- ผลลัพธ์: ลงมือ refactor ได้เป็นระบบ ไม่กระโดดแก้เฉพาะหน้า
- หลักฐาน: `.kiro/specs/intersite-track/tasks.md`
- ภาพประกอบที่ควรแนบ: tasks checklist

---

## List: Week 10
### 16 มีนาคม 2026 - 22 มีนาคม 2026

### Card W10-1 | Baseline Import
- งาน: นำไฟล์ระบบเดิมเข้ามาและเก็บ continuity ของ main เดิมไว้
- ผลลัพธ์: มีจุดเริ่มต้นที่ชัดเจนก่อนทำ refactor ครั้งใหญ่
- หลักฐาน: commit `3793a74`, `b683b43`
- ภาพประกอบที่ควรแนบ: history หรือโครงสร้างไฟล์ก่อนรีแฟกเตอร์

### Card W10-2 | Intersite Upgrade
- งาน: รีแบรนด์ระบบและย้ายไป `Supabase Auth + PostgreSQL`
- ผลลัพธ์: ได้โครงใหม่ทั้ง frontend และ backend พร้อม flow login ที่ครบขึ้น
- หลักฐาน: commit `a0270db`
- ภาพประกอบที่ควรแนบ: หน้า Login หรือ README ใหม่

### Card W10-3 | UI Refresh
- งาน: เพิ่ม motion, ปรับ typography, ปรับ light theme และ interaction หลายจุด
- ผลลัพธ์: หน้าตาระบบดูเป็น production มากขึ้น
- หลักฐาน: commit `a0270db`, `fab76a1`
- ภาพประกอบที่ควรแนบ: หน้า dashboard, sidebar หรือ login

### Card W10-4 | Vercel Deploy
- งาน: เพิ่ม `vercel.json`, แก้ routing, แก้ env fallback และ auth behavior บน production
- ผลลัพธ์: ระบบเริ่ม deploy ได้จริงและลดปัญหา runtime
- หลักฐาน: commit `41235a3`, `57fbbb9`, `5f2b94c`, `f40e0b6`, `b371c42`, `90735a1`
- ภาพประกอบที่ควรแนบ: `vercel.json` หรือผัง deployment

### Card W10-5 | Schema Completion
- งาน: เพิ่ม `task_comments`, `task_audit_logs` และ index/policy ที่จำเป็น
- ผลลัพธ์: รองรับ comment history และ audit trail ได้ครบขึ้น
- หลักฐาน: commit `bbd867a`, `supabase/migrations/20260318220000_schema_completion.sql`
- ภาพประกอบที่ควรแนบ: migration file

### Card W10-6 | Core Overhaul
- งาน: ปรับ auth controller/middleware, task flow, report flow, user flow และ frontend services
- ผลลัพธ์: ระบบแกนกลางเริ่มใช้งานจริงได้ในระดับองค์กร
- หลักฐาน: commit `1166bd0`
- ภาพประกอบที่ควรแนบ: `src/App.tsx`, `TasksPage`, `StaffPage`, `ReportsPage`

### Card W10-7 | Trello Route Fix
- งาน: ลดการผูกกับ `pg` runtime และ mount Trello routes ใต้ `/api/trello`
- ผลลัพธ์: integration path และ runtime behavior ชัดเจนขึ้น
- หลักฐาน: commit `9d91c64`, `80330dd`
- ภาพประกอบที่ควรแนบ: `server/routes/trello.routes.ts`

---

## List: Week 11
### 23 มีนาคม 2026 - 29 มีนาคม 2026

### Card W11-1 | Flow Stabilization
- งาน: ตรวจจุดค้างจาก auth/task/report flow หลังการยกเครื่องรอบใหญ่
- ผลลัพธ์: ระบบนิ่งขึ้นก่อนเข้าสู่เฟสขยายฟีเจอร์รอบถัดไป
- หลักฐาน: ช่วงนี้ใน repo เป็นงานเก็บรายละเอียดต่อเนื่องก่อน commit ปลายเดือน
- ภาพประกอบที่ควรแนบ: task flow หรือ report flow ที่ใช้งานได้แล้ว

### Card W11-2 | Data Follow-ups
- งาน: รวบรวมสิ่งที่ยังขาดจากการใช้ข้อมูลจริงและงาน follow-up
- ผลลัพธ์: มีรายการ gap ที่ต้องตามเก็บก่อนส่งมอบ
- หลักฐาน: `docs/followups/20260328-missing-real-shop-media.csv`
- ภาพประกอบที่ควรแนบ: follow-up sheet หรือ checklist

### Card W11-3 | Dev Assets
- งาน: จัดระเบียบสิ่งที่จะตามมา เช่น docs, checks, Storybook และ load tests
- ผลลัพธ์: โปรเจกต์เริ่มมีมิติของทีมพัฒนา ไม่ใช่แค่ตัวแอป
- หลักฐาน: สิ่งเหล่านี้ถูก commit ต้นสัปดาห์ถัดไป แต่เป็นงานเตรียมจากช่วงนี้
- ภาพประกอบที่ควรแนบ: โครง `storybook`, `k6-tests`, `check_db`

### Card W11-4 | Project Planning
- งาน: เตรียมทิศทางของ project module, workload และ reporting รอบใหม่
- ผลลัพธ์: มีฐานคิดสำหรับขยายระบบจากงานราย task ไปสู่ระดับโครงการ
- หลักฐาน: การเปลี่ยนแปลงที่ลงจริงใน Week 12
- ภาพประกอบที่ควรแนบ: wireframe หรือหน้า Projects ที่เริ่มเป็นรูปเป็นร่าง

---

## List: Week 12
### 30 มีนาคม 2026 - 5 เมษายน 2026

### Card W12-1 | Route Sync
- งาน: รวมการปรับปรุงของ server, auth และ task routes ให้เข้ารูป
- ผลลัพธ์: baseline ใหม่พร้อมขยายฟีเจอร์รอบใหญ่
- หลักฐาน: commit `0ff1a2f`
- ภาพประกอบที่ควรแนบ: diff summary หรือ route structure

### Card W12-2 | Docs & Load Test
- งาน: เพิ่ม `.storybook`, `k6-tests`, `check_db`, `demo`, `docs/followups`
- ผลลัพธ์: โปรเจกต์มี support assets สำหรับพัฒนา, demo และตรวจสอบคุณภาพ
- หลักฐาน: commit `10c9e56`
- ภาพประกอบที่ควรแนบ: โฟลเดอร์ `k6-tests` หรือ `.storybook`

### Card W12-3 | Staff Update
- งาน: เพิ่ม field email, รองรับ inline edit role/position และเปิด flags ที่จำเป็น
- ผลลัพธ์: staff management ใช้งานจริงได้สะดวกขึ้น
- หลักฐาน: commit `f3f9bd8`
- ภาพประกอบที่ควรแนบ: หน้า Staff หรือ `UserFormModal`

### Card W12-4 | Local Sync
- งาน: รวมจุดย่อยที่ตกค้างให้กลับมาเป็น baseline ที่อ่านง่าย
- ผลลัพธ์: พร้อมเข้าสู่เฟส project module แบบ end-to-end
- หลักฐาน: commit `26a519a`
- ภาพประกอบที่ควรแนบ: git history ช่วงปลายเดือน

### Card W12-5 | Project Module
- งาน: เพิ่ม `projects`, `project_milestones`, `blockers`, `project_weekly_updates` และเชื่อม `task -> project`
- ผลลัพธ์: ระบบขยายจาก task tracking ไปสู่ project operations ได้จริง
- หลักฐาน: commit `b807ceb`, `supabase/migrations/20260401000000_project_module.sql`
- ภาพประกอบที่ควรแนบ: หน้า Projects หรือ schema project module

### Card W12-6 | PDF Report
- งาน: เพิ่ม PDF service, ฟอนต์ไทย และปรับรายงานให้ใช้ข้อมูลจริง
- ผลลัพธ์: รายงานพร้อมใช้สำหรับงานเอกสารและการสื่อสารภายใน
- หลักฐาน: commit `b807ceb`, `docs/improvements-report.md`
- ภาพประกอบที่ควรแนบ: หน้า Reports หรือไฟล์ PDF output

### Card W12-7 | LINE Notification
- งาน: เพิ่ม `line.service.ts`, cron logic และ `line_user_id` ในระบบผู้ใช้
- ผลลัพธ์: ระบบเริ่ม push notification ออกไปยังผู้ใช้ได้จริง
- หลักฐาน: commit `b807ceb`, `supabase/migrations/20260401120000_add_line_user_id.sql`
- ภาพประกอบที่ควรแนบ: LINE settings หรือ user profile field

### Card W12-8 | Task Metadata
- งาน: เพิ่ม `status`, `color`, `tags` ให้ projects และ `tags` ให้ tasks
- ผลลัพธ์: รองรับการจัดกลุ่มงานและกรองข้อมูลได้ดีขึ้น
- หลักฐาน: `supabase/migrations/20260401130000_enhance_projects.sql`, `supabase/migrations/20260401140000_add_task_tags.sql`
- ภาพประกอบที่ควรแนบ: project form หรือ task filter

### Card W12-9 | Dashboard & PWA
- งาน: เพิ่ม `WorkloadPage`, ปรับ `DashboardPage`, เพิ่ม `manifest.json` และอัปเดตคู่มือผู้ใช้
- ผลลัพธ์: ระบบพร้อมขึ้นทั้งในมุมผู้ใช้งานและการส่งมอบ
- หลักฐาน: commit `b807ceb`, `docs/user-manual-updated.md`
- ภาพประกอบที่ควรแนบ: Dashboard, Workload หรือ manifest

---

## Summary Card

### Card FINAL | Week 8 - Week 12 Summary
- Week 8: วาง architecture และ direction ของระบบใหม่
- Week 9: เตรียมรีแบรนด์และ migration path
- Week 10: ยกเครื่องระบบครั้งใหญ่ทั้ง auth, tasks, UI และ deploy
- Week 11: เก็บรายละเอียดและเตรียม assets/expansion
- Week 12: ขยายสู่ project module, reports, LINE workflow และ support assets

**สรุปภาพรวม**
- ช่วง Week 8 - Week 12 เป็นช่วงที่โปรเจกต์ถูกพัฒนาจากฐานเดิมของ TaskAm ไปสู่ Intersite Track ที่มี architecture ชัดเจน ใช้งานได้จริง และพร้อมต่อยอดในระดับองค์กร
