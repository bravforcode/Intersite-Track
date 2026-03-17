# Requirements Document

## Introduction

ฟีเจอร์นี้เป็นการเชื่อมต่อระบบบริหารจัดการงานกับ Trello เพื่อแสดงข้อมูลผู้รับผิดชอบแต่ละงาน (task) และอัปเดตข้อมูลใน Trello อัตโนมัติเมื่อมีการเปลี่ยนแปลงในระบบ ช่วยให้ทีมงานสามารถติดตามความคืบหน้าของงานผ่าน Trello board ได้แบบเรียลไทม์

## Glossary

- **System**: ระบบบริหารจัดการงาน (Task Management System)
- **Trello_API**: Trello REST API สำหรับการเชื่อมต่อและจัดการข้อมูล
- **Trello_Card**: การ์ดใน Trello ที่แสดงข้อมูลงาน
- **Task**: งานในระบบที่มีข้อมูลเช่น ชื่องาน, คำอธิบาย, ผู้รับผิดชอบ, วันที่กำหนด, ความคืบหน้า
- **Task_Assignment**: การมอบหมายงานให้กับผู้ใช้
- **Sync_Service**: บริการที่ทำหน้าที่ซิงค์ข้อมูลระหว่างระบบกับ Trello
- **Webhook**: กลไกที่ Trello ใช้แจ้งเตือนเมื่อมีการเปลี่ยนแปลงข้อมูล
- **Progress_Bar**: แถบแสดงความคืบหน้าของงาน
- **Checklist**: รายการตรวจสอบภายในงาน
- **Member**: สมาชิกใน Trello board ที่สามารถถูกมอบหมายให้กับการ์ด

## Requirements

### Requirement 1: เชื่อมต่อกับ Trello API

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการเชื่อมต่อระบบกับ Trello API เพื่อให้สามารถอ่านและเขียนข้อมูลไปยัง Trello board ได้

#### Acceptance Criteria

1. THE System SHALL เก็บ Trello API Key และ Token ในการตั้งค่าระบบ
2. THE System SHALL ตรวจสอบความถูกต้องของ API credentials ก่อนบันทึก
3. WHEN API credentials ไม่ถูกต้อง, THE System SHALL แสดงข้อความแจ้งเตือนที่ระบุสาเหตุ
4. THE System SHALL เข้ารหัส API credentials ก่อนเก็บในฐานข้อมูล
5. THE System SHALL เชื่อมต่อกับ Trello_API ผ่าน HTTPS

### Requirement 2: เชื่อมโยง Task กับ Trello Card

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการเชื่อมโยงงานในระบบกับการ์ดใน Trello เพื่อให้สามารถซิงค์ข้อมูลได้

#### Acceptance Criteria

1. THE System SHALL เก็บ Trello board URL ในการตั้งค่าระบบ
2. THE System SHALL แยก board ID จาก Trello board URL
3. WHEN ผู้ใช้สร้างงานใหม่, THE System SHALL สร้าง Trello_Card ใหม่ใน board ที่กำหนด
4. THE System SHALL เก็บ Trello card ID ในฐานข้อมูลของงาน
5. THE System SHALL แสดงลิงก์ไปยัง Trello_Card ในหน้ารายละเอียดงาน
6. WHERE งานมี Trello card ID อยู่แล้ว, THE System SHALL ไม่สร้างการ์ดใหม่

### Requirement 3: ซิงค์ข้อมูลพื้นฐานของงาน

**User Story:** ในฐานะผู้ใช้ ฉันต้องการให้ข้อมูลพื้นฐานของงานแสดงใน Trello เพื่อให้ทีมงานเห็นข้อมูลที่สำคัญ

#### Acceptance Criteria

1. WHEN งานถูกสร้าง, THE System SHALL ตั้งชื่อ Trello_Card ตามชื่องาน
2. WHEN งานถูกสร้าง, THE System SHALL ตั้งคำอธิบาย Trello_Card ตามคำอธิบายงาน
3. WHEN งานถูกสร้าง, THE System SHALL ตั้งวันครบกำหนดของ Trello_Card ตามวันกำหนดส่งงาน
4. WHEN ชื่องานถูกแก้ไข, THE System SHALL อัปเดตชื่อ Trello_Card ภายใน 5 วินาที
5. WHEN คำอธิบายงานถูกแก้ไข, THE System SHALL อัปเดตคำอธิบาย Trello_Card ภายใน 5 วินาที
6. WHEN วันกำหนดส่งถูกแก้ไข, THE System SHALL อัปเดตวันครบกำหนดของ Trello_Card ภายใน 5 วินาที

### Requirement 4: ซิงค์ผู้รับผิดชอบงาน

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นผู้รับผิดชอบงานใน Trello เพื่อให้รู้ว่าใครกำลังทำงานนี้อยู่

