const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak
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
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: "E8E8E8" } },
    children: [new TextRun({ text, size: 19, font: "Courier New", color: "000000" })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
    children: [],
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
          children: [new TextRun({ text: "Firebase Setup Tutorial — TaskAm Project", size: 18, font: "Sarabun", color: "666666" })],
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
        children: [new TextRun({ text: "Firebase Setup", bold: true, size: 56, font: "Sarabun", color: "1B5E93" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "คู่มือการตั้งค่า Firebase", size: 36, font: "Sarabun", color: "2E75B6" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "สำหรับ Intersite Track Project", size: 24, font: "Sarabun", color: "555555" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        children: [new TextRun({ text: "เวอร์ชัน 1.0  |  อัปเดต: 7 เมษายน 2569", size: 20, font: "Sarabun", color: "888888" })],
      }),

      divider(),

      // ===================== SECTION 1 =====================
      heading1("1. Firebase Console Setup"),
      heading2("Step 1: สร้าง Firebase Project"),
      bullet("ไปที่ Firebase Console: https://console.firebase.google.com"),
      bullet("กด + Create a new project"),
      bullet("ตั้งชื่อ: internsite-track"),
      bullet("เลือก Disable Google Analytics"),
      bullet("กด Create project → รอ 1-2 นาที"),

      heading2("Step 2: ดึง Credentials"),
      heading3("สำหรับ Backend (Node.js + Express):"),
      bullet("ไปที่ Project Settings (เกียร์ icon)"),
      bullet("แท็บ Service Accounts"),
      bullet("เลือก Node.js"),
      bullet("กด Generate New Private Key"),
      bullet("ไฟล์ JSON ดาวน์โหลดมา — เก็บอย่างปลอดภัย!"),

      heading3("สำหรับ Frontend (React):"),
      bullet("ไปที่ Project Settings → General"),
      bullet("หา Your apps → Web app (ถ้าไม่มีกด +)"),
      bullet("Copy config object (apiKey, authDomain, projectId, etc.)"),

      heading2("Step 3: บันทึก .env File"),
      para("สร้างไฟล์ .env ในโปรเจกต์:"),
      code("# Backend"),
      code("FIREBASE_PROJECT_ID=your-project-id"),
      code("FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"),
      code("FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\""),
      code(""),
      code("# Frontend (ต้องใช้ VITE_ prefix)"),
      code("VITE_FIREBASE_API_KEY=AIzaSy..."),
      code("VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com"),
      code("VITE_FIREBASE_PROJECT_ID=your-project-id"),
      code("VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app"),

      divider(),

      // ===================== SECTION 2 =====================
      heading1("2. Authentication"),
      heading2("Enable Email/Password Sign-In"),
      bullet("Firebase Console → Authentication"),
      bullet("แท็บ Sign-in method"),
      bullet("กด Email/Password → Enable → Save"),

      heading2("Backend: Initialize Firebase Admin"),
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

      para("⚠️ ทำไมต้อง default import?", { bold: true, color: "C7254E" }),
      bullet("ESM project ต้อง import admin from \"firebase-admin\""),
      bullet("ถ้าใช้ namespace import จะเกิด TypeError"),

      heading2("Frontend: Initialize Firebase"),
      para("ไฟล์: src/services/firebase.ts"),
      code("import { initializeApp } from \"firebase/app\";"),
      code("import { getAuth } from \"firebase/auth\";"),
      code(""),
      code("const firebaseConfig = {"),
      code("  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,"),
      code("  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,"),
      code("  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,"),
      code("  ..."),
      code("};"),
      code(""),
      code("const app = initializeApp(firebaseConfig);"),
      code("export const auth = getAuth(app);"),

      divider(),

      // ===================== SECTION 3 =====================
      heading1("3. Firestore Database"),
      heading2("Step 1: สร้าง Firestore Database"),
      bullet("Firebase Console → Firestore Database"),
      bullet("กด Create database"),
      bullet("เลือก Start in test mode"),
      bullet("เลือก location: asia-southeast1"),
      bullet("กด Create"),

      heading2("Step 2: สร้าง Collections"),
      para("ต้องสร้าง Collections นี้:", { bold: true }),
      bullet("users — ข้อมูลผู้ใช้"),
      bullet("tasks — งานที่มอบหมาย"),
      bullet("holidays — วันหยุด"),
      bullet("saturday_schedules — เวรวันเสาร์"),
      bullet("app_settings — การตั้งค่าระบบ"),

      heading3("Example: users collection"),
      code("{"),
      code("  \"uid\": \"kWXiuVUTeKVkoptbh6cR9OUZb3M2\","),
      code("  \"email\": \"admin@taskam.local\","),
      code("  \"role\": \"admin\","),
      code("  \"name\": \"Admin User\""),
      code("}"),

      heading3("Example: tasks collection"),
      code("{"),
      code("  \"title\": \"Fix login bug\","),
      code("  \"status\": \"in_progress\","),
      code("  \"assigned_to\": \"tsVDbvFmcAS2kDCIXXhlAVpqxCY2\","),
      code("  \"due_date\": \"2026-04-10\","),
      code("  \"created_at\": \"2026-04-07T09:00:00Z\""),
      code("}"),

      divider(),

      // ===================== SECTION 4 =====================
      heading1("4. Common Issues & Fixes"),

      heading2("❌ Error: PERMISSION_DENIED: Cloud Firestore API has not been enabled"),
      para("Fix:", { bold: true }),
      bullet("ไปที่ Google Cloud Console: https://console.cloud.google.com"),
      bullet("เลือก Project → APIs & Services → Library"),
      bullet("ค้นหา \"Firestore\" → Enable"),

      heading2("❌ Error: Error: 5 NOT_FOUND"),
      para("Fix: Firestore database ยังไม่มี", { bold: true }),
      bullet("Firebase Console → Firestore Database → Create database"),

      heading2("❌ Error: auth/invalid-api-key"),
      para("Fix: Frontend env var ผิด", { bold: true }),
      bullet("ตรวจ .env — ต้องเป็น VITE_FIREBASE_* (ไม่ใช่ FIREBASE_*)"),
      bullet("Restart dev server: npm run dev"),

      heading2("❌ Error: TypeError: Cannot read properties of undefined"),
      para("Fix: Backend import firebase-admin ผิด", { bold: true }),
      bullet("ต้องใช้ default import: import admin from \"firebase-admin\""),
      bullet("ไม่ใช่ namespace import: import * as admin"),

      divider(),

      // ===================== SECTION 5 =====================
      heading1("5. Security Rules"),
      heading2("Test Mode (สำหรับพัฒนาเท่านั้น)"),
      code("rules_version = '2';"),
      code("service cloud.firestore {"),
      code("  match /databases/{database}/documents {"),
      code("    match /{document=**} {"),
      code("      allow read, write: if true;"),
      code("    }"),
      code("  }"),
      code("}"),

      heading2("Production Mode"),
      para("ต้อง authenticate:", { bold: true }),
      bullet("Users อ่าน/เขียนเฉพาะ profile ของตนเอง"),
      bullet("Tasks อ่าน all, เขียน admin เท่านั้น"),
      bullet("Holidays อ่าน all, เขียน admin เท่านั้น"),

      divider(),

      // ===================== SECTION 6 =====================
      heading1("6. Useful Links"),
      para("Firebase Documentation: https://firebase.google.com/docs"),
      para("Firestore Guide: https://firebase.google.com/docs/firestore"),
      para("Firebase Admin SDK: https://firebase.google.com/docs/database/admin/start"),
      para("Google Cloud Console: https://console.cloud.google.com"),

      divider(),

      // ===================== CHECKLIST =====================
      heading1("7. Setup Checklist"),
      bullet("☐ Create Firebase project"),
      bullet("☐ Download service account JSON"),
      bullet("☐ Add environment variables to .env"),
      bullet("☐ Enable Firestore API in Google Cloud"),
      bullet("☐ Create Firestore database (asia-southeast1)"),
      bullet("☐ Create all collections"),
      bullet("☐ Enable Email/Password authentication"),
      bullet("☐ Test backend connection"),
      bullet("☐ Test frontend login"),
      bullet("☐ Set Firestore rules (production)"),
      bullet("☐ Create admin user"),

      para(""),
      para("Last Updated: April 7, 2026  |  Version 1.0", { color: "888888", italics: true }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Firebase-Setup-Tutorial.docx", buffer);
  console.log("✅ สร้างไฟล์ Firebase-Setup-Tutorial.docx เรียบร้อย!");
});
