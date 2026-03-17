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

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfigHandler(req: Request, res: Response, next: NextFunction) {
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

export async function testConnection(req: Request, res: Response, next: NextFunction) {
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

export async function getBoardLists(req: Request, res: Response, next: NextFunction) {
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

export async function getBoardMembers(req: Request, res: Response, next: NextFunction) {
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

export async function getStatusMappingsHandler(req: Request, res: Response, next: NextFunction) {
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

export async function getUserMappingsHandler(req: Request, res: Response, next: NextFunction) {
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
      taskId: taskId ? Number(taskId) : undefined,
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
    const taskId = Number(req.params.taskId);
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

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Respond immediately so Trello doesn't retry
  res.sendStatus(200);
  // Process asynchronously (fire-and-forget)
  trelloWebhookHandler.handle(req.body).catch((err) => {
    console.error('[Webhook] Unhandled error:', err);
  });
}