#### Acceptance Criteria

1. THE System SHALL เก็บการเชื่อมโยงระหว่าง user ID ในระบบกับ Trello member ID
2. WHEN งานถูกมอบหมายให้ผู้ใช้, THE System SHALL เพิ่ม Member ลงใน Trello_Card ภายใน 5 วินาที
3. WHEN ผู้ใช้ถูกถอดออกจากงาน, THE System SHALL ลบ Member ออกจาก Trello_Card ภายใน 5 วินาที
4. THE System SHALL แสดงรูปโปรไฟล์ของผู้รับผิดชอบบน Trello_Card
5. WHERE ผู้ใช้ในระบบไม่มี Trello member ID, THE System SHALL ข้ามการเพิ่ม Member และบันทึก log

### Requirement 5: ซิงค์ความคืบหน้าและ Checklist

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นความคืบหน้าของงานใน Trello เพื่อติดตามสถานะงาน

#### Acceptance Criteria

1. WHEN งานมี checklist, THE System SHALL สร้าง Trello checklist ใน Trello_Card
2. WHEN checklist item ถูกเพิ่ม, THE System SHALL เพิ่ม checklist item ใน Trello_Card ภายใน 5 วินาที
3. WHEN checklist item ถูกทำเครื่องหมายเสร็จ, THE System SHALL อัปเดตสถานะ checklist item ใน Trello_Card ภายใน 5 วินาที
4. WHEN checklist item ถูกลบ, THE System SHALL ลบ checklist item จาก Trello_Card ภายใน 5 วินาที
5. THE System SHALL คำนวณเปอร์เซ็นต์ความคืบหน้าจาก checklist และแสดงใน Trello_Card
6. THE System SHALL แสดง Progress_Bar บน Trello_Card ตามเปอร์เซ็นต์ความคืบหน้า

### Requirement 6: ซิงค์สถานะงาน

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นสถานะงานใน Trello เพื่อรู้ว่างานอยู่ในขั้นตอนใด

#### Acceptance Criteria

1. THE System SHALL เก็บการเชื่อมโยงระหว่างสถานะงานในระบบกับ Trello list ID
2. WHEN สถานะงานเปลี่ยน, THE System SHALL ย้าย Trello_Card ไปยัง list ที่สอดคล้องกันภายใน 5 วินาที
3. THE System SHALL เพิ่ม label บน Trello_Card ตามความสำคัญของงาน (low, medium, high, urgent)
4. WHEN ความสำคัญของงานเปลี่ยน, THE System SHALL อัปเดต label บน Trello_Card ภายใน 5 วินาที
5. WHERE งานมีสถานะ "completed", THE System SHALL เพิ่ม label สีเขียวที่ระบุ "เสร็จสิ้น"

### Requirement 7: แสดงข้อมูลวันที่และระยะเวลา

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นวันที่เริ่มต้น-สิ้นสุดและระยะเวลาของงานใน Trello เพื่อวางแผนงาน

#### Acceptance Criteria

1. THE System SHALL แสดงวันที่เริ่มต้นงานใน custom field ของ Trello_Card
2. THE System SHALL แสดงวันที่สิ้นสุดงานใน due date ของ Trello_Card
3. THE System SHALL คำนวณระยะเวลาของงานเป็นจำนวนวัน
4. THE System SHALL แสดงระยะเวลาในรูปแบบ "X วัน" ใน custom field ของ Trello_Card
5. WHEN วันที่เริ่มต้นหรือสิ้นสุดเปลี่ยน, THE System SHALL อัปเดต custom fields ภายใน 5 วินาที

### Requirement 8: อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง

**User Story:** ในฐานะผู้ใช้ ฉันต้องการให้ข้อมูลใน Trello อัปเดตอัตโนมัติเมื่อมีการแก้ไขในระบบ เพื่อไม่ต้องอัปเดตด้วยตนเอง

#### Acceptance Criteria

1. WHEN งานถูกสร้าง, THE Sync_Service SHALL ส่งข้อมูลไปยัง Trello_API ภายใน 5 วินาที
2. WHEN งานถูกแก้ไข, THE Sync_Service SHALL ส่งข้อมูลที่เปลี่ยนแปลงไปยัง Trello_API ภายใน 5 วินาที
3. WHEN งานถูกลบ, THE Sync_Service SHALL ลบ Trello_Card ภายใน 5 วินาที
4. WHEN checklist ถูกอัปเดต, THE Sync_Service SHALL ส่งข้อมูล checklist ไปยัง Trello_API ภายใน 5 วินาที
5. IF การเชื่อมต่อกับ Trello_API ล้มเหลว, THEN THE System SHALL บันทึก error log และลองใหม่อีกครั้งภายใน 30 วินาที
6. IF การลองใหม่ล้มเหลว 3 ครั้ง, THEN THE System SHALL แจ้งเตือนผู้ดูแลระบบ

