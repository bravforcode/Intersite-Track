/**
 * push-week-summary-to-trello.ts
 *
 * Reads docs/project-development-summary-2026-02-23-to-2026-04-07.md
 * and pushes Week 8 - Week 12 summary cards to Trello.
 *
 * Usage:
 *   npx tsx scripts/push-week-summary-to-trello.ts
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_REF = process.env.TRELLO_BOARD_ID ?? "TCoZ8cCj";
const DOC_PATH = path.join(
  process.cwd(),
  "docs",
  "project-development-summary-2026-02-23-to-2026-04-07.md"
);

if (!TRELLO_KEY || !TRELLO_TOKEN) {
  console.error("❌ Missing TRELLO_API_KEY or TRELLO_TOKEN in .env");
  process.exit(1);
}

if (!fs.existsSync(DOC_PATH)) {
  console.error(`❌ File not found: ${DOC_PATH}`);
  process.exit(1);
}

const BASE = "https://api.trello.com/1";

interface TrelloList {
  id: string;
  name: string;
}

interface SummaryCard {
  week: number | null;
  code: string;
  title: string;
  dateRange: string;
  desc: string;
}

function parseCards(markdown: string): SummaryCard[] {
  const lines = markdown.split(/\r?\n/);
  const cards: SummaryCard[] = [];

  let currentWeek: number | null = null;
  let currentDateRange = "";
  let inSummarySection = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const weekMatch = line.match(/^## List: Week (\d+)$/);
    if (weekMatch) {
      currentWeek = Number(weekMatch[1]);
      currentDateRange = "";
      inSummarySection = false;
      i++;
      continue;
    }

    if (line === "## Summary Card") {
      currentWeek = null;
      currentDateRange = "";
      inSummarySection = true;
      i++;
      continue;
    }

    const rangeMatch =
      !inSummarySection && currentWeek !== null
        ? line.match(/^### (\d{1,2} .*? - \d{1,2} .*?)$/)
        : null;
    if (rangeMatch) {
      currentDateRange = rangeMatch[1].trim();
      i++;
      continue;
    }

    const cardMatch = line.match(/^### Card ([A-Z0-9-]+)\s+\|\s+(.+)$/);
    if (!cardMatch) {
      i++;
      continue;
    }

    const code = cardMatch[1].trim();
    const title = cardMatch[2].trim();
    const body: string[] = [];
    i++;

    while (i < lines.length) {
      const nextLine = lines[i];
      if (
        nextLine.startsWith("### Card ") ||
        nextLine.startsWith("## List: ") ||
        nextLine === "## Summary Card"
      ) {
        break;
      }

      if (nextLine.startsWith("- ")) {
        body.push(nextLine);
      } else if (inSummarySection && nextLine.startsWith("**สรุปภาพรวม**")) {
        body.push(nextLine);
      }

      i++;
    }

    const descLines = [
      `การ์ด: ${code}`,
      currentWeek !== null ? `สัปดาห์: Week ${currentWeek}` : "สรุปช่วง: Week 8 - Week 12",
      currentDateRange ? `ช่วงวันที่: ${currentDateRange}` : null,
      "",
      ...body,
    ].filter((value): value is string => Boolean(value));

    cards.push({
      week: currentWeek,
      code,
      title,
      dateRange: currentDateRange,
      desc: descLines.join("\n"),
    });
  }

  return cards;
}

async function resolveBoardId(): Promise<string> {
  const res = await axios.get(`${BASE}/boards/${BOARD_REF}`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, fields: "id,name" },
  });
  return res.data.id;
}

async function getBoardLists(): Promise<TrelloList[]> {
  const res = await axios.get(`${BASE}/boards/${BOARD_REF}/lists`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, fields: "name" },
  });
  return res.data;
}

async function createList(boardId: string, name: string): Promise<TrelloList> {
  const res = await axios.post(`${BASE}/lists`, null, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, name, idBoard: boardId, pos: "bottom" },
  });
  return res.data;
}

async function getCardsInList(listId: string): Promise<Array<{ id: string; name: string }>> {
  const res = await axios.get(`${BASE}/lists/${listId}/cards`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, fields: "name" },
  });
  return res.data;
}

async function createCard(listId: string, name: string, desc: string): Promise<void> {
  await axios.post(`${BASE}/cards`, null, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, idList: listId, name, desc, pos: "bottom" },
  });
}

function findWeekList(listMap: Map<string, string>, week: number): string | undefined {
  const targetSuffix = `This Week's ${week}`;
  for (const [name, id] of listMap.entries()) {
    if (name.includes(targetSuffix)) {
      return id;
    }
  }
  return undefined;
}

function findMonth3List(listMap: Map<string, string>): string | undefined {
  for (const [name, id] of listMap.entries()) {
    if (name.includes("MONTH 3")) {
      return id;
    }
  }
  return undefined;
}

async function main() {
  const markdown = fs.readFileSync(DOC_PATH, "utf8");
  const cards = parseCards(markdown).filter(card => {
    if (card.week === null) return true;
    return card.week >= 8 && card.week <= 12;
  });

  if (cards.length === 0) {
    console.log("No weekly summary cards found in markdown.");
    return;
  }

  const resolvedBoardId = await resolveBoardId();
  const existingLists = await getBoardLists();
  const listMap = new Map(existingLists.map(list => [list.name, list.id]));

  for (const week of [8, 9, 10, 11, 12]) {
    if (!findWeekList(listMap, week)) {
      const created = await createList(resolvedBoardId, `🚧 This Week's ${week}`);
      listMap.set(created.name, created.id);
      console.log(`✅ Created list: ${created.name}`);
    }
  }

  const summaryListId = findMonth3List(listMap) ?? findWeekList(listMap, 12);
  if (!summaryListId) {
    console.error("❌ Could not resolve a list for the final summary card.");
    process.exit(1);
  }

  const cardsByList = new Map<string, SummaryCard[]>();
  for (const card of cards) {
    const listId =
      card.week === null ? summaryListId : findWeekList(listMap, card.week);

    if (!listId) {
      console.error(`❌ Missing Trello list for card: ${card.title}`);
      process.exit(1);
    }

    const listCards = cardsByList.get(listId) ?? [];
    listCards.push(card);
    cardsByList.set(listId, listCards);
  }

  for (const [listId, listCards] of cardsByList.entries()) {
    const existingCards = await getCardsInList(listId);
    const existingNames = new Set(existingCards.map(card => card.name));

    for (const card of listCards) {
      const cardName = card.title;
      if (existingNames.has(cardName)) {
        console.log(`⏭ Skipped existing card: ${cardName}`);
        continue;
      }

      await createCard(listId, cardName, card.desc);
      console.log(`✅ Created card: ${cardName}`);
    }
  }

  console.log("\n✅ Finished pushing Week 8 - Week 12 summary cards to Trello.");
}

main().catch(err => {
  console.error("❌ Failed to push weekly summary cards:", err.response?.data || err.message);
  process.exit(1);
});
