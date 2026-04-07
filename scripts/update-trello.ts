/**
 * update-trello.ts
 * Auto-create Trello cards from git log (Week 8 onwards) for the CWIE internship board.
 *
 * Usage:
 *   npx tsx scripts/update-trello.ts
 *
 * Required ENV:
 *   TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID
 */

import { spawnSync } from "child_process";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = process.env.TRELLO_BOARD_ID ?? "TCoZ8cCj";

if (!TRELLO_KEY || !TRELLO_TOKEN) {
  console.error("❌ Missing TRELLO_API_KEY or TRELLO_TOKEN in .env");
  process.exit(1);
}

const BASE = "https://api.trello.com/1";
const AUTH = `key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

// ─── Week calculation (CWIE internship, Week 1 = 2026-01-12) ────────────────
const INTERNSHIP_START = new Date("2026-01-12");

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const diffDays = Math.floor((date.getTime() - INTERNSHIP_START.getTime()) / 86_400_000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// ─── Git log parsing ─────────────────────────────────────────────────────────

interface Commit {
  hash: string;
  date: string;
  message: string;
  week: number;
}

function getCommits(): Commit[] {
  const result = spawnSync(
    "git",
    ["log", "--since=2026-02-17", "--format=%H|%ad|%s", "--date=short"],
    { cwd: process.cwd(), encoding: "utf-8" }
  );

  if (result.error || result.status !== 0) {
    console.error("git log failed:", result.stderr);
    return [];
  }

  return (result.stdout ?? "")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const [hash, date, ...msgParts] = line.split("|");
      return {
        hash: hash?.trim() ?? "",
        date: date?.trim() ?? "",
        message: msgParts.join("|").trim(),
        week: getWeekNumber(date?.trim() ?? ""),
      };
    })
    .filter(c => c.hash && c.date);
}

// ─── Trello API helpers ───────────────────────────────────────────────────────

async function getBoardLists(): Promise<{ id: string; name: string }[]> {
  const res = await axios.get(`${BASE}/boards/${BOARD_ID}/lists?${AUTH}`);
  return res.data;
}

async function createList(name: string): Promise<{ id: string; name: string }> {
  const res = await axios.post(`${BASE}/lists?${AUTH}`, null, {
    params: { name, idBoard: BOARD_ID },
  });
  return res.data;
}

async function getCardsInList(listId: string): Promise<{ id: string; name: string }[]> {
  const res = await axios.get(`${BASE}/lists/${listId}/cards?${AUTH}`);
  return res.data;
}

async function createCard(listId: string, name: string, desc: string): Promise<void> {
  await axios.post(`${BASE}/cards?${AUTH}`, null, {
    params: { idList: listId, name, desc },
  });
}

// ─── Commit category grouping ─────────────────────────────────────────────────

function groupByCategory(commits: Commit[]): { title: string; desc: string }[] {
  const groups = new Map<string, string[]>();

  for (const commit of commits) {
    const msg = commit.message;
    let category = "งานทั่วไป";
    if (msg.startsWith("feat")) category = "เพิ่มฟีเจอร์ใหม่";
    else if (msg.startsWith("fix")) category = "แก้ไขบัก";
    else if (msg.startsWith("chore")) category = "งาน Chore / Config";
    else if (msg.startsWith("db") || msg.startsWith("migration")) category = "ฐานข้อมูล";
    else if (msg.startsWith("docs")) category = "เอกสาร";
    else if (msg.startsWith("build")) category = "Build / Deploy";

    const items = groups.get(category) ?? [];
    items.push(`• ${msg} (${commit.date})`);
    groups.set(category, items);
  }

  return [...groups.entries()].map(([title, items]) => ({
    title,
    desc: items.join("\n"),
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📋 Fetching commits from Week 8 onwards...");
  const commits = getCommits();
  console.log(`Found ${commits.length} commits`);

  if (commits.length === 0) {
    console.log("No commits found since 2026-02-17");
  }

  const byWeek = new Map<number, Commit[]>();
  for (const commit of commits) {
    const list = byWeek.get(commit.week) ?? [];
    list.push(commit);
    byWeek.set(commit.week, list);
  }

  console.log("📌 Getting existing Trello lists...");
  const existingLists = await getBoardLists();
  const listMap = new Map(existingLists.map(l => [l.name, l.id]));

  for (const [week, weekCommits] of [...byWeek.entries()].sort((a, b) => a[0] - b[0])) {
    const listName = `Week ${week}`;
    console.log(`\n📅 Processing ${listName} (${weekCommits.length} commits)...`);

    let listId = listMap.get(listName);
    if (!listId) {
      const created = await createList(listName);
      listId = created.id;
      listMap.set(listName, listId);
    }

    const existingCards = await getCardsInList(listId);
    const existingNames = new Set(existingCards.map(c => c.name));

    for (const card of groupByCategory(weekCommits)) {
      if (existingNames.has(card.title)) {
        console.log(`  ⏭  Skipping "${card.title}" (already exists)`);
        continue;
      }
      console.log(`  ✅ Creating card: "${card.title}"`);
      await createCard(listId, card.title, card.desc);
    }
  }

  // Add Firebase migration cards to current week
  const currentWeek = getWeekNumber(new Date().toISOString().split("T")[0]);
  const currentListName = `Week ${currentWeek}`;
  let currentListId = listMap.get(currentListName);
  if (!currentListId) {
    const created = await createList(currentListName);
    currentListId = created.id;
  }

  const currentCards = await getCardsInList(currentListId);
  const currentNames = new Set(currentCards.map(c => c.name));

  const firebaseCards = [
    {
      title: "ตั้งค่า Firebase Project",
      desc: "สร้าง Firebase Project ใน console.firebase.google.com\n• เปิด Authentication (Email/Password)\n• เปิด Firestore Database (region: asia-southeast1)\n• ดาวน์โหลด Service Account Key",
    },
    {
      title: "Migrate Database: Supabase → Firestore",
      desc: "เปลี่ยน Database จาก Supabase PostgreSQL ไปใช้ Firebase Firestore\n• Rewrite query files ทั้งหมด (9 files)\n• เปลี่ยน schema เป็น Firestore collections",
    },
    {
      title: "Migrate Auth: Supabase Auth → Firebase Auth",
      desc: "เปลี่ยนระบบ Auth จาก Supabase ไปใช้ Firebase Auth\n• Backend: verifyIdToken()\n• Frontend: signInWithEmailAndPassword()",
    },
    {
      title: "เชื่อม LINE Group Notification",
      desc: "ส่งแจ้งเตือนไปทั้ง LINE Group และผู้ใช้แต่ละคน\n• เพิ่ม LINE_GROUP_ID ใน .env\n• ใช้ Promise.allSettled",
    },
    {
      title: "ทำเอกสาร Firebase Tutorial (.docx)",
      desc: "สร้าง Word document tutorial สำหรับการตั้งค่าและใช้งาน Firebase\n• ครอบคลุมทุก step พร้อม code จริง\n• มี placeholder สำหรับ screenshot",
    },
  ];

  for (const card of firebaseCards) {
    if (!currentNames.has(card.title)) {
      console.log(`  ✅ Creating card: "${card.title}"`);
      await createCard(currentListId, card.title, card.desc);
    }
  }

  console.log("\n✅ Trello board updated successfully!");
  console.log(`🔗 https://trello.com/b/${BOARD_ID}`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