### Requirement 9: รองรับการซิงค์แบบสองทาง (Optional)

**User Story:** ในฐานะผู้ใช้ ฉันต้องการให้การเปลี่ยนแปลงใน Trello อัปเดตกลับมาในระบบด้วย เพื่อให้ข้อมูลสอดคล้องกันทั้งสองระบบ

#### Acceptance Criteria

1. WHERE การซิงค์แบบสองทางเปิดใช้งาน, THE System SHALL ลงทะเบียน Webhook กับ Trello_API
2. WHERE การซิงค์แบบสองทางเปิดใช้งาน, WHEN Trello_Card ถูกแก้ไข, THE Webhook SHALL แจ้งเตือนระบบ
3. WHERE การซิงค์แบบสองทางเปิดใช้งาน, WHEN ได้รับการแจ้งเตือนจาก Webhook, THE System SHALL อัปเดตข้อมูลงานในฐานข้อมูล
4. WHERE การซิงค์แบบสองทางเปิดใช้งาน, THE System SHALL ป้องกันการซิงค์วนซ้ำ (infinite loop)
5. WHERE การซิงค์แบบสองทางเปิดใช้งาน, IF เกิด conflict ระหว่างข้อมูล, THEN THE System SHALL ใช้ข้อมูลที่อัปเดตล่าสุด

### Requirement 10: จัดการการตั้งค่าและการเชื่อมโยง

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการหน้าจอสำหรับจัดการการตั้งค่า Trello integration เพื่อควบคุมการเชื่อมต่อ

#### Acceptance Criteria

1. THE System SHALL แสดงหน้าจอการตั้งค่า Trello integration ในเมนู "ข้อมูลพื้นฐาน"
2. THE System SHALL อนุญาตให้ผู้ดูแลระบบกรอก Trello API Key, Token และ Board URL
3. THE System SHALL แสดงสถานะการเชื่อมต่อ (เชื่อมต่อแล้ว/ยังไม่เชื่อมต่อ)
4. THE System SHALL อนุญาตให้ผู้ดูแลระบบทดสอบการเชื่อมต่อ
5. THE System SHALL แสดงรายการ list ใน Trello board และอนุญาตให้เชื่อมโยงกับสถานะงาน
6. THE System SHALL อนุญาตให้ผู้ดูแลระบบเชื่อมโยงผู้ใช้ในระบบกับ Trello member
7. THE System SHALL อนุญาตให้ผู้ดูแลระบบเปิด/ปิดการซิงค์อัตโนมัติ
8. THE System SHALL อนุญาตให้ผู้ดูแลระบบเปิด/ปิดการซิงค์แบบสองทาง

### Requirement 11: แสดงสถานะการซิงค์

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเห็นสถานะการซิงค์ของงาน เพื่อรู้ว่าข้อมูลถูกส่งไปยัง Trello แล้วหรือยัง

#### Acceptance Criteria

1. THE System SHALL แสดงไอคอนสถานะการซิงค์ในรายการงาน
2. THE System SHALL แสดงไอคอนสีเขียวเมื่อข้อมูลซิงค์สำเร็จ
3. THE System SHALL แสดงไอคอนสีเหลืองเมื่อกำลังซิงค์ข้อมูล
4. THE System SHALL แสดงไอคอนสีแดงเมื่อการซิงค์ล้มเหลว
5. WHEN ผู้ใช้คลิกที่ไอคอนสถานะ, THE System SHALL แสดงรายละเอียดการซิงค์ล่าสุด
6. WHERE การซิงค์ล้มเหลว, THE System SHALL แสดงข้อความแจ้งข้อผิดพลาด
7. THE System SHALL อนุญาตให้ผู้ใช้ลองซิงค์ใหม่ด้วยตนเอง

### Requirement 12: บันทึก Log การซิงค์

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการดู log การซิงค์ เพื่อตรวจสอบและแก้ไขปัญหา

#### Acceptance Criteria

1. THE System SHALL บันทึก log ทุกครั้งที่มีการซิงค์ข้อมูล
2. THE System SHALL เก็บข้อมูล log อย่างน้อย: timestamp, task ID, action, status, error message (ถ้ามี)
3. THE System SHALL แสดงหน้าจอ log การซิงค์สำหรับผู้ดูแลระบบ
4. THE System SHALL อนุญาตให้กรอง log ตามวันที่, สถานะ และ task ID
5. THE System SHALL เก็บ log ไว้อย่างน้อย 30 วัน
6. THE System SHALL ลบ log ที่เก่ากว่า 30 วันอัตโนมัติ
