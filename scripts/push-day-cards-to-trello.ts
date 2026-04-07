/**
 * push-day-cards-to-trello.ts
 *
 * Reads docs/project-development-day-36-to-65.md and pushes Day 36-65 cards to Trello.
 *
 * Usage:
 *   npx tsx scripts/push-day-cards-to-trello.ts
 *
 * Required ENV:
 *   TRELLO_API_KEY
 *   TRELLO_TOKEN
 *   TRELLO_BOARD_ID (optional, defaults to TCoZ8cCj)
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = process.env.TRELLO_BOARD_ID ?? "TCoZ8cCj";
const DOC_PATH = path.join(process.cwd(), "docs", "project-development-day-36-to-65.md");

if (!TRELLO_KEY || !TRELLO_TOKEN) {
  console.error("❌ Missing TRELLO_API_KEY or TRELLO_TOKEN in .env");
  process.exit(1);
}

if (!fs.existsSync(DOC_PATH)) {
  console.error(`❌ File not found: ${DOC_PATH}`);
  process.exit(1);
}

const BASE = "https://api.trello.com/1";

interface CardData {
  day: number;
  title: string;
  date: string;
  status: string;
  desc: string;
  listName: string;
}

function normalizeThaiDate(dateText: string): string {
  return dateText.trim();
}

function getListName(day: number): string {
  if (day >= 36 && day <= 40) return "Day 36-40";
  if (day >= 41 && day <= 45) return "Day 41-45";
  if (day >= 46 && day <= 50) return "Day 46-50";
  if (day >= 51 && day <= 55) return "Day 51-55";
  if (day >= 56 && day <= 60) return "Day 56-60";
  return "Day 61-65";
}

function parseCards(markdown: string): CardData[] {
  const lines = markdown.split(/\r?\n/);
  const cards: CardData[] = [];
  let i = 0;

  while (i < lines.length) {
    const header = lines[i]?.match(/^### Card Day (\d+)\s+\|\s+(.+)$/);
    if (!header) {
      i++;
      continue;
    }

    const day = Number(header[1]);
    const title = header[2].trim();
    let date = "";
    let status = "";
    const body: string[] = [];
    i++;

    while (i < lines.length && !lines[i].startsWith("### Card Day ")) {
      const line = lines[i];
      const dateMatch = line.match(/^\*\*วันที่:\*\*\s*(.+?)\s*$/);
      const statusMatch = line.match(/^\*\*สถานะ:\*\*\s*(.+?)\s*$/);

      if (dateMatch) {
        date = normalizeThaiDate(dateMatch[1]);
      } else if (statusMatch) {
        status = statusMatch[1].trim();
      } else if (line.startsWith("- ")) {
        body.push(line);
      }
      i++;
    }

    const desc = [
      `วันที่: ${date || "-"}`,
      `สถานะ: ${status || "-"}`,
      "",
      ...body,
    ].join("\n");

    cards.push({
      day,
      title,
      date,
      status,
      desc,
      listName: getListName(day),
    });
  }

  return cards;
}

async function getBoardLists(): Promise<Array<{ id: string; name: string }>> {
  const res = await axios.get(`${BASE}/boards/${BOARD_ID}/lists`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, fields: "name" },
  });
  return res.data;
}

async function resolveBoardId(): Promise<string> {
  const res = await axios.get(`${BASE}/boards/${BOARD_ID}`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, fields: "id,name" },
  });
  return res.data.id;
}

async function createList(boardId: string, name: string): Promise<{ id: string; name: string }> {
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
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, idList: listId, name, desc },
  });
}

async function main() {
  const markdown = fs.readFileSync(DOC_PATH, "utf8");
  const cards = parseCards(markdown).filter(card => card.day >= 36 && card.day <= 65);

  if (cards.length === 0) {
    console.log("No day cards found in markdown.");
    return;
  }

  const resolvedBoardId = await resolveBoardId();
  const existingLists = await getBoardLists();
  const listMap = new Map(existingLists.map(list => [list.name, list.id]));

  const neededListNames = [...new Set(cards.map(card => card.listName))];
  for (const listName of neededListNames) {
    if (!listMap.has(listName)) {
      const created = await createList(resolvedBoardId, listName);
      listMap.set(created.name, created.id);
      console.log(`✅ Created list: ${created.name}`);
    }
  }

  for (const listName of neededListNames) {
    const listId = listMap.get(listName)!;
    const existingCards = await getCardsInList(listId);
    const existingNames = new Set(existingCards.map(card => card.name));

    const cardsInList = cards.filter(card => card.listName === listName);
    for (const card of cardsInList) {
      const cardName = `Day ${card.day} - ${card.title}`;
      if (existingNames.has(cardName)) {
        console.log(`⏭ Skipped existing card: ${cardName}`);
        continue;
      }

      await createCard(listId, cardName, card.desc);
      console.log(`✅ Created card: ${cardName}`);
    }
  }

  console.log(`\n✅ Finished pushing Day 36-65 cards to Trello board ${BOARD_ID}`);
}

main().catch(err => {
  console.error("❌ Failed to push cards:", err.response?.data || err.message);
  process.exit(1);
});
