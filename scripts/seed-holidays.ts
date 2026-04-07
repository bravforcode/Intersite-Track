/**
 * Seed holidays for 2026 (from company holiday list)
 * Run: npx tsx scripts/seed-holidays.ts
 */
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const holidays = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "holiday" },
  { date: "2026-03-03", name: "วันมาฆบูชา", type: "holiday" },
  { date: "2026-04-13", name: "วันสงกรานต์", type: "holiday" },
  { date: "2026-04-14", name: "วันสงกรานต์", type: "holiday" },
  { date: "2026-04-15", name: "วันสงกรานต์", type: "holiday" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "holiday" },
  { date: "2026-06-01", name: "วันหยุดชดเชย วันวิสาขบูชา", type: "holiday" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษา สมเด็จพระบรมราชินี", type: "holiday" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษา ในหลวงรัชกาลที่ 10", type: "holiday" },
  { date: "2026-07-29", name: "วันอาสาฬหบูชา", type: "holiday" },
  { date: "2026-08-12", name: "วันแม่แห่งชาติ", type: "holiday" },
  { date: "2026-10-13", name: "วันนวมินทรมหาราช", type: "holiday" },
  { date: "2026-10-23", name: "วันปิยมหาราช", type: "holiday" },
  { date: "2026-12-05", name: "วันพ่อแห่งชาติ", type: "special" },
  { date: "2026-12-31", name: "วันสิ้นปี", type: "holiday" },
];

async function seedHolidays() {
  for (const h of holidays) {
    await db.collection("holidays").add({
      ...h,
      created_at: new Date().toISOString(),
      created_by: "system",
    });
    console.log(`✅ ${h.date} — ${h.name}`);
  }
  console.log(`\nเพิ่มวันหยุด ${holidays.length} วันเรียบร้อยแล้ว!`);
  process.exit(0);
}

seedHolidays();
