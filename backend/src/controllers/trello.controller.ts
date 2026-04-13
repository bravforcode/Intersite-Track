import { Request, Response, NextFunction } from 'express';
import { encrypt, decrypt, trelloSyncService } from '../services/trelloSyncService.js';
import { TrelloAPIClient } from '../services/trelloApiClient.js';
import { trelloWebhookHandler } from '../services/trelloWebhookHandler.js';
import {
  getConfig,
  saveConfig as saveConfigQuery,
  getStatusMappings,
  saveStatusMapping,
  getUserMappings,
  saveUserMapping,
  getSyncLogs,
} from '../database/queries/trello.queries.js';
import { findTaskById } from '../database/queries/task.queries.js';
import { getActivityInRange } from '../database/queries/activity.queries.js';

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfigHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getConfig();
    if (!config) {
      return res.json(null);
    }
    // Mask encrypted credentials
    res.json({
      ...config,
      api_key_encrypted: '***',
      token_encrypted: '***',
    });
  } catch (error) {
    next(error);
  }
}

export async function saveConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { apiKey, token, boardId, boardUrl, enableAutoSync, enableTwoWaySync } = req.body;

    if (!apiKey || !token || !boardId) {
      return res.status(400).json({ error: 'apiKey, token และ boardId จำเป็นต้องระบุ' });
    }

    const saved = await saveConfigQuery({
      api_key_encrypted: encrypt(apiKey),
      token_encrypted: encrypt(token),
      board_id: boardId,
      board_url: boardUrl ?? null,
      enable_auto_sync: enableAutoSync ?? true,
      enable_two_way_sync: enableTwoWaySync ?? false,
      webhook_id: undefined,
      webhook_url: undefined,
    });

    res.json({
      ...saved,
      api_key_encrypted: '***',
      token_encrypted: '***',
    });
  } catch (error) {
    next(error);
  }
}

export async function testConnection(_req: Request, res: Response, _next: NextFunction) {
  try {
    const config = await getConfig();
    if (!config) {
      return res.status(400).json({ success: false, message: 'ยังไม่ได้ตั้งค่า Trello' });
    }

    const apiKey = decrypt(config.api_key_encrypted);
    const token = decrypt(config.token_encrypted);
    const client = new TrelloAPIClient(apiKey, token);

    await client.getBoardLists(config.board_id);

    res.json({ success: true, message: 'เชื่อมต่อ Trello สำเร็จ' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เชื่อมต่อล้มเหลว';
    res.json({ success: false, message });
  }
}

// ─── Board ────────────────────────────────────────────────────────────────────

export async function getBoardLists(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getConfig();
    if (!config) {
      return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า Trello' });
    }

    const apiKey = decrypt(config.api_key_encrypted);
    const token = decrypt(config.token_encrypted);
    const client = new TrelloAPIClient(apiKey, token);

    const lists = await client.getBoardLists(config.board_id);
    res.json(lists);
  } catch (error) {
    next(error);
  }
}

export async function getBoardMembers(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getConfig();
    if (!config) {
      return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า Trello' });
    }

    const apiKey = decrypt(config.api_key_encrypted);
    const token = decrypt(config.token_encrypted);
    const client = new TrelloAPIClient(apiKey, token);

    const members = await client.getBoardMembers(config.board_id);
    res.json(members);
  } catch (error) {
    next(error);
  }
}

// ─── Status Mappings ──────────────────────────────────────────────────────────

export async function getStatusMappingsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const mappings = await getStatusMappings();
    res.json(mappings);
  } catch (error) {
    next(error);
  }
}

export async function saveStatusMappingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings ต้องเป็น array' });
    }

    const saved = [];
    for (const m of mappings) {
      const result = await saveStatusMapping(m.status, m.trelloListId, m.trelloListName);
      saved.push(result);
    }

    res.json(saved);
  } catch (error) {
    next(error);
  }
}

// ─── User Mappings ────────────────────────────────────────────────────────────

export async function getUserMappingsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const mappings = await getUserMappings();
    res.json(mappings);
  } catch (error) {
    next(error);
  }
}

