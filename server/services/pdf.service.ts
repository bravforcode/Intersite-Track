import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_PATH = path.join(process.cwd(), "server/assets/fonts/THSarabunNew.ttf");
const NOTO_FONT_PATH = path.join(process.cwd(), "server/assets/fonts/NotoSansThai-Regular.ttf");
const NOTO_BOLD_FONT_PATH = path.join(process.cwd(), "server/assets/fonts/NotoSansThai-Bold.ttf");

export const pdfService = {
  /**
   * Helper to draw a table row
   */
  drawTableRow(doc: PDFKit.PDFDocument, y: number, columns: { text: string; x: number; width?: number; align?: string }[]) {
    columns.forEach(col => {
      doc.text(col.text, col.x, y, { width: col.width, align: (col.align as any) || "left" });
    });
  },

  /**
   * Generate a PDF report for tasks
   */
  async generateTaskReport(tasks: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: "A4",
        info: {
          Title: "รายงานสรุปรายการงาน",
          Author: "Intersite Track System",
        }
      });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Register Thai font
      if (fs.existsSync(NOTO_FONT_PATH)) {
        doc.registerFont("ThaiFont", NOTO_FONT_PATH);
        if (fs.existsSync(NOTO_BOLD_FONT_PATH)) {
          doc.registerFont("ThaiFontBold", NOTO_BOLD_FONT_PATH);
        } else {
          doc.registerFont("ThaiFontBold", NOTO_FONT_PATH);
        }
        doc.font("ThaiFont");
      } else if (fs.existsSync(FONT_PATH)) {
        doc.registerFont("ThaiFont", FONT_PATH);
        doc.registerFont("ThaiFontBold", FONT_PATH);
        doc.font("ThaiFont");
      }

      // Header
      doc.fontSize(20).text("รายงานสรุปรายการงาน (Task Summary Report)", { align: "center" });
      doc.fontSize(10).text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`, { align: "right" });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(11);
      const cols = [
        { text: "ID", x: 50, width: 30 },
        { text: "ชื่องาน", x: 85, width: 180 },
        { text: "สถานะ", x: 270, width: 80 },
        { text: "ความคืบหน้า", x: 355, width: 70, align: "center" },
        { text: "กำหนดส่ง", x: 430, width: 70, align: "center" },
        { text: "ผู้รับผิดชอบ", x: 505, width: 45, align: "right" }
      ];

      this.drawTableRow(doc, tableTop, cols);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Content
      let y = tableTop + 25;
      tasks.forEach((task) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
          this.drawTableRow(doc, y, cols);
          doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
          y += 25;
        }

        const statusMap: Record<string, string> = {
          pending: "รอดำเนินการ",
          in_progress: "กำลังดำเนินการ",
          completed: "เสร็จสิ้น",
          cancelled: "ยกเลิก"
        };

        const staffNames = (task.assignments ?? [])
          .map((a: any) => `${a.first_name[0]}${a.last_name[0]}`)
          .join(", ");

        doc.fontSize(10);
        const rowHeight = Math.max(
          doc.heightOfString(task.title, { width: 180 }),
          15
        );

        this.drawTableRow(doc, y, [
          { text: task.id.toString(), x: 50, width: 30 },
          { text: task.title, x: 85, width: 180 },
          { text: statusMap[task.status] || task.status, x: 270, width: 80 },
          { text: `${task.progress}%`, x: 355, width: 70, align: "center" },
          { text: task.due_date || "-", x: 430, width: 70, align: "center" },
          { text: staffNames || "-", x: 505, width: 45, align: "right" }
        ]);

        y += rowHeight + 5;
        doc.moveTo(50, y - 2).lineTo(550, y - 2).dash(2, { space: 2 }).stroke().undash();
        y += 5;
      });

      // Footer - Page Number
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `หน้า ${i + 1} จาก ${range.count}`,
          50,
          doc.page.height - 50,
          { align: "center" }
        );
      }

      doc.end();
    });
  },

  /**
   * Generate a PDF report for staff workload
   */
  async generateStaffReport(staffData: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: "A4",
        info: {
          Title: "รายงานสรุปภาระงานพนักงาน",
          Author: "Intersite Track System",
        }
      });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      if (fs.existsSync(NOTO_FONT_PATH)) {
        doc.registerFont("ThaiFont", NOTO_FONT_PATH);
        if (fs.existsSync(NOTO_BOLD_FONT_PATH)) {
          doc.registerFont("ThaiFontBold", NOTO_BOLD_FONT_PATH);
        } else {
          doc.registerFont("ThaiFontBold", NOTO_FONT_PATH);
        }
        doc.font("ThaiFont");
      } else if (fs.existsSync(FONT_PATH)) {
        doc.registerFont("ThaiFont", FONT_PATH);
        doc.registerFont("ThaiFontBold", FONT_PATH);
        doc.font("ThaiFont");
      }

      doc.fontSize(20).text("รายงานสรุปภาระงานพนักงาน (Staff Workload Report)", { align: "center" });
      doc.fontSize(10).text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`, { align: "right" });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(11);
      const cols = [
        { text: "ชื่อ-นามสกุล", x: 50, width: 150 },
        { text: "งานทั้งหมด", x: 200, width: 60, align: "center" },
        { text: "กำลังทำ", x: 260, width: 60, align: "center" },
        { text: "เสร็จสิ้น", x: 320, width: 60, align: "center" },
        { text: "เกินกำหนด", x: 380, width: 60, align: "center" },
        { text: "ติดปัญหา", x: 440, width: 60, align: "center" },
        { text: "ความคืบหน้า", x: 500, width: 50, align: "right" }
      ];

      this.drawTableRow(doc, tableTop, cols);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 25;
      staffData.forEach((staff) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
          this.drawTableRow(doc, y, cols);
          doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
          y += 25;
        }

        const progress = staff.total_tasks ? Math.round((staff.completed / staff.total_tasks) * 100) : 0;

        doc.fontSize(10);
        this.drawTableRow(doc, y, [
          { text: `${staff.first_name} ${staff.last_name}`, x: 50, width: 150 },
          { text: staff.total_tasks.toString(), x: 200, width: 60, align: "center" },
          { text: staff.in_progress.toString(), x: 260, width: 60, align: "center" },
          { text: staff.completed.toString(), x: 320, width: 60, align: "center" },
          { text: staff.overdue.toString(), x: 380, width: 60, align: "center" },
          { text: (staff.blocked || 0).toString(), x: 440, width: 60, align: "center" },
          { text: `${progress}%`, x: 500, width: 50, align: "right" }
        ]);
        
        y += 20;
        doc.moveTo(50, y - 2).lineTo(550, y - 2).dash(2, { space: 2 }).stroke().undash();
        y += 5;
      });

      // Footer - Page Number
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `หน้า ${i + 1} จาก ${range.count}`,
          50,
          doc.page.height - 50,
          { align: "center" }
        );
      }

      doc.end();
    });
  }
};
