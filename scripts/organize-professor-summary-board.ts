/**
 * organize-professor-summary-board.ts
 *
 * Organizes the Trello board for professor-facing weekly summaries:
 * - archives non-summary cards in Week 8-12 and Month 3 lists
 * - archives Day 36-65 lists
 * - adds labels, checklists, and completed due dates to summary cards
 * - moves summary cards to the top of each list in document order
 *
 * Usage:
 *   npx tsx scripts/organize-professor-summary-board.ts
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
const BASE = "https://api.trello.com/1";

if (!TRELLO_KEY || !TRELLO_TOKEN) {
  console.error("❌ Missing TRELLO_API_KEY or TRELLO_TOKEN in .env");
  process.exit(1);
}

if (!fs.existsSync(DOC_PATH)) {
  console.error(`❌ File not found: ${DOC_PATH}`);
  process.exit(1);
}

interface SummaryCard {
  week: number | null;
  title: string;
  listName: string;
  due: string;
  checklistItems: Array<{ name: string; checked: boolean }>;
}

interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idLabels?: string[];
}

interface TrelloChecklist {
  id: string;
  name: string;
}

interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
}

interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
}

const DUE_BY_WEEK: Record<number, string> = {
  8: "2026-03-08T17:00:00+07:00",
  9: "2026-03-15T17:00:00+07:00",
  10: "2026-03-22T17:00:00+07:00",
  11: "2026-03-29T17:00:00+07:00",
  12: "2026-04-05T17:00:00+07:00",
};

function compactText(value: string): string {
  return value.replace(/`/g, "").replace(/\s+/g, " ").trim();
}

function shortenText(value: string, max = 54): string {
  const text = compactText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function buildChecklistItems(
  title: string,
  bodyLines: string[],
): Array<{ name: string; checked: boolean }> {
  const topic = shortenText(title, 28);

  const work = bodyLines.find(line => line.startsWith("- งาน:"))?.replace("- งาน:", "").trim();
  const result = bodyLines.find(line => line.startsWith("- ผลลัพธ์:"))?.replace("- ผลลัพธ์:", "").trim();
  const evidence = bodyLines.find(line => line.startsWith("- หลักฐาน:"))?.replace("- หลักฐาน:", "").trim();
  const visual = bodyLines
    .find(line => line.startsWith("- ภาพประกอบที่ควรแนบ:"))
    ?.replace("- ภาพประกอบที่ควรแนบ:", "")
    .trim();

  if (title === "Week 8 - Week 12 Summary") {
    const weekLines = bodyLines
      .filter(line => /^- Week \d+:/.test(line))
      .map(line => line.replace(/^- /, "").trim());
    const items = weekLines.map(line => ({
      name: shortenText(`สรุป ${line.replace(/^Week /, "สัปดาห์ ")}`, 60),
      checked: true,
    }));

    items.push({
      name: "ยืนยันภาพรวมความก้าวหน้าช่วงสัปดาห์ 8-12",
      checked: true,
    });

    return items;
  }

  const items = [
    { name: shortenText(`ทบทวนหัวข้อ ${topic}`, 48), checked: true },
    work
      ? { name: shortenText(`ยืนยันงาน: ${work}`, 60), checked: true }
      : null,
    result
      ? { name: shortenText(`ยืนยันผลลัพธ์: ${result}`, 60), checked: true }
      : null,
    evidence
      ? { name: shortenText(`แนบหลักฐาน: ${evidence}`, 60), checked: true }
      : null,
    visual
      ? { name: shortenText(`เตรียมภาพ: ${visual}`, 60), checked: true }
      : null,
  ].filter((item): item is { name: string; checked: boolean } => Boolean(item));

  return items;
}

function parseSummaryCards(markdown: string): SummaryCard[] {
  const lines = markdown.split(/\r?\n/);
  const cards: SummaryCard[] = [];
  let currentWeek: number | null = null;
  let currentListName = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const weekMatch = line.match(/^## List: Week (\d+)$/);
    if (weekMatch) {
      currentWeek = Number(weekMatch[1]);
      currentListName = `🚧 This Week's ${currentWeek}`;
      i++;
      continue;
    }

    if (line === "## Summary Card") {
      currentWeek = null;
      currentListName = "💻MONTH 3";
      i++;
      continue;
    }

    const cardMatch = line.match(/^### Card ([A-Z0-9-]+)\s+\|\s+(.+)$/);
    if (!cardMatch) {
      i++;
      continue;
    }

    const title = cardMatch[2].trim();
    const bodyLines: string[] = [];
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
      if (nextLine.startsWith("- ") || nextLine.startsWith("**สรุปภาพรวม**")) {
        bodyLines.push(nextLine);
      }
      i++;
    }

    cards.push({
      week: currentWeek,
      title,
      listName: currentListName,
      due: currentWeek === null ? DUE_BY_WEEK[12] : DUE_BY_WEEK[currentWeek],
      checklistItems: buildChecklistItems(title, bodyLines),
    });
  }

  return cards.filter(card => card.listName);
}

async function trelloGet<T>(url: string, params: Record<string, string> = {}): Promise<T> {
  const res = await axios.get(url, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, ...params },
  });
  return res.data;
}

async function trelloPost<T>(url: string, params: Record<string, string> = {}): Promise<T> {
  const res = await axios.post(url, null, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, ...params },
  });
  return res.data;
}

async function trelloPut<T>(url: string, params: Record<string, string> = {}): Promise<T> {
  const res = await axios.put(url, null, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN, ...params },
  });
  return res.data;
}

async function resolveBoardId(): Promise<string> {
  const board = await trelloGet<{ id: string }>(`${BASE}/boards/${BOARD_REF}`, { fields: "id" });
  return board.id;
}

async function getBoardLists(): Promise<TrelloList[]> {
  return trelloGet<TrelloList[]>(`${BASE}/boards/${BOARD_REF}/lists`, {
    fields: "name,closed",
  });
}

async function getListCards(listId: string): Promise<TrelloCard[]> {
  return trelloGet<TrelloCard[]>(`${BASE}/lists/${listId}/cards`, {
    fields: "name,desc,idList,idLabels",
  });
}

async function getBoardLabels(boardId: string): Promise<TrelloLabel[]> {
  return trelloGet<TrelloLabel[]>(`${BASE}/boards/${boardId}/labels`, {
    fields: "name,color",
  });
}

async function createLabel(boardId: string, name: string, color: string): Promise<TrelloLabel> {
  return trelloPost<TrelloLabel>(`${BASE}/labels`, {
    idBoard: boardId,
    name,
    color,
  });
}

async function updateLabel(labelId: string, name: string, color: string): Promise<void> {
  await trelloPut(`${BASE}/labels/${labelId}`, { name, color });
}

async function getCardChecklists(cardId: string): Promise<Array<TrelloChecklist & { checkItems?: TrelloCheckItem[] }>> {
  return trelloGet<Array<TrelloChecklist & { checkItems?: TrelloCheckItem[] }>>(`${BASE}/cards/${cardId}/checklists`, {
    fields: "name",
    checkItems: "all",
  });
}

async function createChecklist(cardId: string, name: string): Promise<TrelloChecklist> {
  return trelloPost<TrelloChecklist>(`${BASE}/cards/${cardId}/checklists`, { name });
}

async function addChecklistItem(
  checklistId: string,
  name: string,
  checked: boolean,
): Promise<void> {
  await trelloPost(`${BASE}/checklists/${checklistId}/checkItems`, {
    name,
    checked: String(checked),
  });
}

async function updateCard(cardId: string, params: Record<string, string>): Promise<void> {
  await trelloPut(`${BASE}/cards/${cardId}`, params);
}

async function archiveCard(cardId: string): Promise<void> {
  await updateCard(cardId, { closed: "true" });
}

async function archiveList(listId: string): Promise<void> {
  await trelloPut(`${BASE}/lists/${listId}/closed`, { value: "true" });
}

async function deleteChecklist(checklistId: string): Promise<void> {
  await axios.delete(`${BASE}/checklists/${checklistId}`, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN },
  });
}

async function replaceChecklist(
  card: TrelloCard,
  items: Array<{ name: string; checked: boolean }>,
): Promise<void> {
  const existing = await getCardChecklists(card.id);
  for (const checklist of existing) {
    await deleteChecklist(checklist.id);
  }

  const checklist = await createChecklist(card.id, "หัวข้อสรุป");
  for (const item of items) {
    await addChecklistItem(checklist.id, item.name, item.checked);
  }

  console.log(`✅ Refreshed checklist: ${card.name}`);
}

async function ensureLabels(
  card: TrelloCard,
  labelIds: string[],
): Promise<void> {
  const current = new Set(card.idLabels ?? []);
  const merged = [...new Set([...(card.idLabels ?? []), ...labelIds])];
  if (merged.length !== current.size) {
    await updateCard(card.id, { idLabels: merged.join(",") });
  }
}

async function main() {
  const markdown = fs.readFileSync(DOC_PATH, "utf8");
  const summaryCards = parseSummaryCards(markdown).filter(card => {
    if (card.week === null) return true;
    return card.week >= 8 && card.week <= 12;
  });

  const boardId = await resolveBoardId();
  const lists = await getBoardLists();
  const listMap = new Map(lists.map(list => [list.name, list]));

  const labels = await getBoardLabels(boardId);
  const wantedLabels = [
    { legacyName: "Professor Report", name: "สรุปส่งอาจารย์", color: "red" },
    { legacyName: "Week 8", name: "สัปดาห์ 8", color: "blue" },
    { legacyName: "Week 9", name: "สัปดาห์ 9", color: "purple" },
    { legacyName: "Week 10", name: "สัปดาห์ 10", color: "yellow" },
    { legacyName: "Week 11", name: "สัปดาห์ 11", color: "orange" },
    { legacyName: "Week 12", name: "สัปดาห์ 12", color: "green" },
  ];

  const labelMap = new Map(labels.map(label => [label.name, label.id]));
  for (const label of wantedLabels) {
    const existingId = labelMap.get(label.name) ?? labelMap.get(label.legacyName);
    if (existingId) {
      await updateLabel(existingId, label.name, label.color);
      labelMap.set(label.name, existingId);
      console.log(`✅ Updated label: ${label.name}`);
    } else {
      const created = await createLabel(boardId, label.name, label.color);
      labelMap.set(created.name, created.id);
      console.log(`✅ Created label: ${created.name}`);
    }
  }

  const summaryTitles = new Set(summaryCards.map(card => card.title));
  const weekLists = ["🚧 This Week's 8", "🚧 This Week's 9", "🚧 This Week's 10", "🚧 This Week's 11", "🚧 This Week's 12"];
  const extraDayLists = ["Day 36-40", "Day 41-45", "Day 46-50", "Day 51-55", "Day 56-60", "Day 61-65"];
  const monthListName = "💻MONTH 3";

  for (const listName of weekLists) {
    const list = listMap.get(listName);
    if (!list) continue;

    const cards = await getListCards(list.id);
    for (const card of cards) {
      if (!summaryTitles.has(card.name)) {
        await archiveCard(card.id);
        console.log(`✅ Archived non-summary card: ${card.name}`);
      }
    }
  }

  const monthList = listMap.get(monthListName);
  if (monthList) {
    const cards = await getListCards(monthList.id);
    for (const card of cards) {
      if (card.name !== "Week 8 - Week 12 Summary") {
        await archiveCard(card.id);
        console.log(`✅ Archived non-summary card: ${card.name}`);
      }
    }
  }

  for (const listName of extraDayLists) {
    const list = listMap.get(listName);
    if (list && !list.closed) {
      await archiveList(list.id);
      console.log(`✅ Archived list: ${list.name}`);
    }
  }

  const groupedByList = new Map<string, SummaryCard[]>();
  for (const card of summaryCards) {
    const group = groupedByList.get(card.listName) ?? [];
    group.push(card);
    groupedByList.set(card.listName, group);
  }

  for (const [listName, cardsInDocOrder] of groupedByList.entries()) {
    const list = listMap.get(listName);
    if (!list) continue;

    const currentCards = await getListCards(list.id);
    const currentMap = new Map(currentCards.map(card => [card.name, card]));

    for (const summary of cardsInDocOrder) {
      const card = currentMap.get(summary.title);
      if (!card) continue;

      const labelIds = [labelMap.get("สรุปส่งอาจารย์")!];
      if (summary.week !== null) {
        labelIds.push(labelMap.get(`สัปดาห์ ${summary.week}`)!);
      }

      await ensureLabels(card, labelIds);
      await updateCard(card.id, {
        due: summary.due,
        dueComplete: "true",
      });
      await replaceChecklist(card, summary.checklistItems);
    }

    for (const summary of [...cardsInDocOrder].reverse()) {
      const card = currentMap.get(summary.title);
      if (!card) continue;
      await updateCard(card.id, { pos: "top" });
    }
  }

  console.log("\n✅ Professor summary board organization finished.");
}

main().catch(err => {
  console.error("❌ Failed to organize board:", err.response?.data || err.message);
  process.exit(1);
});