export async function saveUserMappingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings ต้องเป็น array' });
    }

    const saved = [];
    for (const m of mappings) {
      const result = await saveUserMapping(m.userId, m.trelloMemberId, m.trelloUsername);
      saved.push(result);
    }

    res.json(saved);
  } catch (error) {
    next(error);
  }
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export async function getSyncLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      taskId,
      status,
      dateFrom,
      dateTo,
      page,
      pageSize,
    } = req.query;

    const result = await getSyncLogs({
      taskId: taskId as string | undefined,
      status: status as any,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export async function retrySyncForTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId;
    const task = await findTaskById(taskId);

    if (!task) {
      return res.status(404).json({ error: 'ไม่พบงาน' });
    }

    await trelloSyncService.syncTaskCreation(task as unknown as Parameters<typeof trelloSyncService.syncTaskCreation>[0]);

    res.json({ success: true, message: 'เริ่มซิงค์งานใหม่แล้ว' });
  } catch (error) {
    next(error);
  }
}

export async function seedWeeklyProgressToBoard(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'เฉพาะแอดมินเท่านั้นที่สามารถใช้งานส่วนนี้ได้' });
      return;
    }

    const { startWeek, startDate, endDate } = req.body as { startWeek?: number; startDate?: string; endDate?: string };

    const weekNumber = Number(startWeek ?? 8);
    const start = typeof startDate === 'string' ? startDate : '';
    const end = typeof endDate === 'string' ? endDate : new Date().toISOString().slice(0, 10);

    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      res.status(400).json({ error: 'startDate/endDate ต้องอยู่ในรูปแบบ YYYY-MM-DD' });
      return;
    }

    const config = await getConfig();
    if (!config) {
      res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า Trello' });
      return;
    }

    const apiKey = decrypt(config.api_key_encrypted);
    const token = decrypt(config.token_encrypted);
    const client = new TrelloAPIClient(apiKey, token);

    const boardLists = await client.getBoardLists(config.board_id);
    const listByName = new Map<string, string>(boardLists.map((l) => [l.name, l.id]));

    const ensureList = async (name: string): Promise<string> => {
      const existing = listByName.get(name);
      if (existing) return existing;
      const created = await client.createList({ name, idBoard: config.board_id, pos: 'bottom' });
      listByName.set(name, created.id);
      return created.id;
    };

    const addChecklistWithItems = async (cardId: string, checklistName: string, items: string[]) => {
      const cl = await client.createChecklist(cardId, checklistName);
      for (const item of items) {
        await client.addCheckItem(cl.id, item);
      }
    };

    const roadmapListId = await ensureList('📌 Roadmap & Weekly Progress');
    const roadmapCard = await client.createCard({
      name: 'ขั้นตอนการทำงานตั้งแต่เริ่มต้นจนถึงส่งมอบงาน',
      idList: roadmapListId,
      desc:
        [
          'สรุปขั้นตอนการทำงาน (Roadmap)',
          '',
          '- วางโครงระบบและฐานข้อมูล',
          '- ระบบผู้ใช้/สิทธิ์ (Admin/Staff)',
          '- ระบบงาน (สร้าง/มอบหมาย/สถานะ/ความคืบหน้า/แนบไฟล์/Checklist)',
          '- ระบบแจ้งเตือน (ในระบบ + LINE + เตือนใกล้ครบกำหนด)',
          '- ระบบรายงาน (สถิติ + รายงานตามบุคลากร/ช่วงเวลา + Export PDF/CSV)',
          '- Master Data (หน่วยงาน/ประเภทงาน)',
          '- เชื่อม Trello (Config + Mappings + Sync Logs + Retry + Webhook)',
          '- ทดสอบ/แก้ไขบั๊ก/เตรียมส่งมอบ',
          '',
          'หมายเหตุ: รายละเอียดรายสัปดาห์ถูกสร้างไว้ในลิสต์ Week 8+ อัตโนมัติจาก Audit Logs ในระบบ',
        ].join('\n'),
    });
    await addChecklistWithItems(roadmapCard.id, 'รายการส่งมอบ', [
      'เอกสาร/สรุปภาพรวมระบบ',
      'คู่มือการใช้งาน (Admin/Staff)',
      'รายงานผลการทดสอบ/บั๊กที่แก้ไข',
      'ไฟล์รายงาน (PDF/CSV)',
    ]);

    const startTime = new Date(`${start}T00:00:00.000Z`).getTime();
    const endTime = new Date(`${end}T00:00:00.000Z`).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || startTime >= endTime) {
      res.status(400).json({ error: 'ช่วงเวลาไม่ถูกต้อง (startDate ต้องน้อยกว่า endDate)' });
      return;
    }

    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const totalWeeks = Math.ceil((endTime - startTime) / oneWeekMs);

    const createdLists: Array<{ name: string; id: string }> = [];
    const createdCards: Array<{ name: string; id: string; listName: string }> = [];

    for (let i = 0; i < totalWeeks; i++) {
      const from = new Date(startTime + i * oneWeekMs);
      const to = new Date(startTime + (i + 1) * oneWeekMs);
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const fromDate = fromIso.slice(0, 10);
      const toDate = new Date(to.getTime() - 1).toISOString().slice(0, 10);

      const weekLabel = `Week ${weekNumber + i} (${fromDate} - ${toDate})`;
      const listId = await ensureList(weekLabel);
      createdLists.push({ name: weekLabel, id: listId });

      const activity = await getActivityInRange(fromIso, toIso, 5000);

      const counts: Record<string, number> = {};
      const completed: Array<{ task_id: number; task_title: string }> = [];
      const created: Array<{ task_id: number; task_title: string }> = [];
      const touchedTasks = new Map<number, string>();
      const contributors = new Set<string>();

      for (const a of activity as any[]) {
        counts[a.action] = (counts[a.action] ?? 0) + 1;
        if (a.task_id && a.task_title) touchedTasks.set(a.task_id, a.task_title);
        if (typeof a.user_name === 'string' && a.user_name.trim()) contributors.add(a.user_name.trim());

        if (a.action === 'CREATE') {
          created.push({ task_id: a.task_id, task_title: a.task_title });
        }

        if (a.action === 'STATUS_CHANGE' && a.new_data && a.new_data.status === 'completed') {
          completed.push({ task_id: a.task_id, task_title: a.task_title });
        }
      }

      const uniqByTask = (rows: Array<{ task_id: number; task_title: string }>) => {
        const m = new Map<number, string>();
        for (const r of rows) m.set(r.task_id, r.task_title);
        return Array.from(m.entries()).map(([task_id, task_title]) => ({ task_id, task_title }));
      };

      const completedUniq = uniqByTask(completed).slice(0, 25);
      const createdUniq = uniqByTask(created).slice(0, 25);
      const touchedUniq = Array.from(touchedTasks.entries()).slice(0, 25).map(([task_id, task_title]) => ({ task_id, task_title }));

      const countLines = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

      const desc = [
        `ช่วงเวลา: ${fromDate} ถึง ${toDate}`,
        '',
        'สรุปกิจกรรม (จาก Audit Logs)',
        countLines || '- ไม่มีข้อมูล',
        '',
        'งานที่เสร็จสิ้น (Completed)',
        completedUniq.length ? completedUniq.map((t) => `- #${t.task_id} ${t.task_title}`).join('\n') : '- ไม่มี',
        '',
        'งานที่สร้างใหม่ (Created)',
        createdUniq.length ? createdUniq.map((t) => `- #${t.task_id} ${t.task_title}`).join('\n') : '- ไม่มี',
        '',
        'งานที่มีการอัปเดต/เกี่ยวข้อง (Touched)',
        touchedUniq.length ? touchedUniq.map((t) => `- #${t.task_id} ${t.task_title}`).join('\n') : '- ไม่มี',
        '',
        `ผู้มีส่วนร่วม: ${contributors.size ? Array.from(contributors).join(', ') : '-'}`,
        '',
        'ปัญหาที่พบ (Issues):',
        '- (เติม)',
        '',
        'การแก้ไข (Fixes):',
        '- (เติม)',
        '',
        'แผนสัปดาห์ถัดไป (Next):',
        '- (เติม)',
      ].join('\n');

      const card = await client.createCard({
        name: `สรุป Week ${weekNumber + i}`,
        idList: listId,
        desc,
      });
      createdCards.push({ name: card.name, id: card.id, listName: weekLabel });

      const doneItems = completedUniq.length
        ? completedUniq.map((t) => `#${t.task_id} ${t.task_title}`)
        : ['(ยังไม่มีงานเสร็จสิ้นในสัปดาห์นี้)'];

      await addChecklistWithItems(card.id, 'Done', doneItems);
      await addChecklistWithItems(card.id, 'Issues', ['(เติมปัญหาที่พบ)']);
      await addChecklistWithItems(card.id, 'Fixes', ['(เติมวิธีแก้ไข/ผลลัพธ์)']);
      await addChecklistWithItems(card.id, 'Next', ['(เติมงานสัปดาห์ถัดไป)']);
    }

    res.json({
      success: true,
      boardId: config.board_id,
      createdListsCount: createdLists.length,
      createdCardsCount: createdCards.length + 1,
      lists: createdLists,
      cards: createdCards,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Respond immediately so Trello doesn't retry
  res.sendStatus(200);
  // Process asynchronously (fire-and-forget)
  trelloWebhookHandler.handle(req.body).catch((err) => {
    console.error('[Webhook] Unhandled error:', err);
  });
}
