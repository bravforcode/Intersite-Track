const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak, TableOfContents
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

function bullet(text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, size: 22, font: "Sarabun" })],
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 720 },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: "E8E8E8" } },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text, size: 19, font: "Courier New", color: "333333" })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6" } },
    children: [],
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        margins: cellMargins,
        width: { size: 2250, type: WidthType.DXA },
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

const children = [
  // ===================== COVER PAGE =====================
  new Paragraph({ spacing: { before: 1920 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: "INTERSITE TRACK", bold: true, size: 64, font: "Sarabun", color: "1B5E93" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 480 },
    children: [new TextRun({ text: "Complete Setup & User Guide", size: 32, font: "Sarabun", color: "2E75B6" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: "Task Management • Holiday Schedule • Saturday Duty Roster", size: 24, font: "Sarabun", color: "555555" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 0 },
    children: [new TextRun({ text: "📚 Setup Guide & Firebase Configuration", size: 22, font: "Sarabun", color: "666666", italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 0 },
    children: [new TextRun({ text: "Version 1.0", size: 20, font: "Sarabun", color: "888888" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 0 },
    children: [new TextRun({ text: "Updated: April 7, 2026", size: 20, font: "Sarabun", color: "888888" })],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // ===================== TABLE OF CONTENTS =====================
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: "สารบัญ", bold: true, size: 32, font: "Sarabun", color: "1B5E93" })],
  }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),

  new Paragraph({ children: [new PageBreak()] }),

  // ===================== PART 1: FIREBASE SETUP =====================
  heading1("PART 1: Firebase Setup & Configuration"),

  heading2("1.1 Firebase Console Setup"),
  heading3("Step 1: สร้าง Firebase Project"),
  bullet("ไปที่ Firebase Console: https://console.firebase.google.com"),
  bullet("กด + Create a new project"),
  bullet("ตั้งชื่อ: internsite-track"),
  bullet("เลือก Disable Google Analytics (ไม่จำเป็น)"),
  bullet("กด Create project → รอ 1-2 นาที"),

  heading3("Step 2: ดึง Credentials"),
  para("สำหรับ Backend (Node.js + Express):", { bold: true }),
  bullet("ไปที่ Project Settings (เกียร์ icon ด้านบนขวา)"),
  bullet("แท็บ Service Accounts"),
  bullet("เลือก Node.js"),
  bullet("กด Generate New Private Key"),
  bullet("ไฟล์ JSON ดาวน์โหลดมา — เก็บอย่างปลอดภัย!"),

  para("สำหรับ Frontend (React):", { bold: true }),
  bullet("ไปที่ Project Settings → General"),
  bullet("หา Your apps → Web app (ถ้าไม่มีกด +)"),
  bullet("Copy config object (apiKey, authDomain, projectId, etc.)"),

  heading3("Step 3: บันทึก .env File"),
  para("สร้างไฟล์ .env ในโปรเจกต์:"),
  code("# === FIREBASE BACKEND ==="),
  code("FIREBASE_PROJECT_ID=your-project-id"),
  code("FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"),
  code("FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\""),
  code(""),
  code("# === FIREBASE FRONTEND (ต้องใช้ VITE_ prefix) ==="),
  code("VITE_FIREBASE_API_KEY=your-api-key"),
  code("VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com"),
  code("VITE_FIREBASE_PROJECT_ID=your-project-id"),
  code("VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app"),
  code("VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id"),
  code("VITE_FIREBASE_APP_ID=1:your-sender-id:web:your-app-id"),
  code(""),
  code("# === LINE MESSAGING API ==="),
  code("LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token"),
  code("LINE_CHANNEL_SECRET=your-line-channel-secret"),
  code("LINE_GROUP_ID=your-line-group-id"),
  code("LINE_ADMIN_USER_ID=your-line-admin-user-id"),

  divider(),

  heading2("1.2 Authentication Setup"),
  heading3("Enable Email/Password Sign-In"),
  bullet("Firebase Console → Authentication (เมนูซ้าย)"),
  bullet("แท็บ Sign-in method"),
  bullet("กด Email/Password → Enable → Save"),

  heading3("Backend: Initialize Firebase Admin"),
  para("ไฟล์: server/config/firebase-admin.ts"),
  code("import admin from \"firebase-admin\";"),
  code("import dotenv from \"dotenv\";"),
  code(""),
  code("dotenv.config();"),
  code(""),
  code("// ⚠️ CRITICAL: Default import, NOT namespace"),
  code("admin.initializeApp({"),
  code("  credential: admin.credential.cert({"),
  code("    projectId: process.env.FIREBASE_PROJECT_ID,"),
  code("    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,"),
  code("    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, \"\\n\"),"),
  code("  }),"),
  code("});"),
  code(""),
  code("export default admin;"),

  para("⚠️ ทำไมต้อง default import?", { bold: true, color: "C7254E" }),
  bullet("ESM project ต้อง import admin from \"firebase-admin\" (ไม่ใช่ namespace import)"),
  bullet("ถ้าใช้ namespace import จะเกิด TypeError: Cannot read properties of undefined"),

  heading3("Frontend: Initialize Firebase"),
  para("ไฟล์: src/services/firebase.ts"),
  code("import { initializeApp } from \"firebase/app\";"),
  code("import { getAuth } from \"firebase/auth\";"),
  code("import { getFirestore } from \"firebase/firestore\";"),
  code(""),
  code("const firebaseConfig = {"),
  code("  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,"),
  code("  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,"),
  code("  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,"),
  code("  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,"),
  code("  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,"),
  code("  appId: import.meta.env.VITE_FIREBASE_APP_ID,"),
  code("};"),
  code(""),
  code("const app = initializeApp(firebaseConfig);"),
  code("export const auth = getAuth(app);"),
  code("export const db = getFirestore(app);"),

  divider(),

  heading2("1.3 Firestore Database Setup"),
  heading3("Step 1: สร้าง Firestore Database"),
  bullet("Firebase Console → Firestore Database (เมนูซ้าย)"),
  bullet("กด Create database"),
  bullet("เลือก Start in test mode"),
  bullet("เลือก location: asia-southeast1 (ใกล้ประเทศไทย)"),
  bullet("กด Create"),

  heading3("Step 2: สร้าง Collections"),
  para("ต้องสร้าง 5 Collections นี้:", { bold: true }),

  heading3("Collection: users"),
  code("{"),
  code("  \"uid\": \"kWXiuVUTeKVkoptbh6cR9OUZb3M2\","),
  code("  \"email\": \"admin@taskam.local\","),
  code("  \"role\": \"admin\","),
  code("  \"name\": \"Admin User\","),
  code("  \"createdAt\": \"2026-04-07T09:00:00Z\""),
  code("}"),

  heading3("Collection: tasks"),
  code("{"),
  code("  \"title\": \"Fix login bug\","),
  code("  \"description\": \"Users cannot login with email\","),
  code("  \"status\": \"in_progress\","),
  code("  \"assigned_to\": \"tsVDbvFmcAS2kDCIXXhlAVpqxCY2\","),
  code("  \"due_date\": \"2026-04-10\","),
  code("  \"created_by\": \"kWXiuVUTeKVkoptbh6cR9OUZb3M2\","),
  code("  \"created_at\": \"2026-04-07T09:00:00Z\","),
  code("  \"line_user_id\": \"U10bc0ddb2c2afa4a3a371796caa9ad01\""),
  code("}"),

  heading3("Collection: holidays"),
  code("{"),
  code("  \"date\": \"2026-01-01\","),
  code("  \"name\": \"วันขึ้นปีใหม่\","),
  code("  \"type\": \"holiday\","),
  code("  \"year\": 2026"),
  code("}"),

  heading3("Collection: saturday_schedules"),
  code("{"),
  code("  \"date\": \"2026-04-11\","),
  code("  \"users\": [\"tsVDbvFmcAS2kDCIXXhlAVpqxCY2\", \"anotherUserId\"],"),
  code("  \"created_at\": \"2026-04-07T09:00:00Z\""),
  code("}"),

  heading3("Collection: app_settings (document: line_config)"),
  code("{"),
  code("  \"group_id\": \"C675a1f9ed3cbb681f3b5d9651aaf0f80\","),
  code("  \"admin_user_id\": \"Ue6f844b01993a40329150aa655678b20\","),
  code("  \"user_guide\": \"...\","),
  code("  \"updated_at\": \"2026-04-07T09:00:00Z\""),
  code("}"),

  divider(),

  heading2("1.4 Security Rules"),
  heading3("Development Mode (สำหรับพัฒนาเท่านั้น)"),
  code("rules_version = '2';"),
  code("service cloud.firestore {"),
  code("  match /databases/{database}/documents {"),
  code("    match /{document=**} {"),
  code("      allow read, write: if true;"),
  code("    }"),
  code("  }"),
  code("}"),

  heading3("Production Mode (ต้อง authenticate)"),
  code("rules_version = '2';"),
  code("service cloud.firestore {"),
  code("  match /databases/{database}/documents {"),
  code("    match /users/{userId} {"),
  code("      allow read, write: if request.auth.uid == userId;"),
  code("    }"),
  code("    match /tasks/{document=**} {"),
  code("      allow read: if request.auth != null;"),
  code("      allow write: if request.auth.token.admin == true;"),
  code("    }"),
  code("    match /holidays/{document=**} {"),
  code("      allow read: if request.auth != null;"),
  code("      allow write: if request.auth.token.admin == true;"),
  code("    }"),
  code("  }"),
  code("}"),

  divider(),

  heading2("1.5 Common Firebase Issues & Fixes"),

  heading3("❌ Error: PERMISSION_DENIED: Cloud Firestore API has not been enabled"),
  para("Fix:", { bold: true, color: "C7254E" }),
  bullet("ไปที่ Google Cloud Console: https://console.cloud.google.com"),
  bullet("เลือก Project → APIs & Services → Library"),
  bullet("ค้นหา \"Firestore\" → Enable"),

  heading3("❌ Error: Error: 5 NOT_FOUND"),
  para("Fix: Firestore database ยังไม่มี", { bold: true, color: "C7254E" }),
  bullet("Firebase Console → Firestore Database → Create database"),

  heading3("❌ Error: auth/invalid-api-key"),
  para("Fix: Frontend env var ผิด", { bold: true, color: "C7254E" }),
  bullet("ตรวจสอบ .env — ต้องเป็น VITE_FIREBASE_* prefix (ไม่ใช่ FIREBASE_*)"),
  bullet("Restart dev server: npm run dev"),

  heading3("❌ Error: TypeError: Cannot read properties of undefined"),
  para("Fix: Backend import firebase-admin ผิด", { bold: true, color: "C7254E" }),
  bullet("ต้องใช้ default import: import admin from \"firebase-admin\""),
  bullet("ไม่ใช่ namespace import: import * as admin from \"firebase-admin\""),

  heading3("❌ Firestore 403 Forbidden"),
  para("Fix: Firestore Rules ห้ามเข้า", { bold: true, color: "C7254E" }),
  bullet("Firebase Console → Firestore → Rules"),
  bullet("ตั้ง test mode หรือ customize rules ให้อนุญาต"),

  new Paragraph({ children: [new PageBreak()] }),

  // ===================== PART 2: SYSTEM GUIDE =====================
  heading1("PART 2: Intersite Track — User Guide"),

  heading2("2.1 ภาพรวมระบบ"),
  para("Intersite Track เป็นระบบบริหารจัดการงานภายในองค์กร ครอบคลุม 3 ส่วนหลัก:"),
  bullet("Task Management — มอบหมายและติดตามงาน"),
  bullet("Holiday Schedule — ตารางวันหยุดประจำปี"),
  bullet("Saturday Duty Roster — ตารางเวรทำงานวันเสาร์"),
  para(""),
  para("ระบบส่งการแจ้งเตือนผ่าน LINE Messaging API ไปหาพนักงานแต่ละคน", { bold: true }),

  divider(),

  heading2("2.2 LINE Bot Setup"),
  heading3("เพิ่ม Bot เป็นเพื่อน (ทำหนึ่งครั้งต่อคน)"),
  para("พนักงานทุกคนต้องเพิ่ม bot gracia เป็นเพื่อนใน LINE เพื่อรับการแจ้งเตือน"),

  heading3("วิธี A: ใช้ LINE ID"),
  bullet("เปิดแอป LINE"),
  bullet("กด ค้นหา → พิมพ์ @441sptre"),
  bullet("กด เพิ่มเพื่อน"),

  heading3("วิธี B: ใช้ QR Code"),
  bullet("ไปที่ LINE OA Manager: https://manager.line.biz"),
  bullet("เลือก account gracia → หา QR code"),
  bullet("Scan จากแอป LINE บนมือถือ"),

  para(""),
  para("✅ หลังจาก add แล้ว คุณจะได้รับแจ้งเตือนทั้งหมด", { bold: true, color: "1B5E93" }),

  heading3("ประเภทการแจ้งเตือน"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [1800, 2200, 2200, 2826],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ประเภท", size: 20, font: "Sarabun", bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ส่งถึง", size: 20, font: "Sarabun", bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "ผู้รับ", size: 20, font: "Sarabun", bold: true, color: "FFFFFF" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Task ใหม่", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "DM ส่วนตัว", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "คนที่ได้รับมอบหมาย", size: 20, font: "Sarabun" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Deadline เตือน", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "DM ส่วนตัว", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "คนรับผิดชอบ", size: 20, font: "Sarabun" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Blocker แจ้ง", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "DM ส่วนตัว", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "คนรับผิดชอบ + Admin", size: 20, font: "Sarabun" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันหยุด", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Broadcast", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ทุกคนที่ add bot", size: 20, font: "Sarabun" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "เวรวันเสาร์", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Broadcast", size: 20, font: "Sarabun" })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ทุกคนที่ add bot", size: 20, font: "Sarabun" })] })] }),
        ],
      }),
    ],
  }),

  divider(),

  heading2("2.3 การใช้งาน Dashboard"),
  heading3("หน้าแรก — Dashboard"),
  para("แสดงภาพรวมการใช้งาน:"),
  bullet("Tasks — งานที่ได้รับมอบหมาย และ Deadline ใกล้"),
  bullet("Calendar — วันหยุดถัดไป พร้อมนับถอยหลัง"),
  bullet("Saturday Duty — เวรทำงานวันเสาร์สัปดาห์นี้"),

  heading3("Tab: Tasks"),
  bullet("ดูงาน — ดับเบิลคลิก task เพื่อดูรายละเอียด"),
  bullet("เพิ่มงาน — กด + New Task → กรอกชื่องาน, คำอธิบาย, กำหนดส่ง, ผู้รับผิดชอบ"),
  bullet("อัปเดตสถานะ — เปลี่ยน Status: To Do → In Progress → Done"),
  bullet("Blocker — กดไอคอน ⚠️ เพื่อแจ้งปัญหา (แจ้ง Admin อัตโนมัติ)"),

  heading3("Tab: Holidays"),
  bullet("ดูวันหยุดประจำปี พร้อมตัวกรองตามปี/เดือน"),
  bullet("แสดงนับถอยหลังวันหยุดถัดไป"),
  bullet("Admin เท่านั้น: เพิ่ม / แก้ไข / ลบวันหยุด"),

  heading3("Tab: Saturday Schedule"),
  bullet("ดูตารางเวรทำงานวันเสาร์"),
  bullet("พนักงาน: กด Join as Volunteer เพื่อเข้าร่วมเวร"),
  bullet("Admin เท่านั้น: เพิ่มเวร (Add Single หรือ Import CSV)"),

  divider(),

  heading2("2.4 ขั้นตอนการทำงาน"),
  heading3("Task Management Flow"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [1200, 2000, 5826],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "ขั้น", size: 20, bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "ผู้ดำเนินการ", size: 20, bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "การกระทำ", size: 20, bold: true, color: "FFFFFF" })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "1", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Admin/หัวหน้า", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "สร้าง Task + เลือกผู้รับผิดชอบ", size: 20 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "2", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ระบบ", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ส่งแจ้งเตือน LINE DM ให้ผู้รับ", size: 20 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "3", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "พนักงาน", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "เปลี่ยน Status เป็น In Progress", size: 20 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "4", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "พนักงาน", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ทำงาน — ถ้าติดปัญหากด Blocker", size: 20 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "5", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "ระบบ", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "แจ้ง Admin ถ้ามี Blocker", size: 20 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "6", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "พนักงาน", size: 20 })] })] }),
          new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "เปลี่ยน Status เป็น Done", size: 20 })] })] }),
        ],
      }),
    ],
  }),

  heading3("การแจ้งเตือนวันหยุด"),
  bullet("ทุกวันจันทร์ — สรุปวันหยุดสัปดาห์นี้ (Broadcast)"),
  bullet("วันก่อนวันหยุด — แจ้งเตือนล่วงหน้า 1 วัน (Broadcast)"),
  bullet("วันหยุด — แจ้งเตือนวันนี้วันหยุด (Broadcast)"),

  heading3("การแจ้งเตือนเวรวันเสาร์"),
  bullet("ทุกวันศุกร์ — แจ้งเตือนผู้มีเวรวันเสาร์ถัดไป"),
  bullet("ผู้มีเวร — รับ DM ส่วนตัว"),
  bullet("ทุกคน — รับ Broadcast สรุปรายชื่อผู้มีเวร"),

  divider(),

  heading2("2.5 วันหยุดประจำปี 2569"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [3500, 5526],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "วันที่", size: 20, bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "ชื่อวันหยุด", size: 20, bold: true, color: "FFFFFF" })] })] }),
        ],
      }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "1 มกราคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันขึ้นปีใหม่", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "3 มีนาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันมาฆบูชา", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "13-15 เมษายน", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันสงกรานต์", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "1 พฤษภาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันแรงงานแห่งชาติ", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "1 มิถุนายน", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันหยุดชดเชย วันวิสาขบูชา", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "3 มิถุนายน", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันเฉลิมพระชนมพรรษา สมเด็จพระบรมราชินี", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "28 กรกฎาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันเฉลิมพระชนมพรรษา รัชกาลที่ 10", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "29 กรกฎาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันอาสาฬหบูชา", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "12 สิงหาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันแม่แห่งชาติ", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "13 ตุลาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันนวมินทรมหาราช", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "23 ตุลาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันปิยมหาราช", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "5 ธันวาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันพ่อแห่งชาติ", size: 20 })] })] })] }),
      new TableRow({ children: [new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "31 ธันวาคม", size: 20 })] })] }), new TableCell({ borders, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "วันสิ้นปี", size: 20 })] })] })] }),
    ],
  }),

  divider(),

  heading2("2.6 FAQ — คำถามที่พบบ่อย"),

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

  heading2("2.7 ข้อมูลติดต่อ"),
  para("LINE Bot: @441sptre (gracia)", { bold: true }),
  para("LINE OA Manager: https://manager.line.biz"),
  para("Firebase Console: https://console.firebase.google.com"),
  para("Project ID: internsite-f9cd7"),
  para(""),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 0 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6" } },
    children: [new TextRun({ text: "", size: 20 })],
  }),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 0 },
    children: [new TextRun({ text: "INTERSITE TRACK — Complete Guide", bold: true, size: 24, font: "Sarabun", color: "1B5E93" })],
  }),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 0 },
    children: [new TextRun({ text: "Version 1.0  |  Updated: April 7, 2026", size: 18, font: "Sarabun", color: "888888", italics: true })],
  }),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 0 },
    children: [new TextRun({ text: "Firebase Setup + System User Guide", size: 18, font: "Sarabun", color: "888888", italics: true })],
  }),
];

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
          children: [new TextRun({ text: "Intersite Track — Complete Setup & User Guide", size: 18, font: "Sarabun", color: "666666" })],
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
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Intersite-Track-Complete-Guide.docx", buffer);
  console.log("✅ สร้างไฟล์ Intersite-Track-Complete-Guide.docx เรียบร้อย!");
  console.log("📄 ไฟล์รวมทั้ง Firebase Setup + User Guide ครบถ้วน");
});
