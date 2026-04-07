const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber
} = require("docx");
const fs = require("fs");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Sarabun", color: "1B5E93" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Sarabun", color: "2E75B6" })],
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Sarabun", color: "1F4E79" })],
  });
}

function para(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Sarabun", ...options })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, size: 22, font: "Sarabun" })],
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 720 },
    children: [new TextRun({ text, size: 20, font: "Courier New", color: "C7254E" })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
    children: [],
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        margins: cellMargins,
        width: { size: i === 0 ? 3000 : 3120, type: WidthType.DXA },
        shading: isHeader ? { fill: "2E75B6", type: ShadingType.CLEAR } : undefined,
        children: [new Paragraph({
          children: [new TextRun({
            text,
            size: 20,
            font: "Sarabun",
            bold: isHeader,
            color: isHeader ? "FFFFFF" : "000000",
          })],
        })],
      })
    ),
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Sarabun", size: 22 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Intersite Track — คู่มือการใช้งาน", size: 18, font: "Sarabun", color: "666666" })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "หน้า ", size: 18, font: "Sarabun", color: "666666" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Sarabun", color: "666666" }),
          ],
        })],
      }),
    },
    children: [
      // ===================== COVER =====================
      new Paragraph({ spacing: { before: 1440 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "Intersite Track", bold: true, size: 56, font: "Sarabun", color: "1B5E93" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "คู่มือการใช้งานระบบ", size: 36, font: "Sarabun", color: "2E75B6" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "Task Management + Holiday Schedule + Saturday Duty Roster", size: 24, font: "Sarabun", color: "555555" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        children: [new TextRun({ text: "เวอร์ชัน 1.0  |  อัปเดต: 7 เมษายน 2569", size: 20, font: "Sarabun", color: "888888" })],
      }),

      divider(),

      // ===================== SECTION 1 =====================
      heading1("1. ภาพรวมระบบ"),
      para("Intersite Track เป็นระบบบริหารจัดการงานภายในองค์กร ครอบคลุม 3 ส่วนหลัก:"),
      bullet("Task Management — มอบหมายและติดตามงาน"),
      bullet("Holiday Schedule — ตารางวันหยุดประจำปี"),
      bullet("Saturday Duty Roster — ตารางเวรทำงานวันเสาร์"),
      para(""),
      para("ระบบส่งการแจ้งเตือนผ่าน LINE Messaging API ไปหาพนักงานแต่ละคน"),

      divider(),

      // ===================== SECTION 2 =====================
      heading1("2. การตั้งค่า LINE Bot"),
      heading2("2.1 เพิ่ม Bot เป็นเพื่อน (ทำหนึ่งครั้งต่อคน)"),
      para("พนักงานทุกคนต้องเพิ่ม bot gracia เป็นเพื่อนใน LINE เพื่อรับการแจ้งเตือน"),
      para(""),
      heading3("วิธี A: ใช้ LINE ID"),
      bullet("เปิดแอป LINE"),
      bullet("กดค้นหา → พิมพ์  @441sptre"),
      bullet("กด เพิ่มเพื่อน"),
      para(""),
      heading3("วิธี B: ใช้ QR Code"),
      bullet("ไปที่ LINE OA Manager: https://manager.line.biz"),
      bullet("เลือก account gracia → หา QR code"),
      bullet("Scan จากแอป LINE บนมือถือ"),
      para(""),
      heading2("2.2 ประเภทการแจ้งเตือน"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3000, 2513, 3513],
        rows: [
          tableRow(["ประเภท", "ส่งถึง", "ผู้รับ"], true),
          tableRow(["Task ใหม่", "DM ส่วนตัว", "คนที่ได้รับมอบหมาย"]),
          tableRow(["Deadline เตือน (3 วัน)", "DM ส่วนตัว", "คนรับผิดชอบ"]),
          tableRow(["Blocker แจ้ง", "DM ส่วนตัว", "คนรับผิดชอบ + Admin"]),
          tableRow(["วันหยุดประจำปี", "Broadcast", "ทุกคนที่ add bot"]),
          tableRow(["เวรวันเสาร์", "Broadcast", "ทุกคนที่ add bot"]),
        ],
      }),

      divider(),

      // ===================== SECTION 3 =====================
      heading1("3. การใช้งาน Dashboard"),
      heading2("3.1 หน้าแรก — Dashboard"),
      para("แสดงภาพรวมการใช้งาน:"),
      bullet("Tasks — งานที่ได้รับมอบหมาย และ Deadline ใกล้"),
      bullet("Calendar — วันหยุดถัดไป พร้อมนับถอยหลัง"),
      bullet("Saturday Duty — เวรทำงานวันเสาร์สัปดาห์นี้"),

      heading2("3.2 Tab: Tasks"),
      bullet("ดูงาน — ดับเบิลคลิก task เพื่อดูรายละเอียด"),
      bullet("เพิ่มงาน — กด + New Task → กรอกชื่องาน, คำอธิบาย, กำหนดส่ง, ผู้รับผิดชอบ"),
      bullet("อัปเดตสถานะ — เปลี่ยน Status: To Do → In Progress → Done"),
      bullet("Blocker — กดไอคอน เพื่อแจ้งปัญหา (แจ้ง Admin อัตโนมัติ)"),

      heading2("3.3 Tab: Holidays"),
      bullet("ดูวันหยุดประจำปี พร้อมตัวกรองตามปี/เดือน"),
      bullet("แสดงนับถอยหลังวันหยุดถัดไป"),
      bullet("Admin เท่านั้น: เพิ่ม / แก้ไข / ลบวันหยุด"),

      heading2("3.4 Tab: Saturday Schedule"),
      bullet("ดูตารางเวรทำงานวันเสาร์"),
      bullet("พนักงาน: กด Join as Volunteer เพื่อเข้าร่วมเวร"),
      bullet("Admin เท่านั้น: เพิ่มเวร (Add Single หรือ Import CSV)"),

      divider(),

      // ===================== SECTION 4 =====================
      heading1("4. ขั้นตอนการทำงาน"),
      heading2("4.1 Task Management"),
      para(""),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [500, 2526, 6000],
        rows: [
          tableRow(["ขั้น", "ผู้ดำเนินการ", "การกระทำ"], true),
          tableRow(["1", "Admin/หัวหน้า", "สร้าง Task + เลือกผู้รับผิดชอบ"]),
          tableRow(["2", "ระบบ", "ส่งแจ้งเตือน LINE DM ให้ผู้รับ"]),
          tableRow(["3", "พนักงาน", "เปลี่ยน Status เป็น In Progress"]),
          tableRow(["4", "พนักงาน", "ทำงาน — ถ้าติดปัญหากด Blocker"]),
          tableRow(["5", "ระบบ", "แจ้ง Admin ถ้ามี Blocker"]),
          tableRow(["6", "พนักงาน", "เปลี่ยน Status เป็น Done"]),
        ],
      }),

      heading2("4.2 การแจ้งเตือนวันหยุด"),
      bullet("ทุกวันจันทร์ — สรุปวันหยุดสัปดาห์นี้ (Broadcast)"),
      bullet("วันก่อนวันหยุด — แจ้งเตือนล่วงหน้า 1 วัน (Broadcast)"),
      bullet("วันหยุด — แจ้งเตือนวันนี้วันหยุด (Broadcast)"),

      heading2("4.3 การแจ้งเตือนเวรวันเสาร์"),
      bullet("ทุกวันศุกร์ — แจ้งเตือนผู้มีเวรวันเสาร์ถัดไป"),
      bullet("ผู้มีเวร — รับ DM ส่วนตัว"),
      bullet("ทุกคน — รับ Broadcast สรุปรายชื่อผู้มีเวร"),

      divider(),

      // ===================== SECTION 5 =====================
      heading1("5. วันหยุดประจำปี 2569"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2500, 6526],
        rows: [
          tableRow(["วันที่", "ชื่อวันหยุด"], true),
          tableRow(["1 มกราคม 2569", "วันขึ้นปีใหม่"]),
          tableRow(["3 มีนาคม 2569", "วันมาฆบูชา"]),
          tableRow(["13-15 เมษายน 2569", "วันสงกรานต์"]),
          tableRow(["1 พฤษภาคม 2569", "วันแรงงานแห่งชาติ"]),
          tableRow(["1 มิถุนายน 2569", "วันหยุดชดเชย วันวิสาขบูชา"]),
          tableRow(["3 มิถุนายน 2569", "วันเฉลิมพระชนมพรรษา สมเด็จพระบรมราชินี"]),
          tableRow(["28 กรกฎาคม 2569", "วันเฉลิมพระชนมพรรษา รัชกาลที่ 10"]),
          tableRow(["29 กรกฎาคม 2569", "วันอาสาฬหบูชา"]),
          tableRow(["12 สิงหาคม 2569", "วันแม่แห่งชาติ"]),
          tableRow(["13 ตุลาคม 2569", "วันนวมินทรมหาราช"]),
          tableRow(["23 ตุลาคม 2569", "วันปิยมหาราช"]),
          tableRow(["5 ธันวาคม 2569", "วันพ่อแห่งชาติ"]),
          tableRow(["31 ธันวาคม 2569", "วันสิ้นปี"]),
        ],
      }),

      divider(),

      // ===================== SECTION 6 =====================
      heading1("6. คำถามที่พบบ่อย (FAQ)"),

      heading3("Q: ทำไมไม่ได้รับแจ้งเตือน LINE?"),
      bullet("ตรวจสอบว่า add @441sptre แล้ว"),
      bullet("ตรวจสอบ LINE Settings → Notifications → เปิดการแจ้งเตือนจาก gracia"),
      bullet("ลองส่งข้อความหา bot เพื่อทดสอบการเชื่อมต่อ"),

      heading3("Q: เวรวันเสาร์สามารถแก้ไขได้ไหม?"),
      bullet("ติดต่อ Admin เท่านั้น (ระบบจำกัดสิทธิ์เพื่อความถูกต้อง)"),

      heading3("Q: วันหยุดที่แสดงไม่ครบ?"),
      bullet("ติดต่อ Admin เพื่อเพิ่มวันหยุด ผ่าน Tab Holidays"),

      heading3("Q: ลืมรหัสผ่าน?"),
      bullet("ติดต่อ Admin เพื่อรีเซ็ตรหัสผ่านผ่านระบบ"),

      heading3("Q: bot ตอบ message ได้ไหม?"),
      bullet("ปัจจุบัน bot ส่งแจ้งเตือนเท่านั้น ยังไม่รองรับการตอบโต้"),

      divider(),

      // ===================== SECTION 7 =====================
      heading1("7. ข้อมูลติดต่อ"),
      para("LINE Bot ID: @441sptre  (gracia)"),
      para("LINE OA Manager: https://manager.line.biz"),
      para("Firebase Console: https://console.firebase.google.com"),
      para("Project ID: internsite-f9cd7"),
      para(""),
      para("อัปเดตล่าสุด: 7 เมษายน 2569  |  เวอร์ชัน 1.0", { color: "888888", italics: true }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Intersite-Track-Guide.docx", buffer);
  console.log("✅ สร้างไฟล์ Intersite-Track-Guide.docx เรียบร้อย!");
});
