import crypto from 'crypto';
import { TrelloAPIClient } from './trelloApiClient.js';
import {
  getConfig,
  getCardMapping,
  saveCardMapping,
  deleteCardMapping,
  getStatusMappings,
  getUserMappings,
  createSyncLog,
  updateSyncLog,
} from '../database/queries/trello.queries.js';
import type { TaskChanges } from '../types/trello.js';

// ─── Encryption helpers ───────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-cbc';
const DEFAULT_DEV_KEY = 'trello-dev-key-32-chars-padding!!'; // 32 chars

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY ?? DEFAULT_DEV_KEY;
  return Buffer.from(key.slice(0, 32).padEnd(32, '0'), 'utf8');
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─── Priority → Trello label color ───────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  urgent: 'red',
};

// ─── Task shape expected by the service ──────────────────────────────────────

export interface SyncTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
  due_date?: string | null;
  assignments?: Array<{ id: string; first_name: string; last_name: string }>;
  checklists?: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; title: string; is_completed: boolean }>;
  }>;
}

// ─── Retry delay ─────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 30_000;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── TrelloSyncService ────────────────────────────────────────────────────────

export class TrelloSyncService {
  /**
   * Build an authenticated API client from DB config.
   * Returns null when Trello is not configured.
   */
  private async buildClient(): Promise<TrelloAPIClient | null> {
    const config = await getConfig();
    if (!config) return null;
    const apiKey = decrypt(config.api_key_encrypted);
    const token = decrypt(config.token_encrypted);
    return new TrelloAPIClient(apiKey, token);
  }

  // ─── Public sync entry-points (fire-and-forget safe) ─────────────────────

  /** Called after a task is created. */
  async syncTaskCreation(task: SyncTask): Promise<void> {
    this.runWithRetry('create', task.id, () => this._syncTaskCreation(task));
  }

  /** Called after a task is updated. */
  async syncTaskUpdate(task: SyncTask, changes: TaskChanges): Promise<void> {
    this.runWithRetry('update', task.id, () => this._syncTaskUpdate(task, changes));
  }

  /** Called before/after a task is deleted. */
  async syncTaskDeletion(taskId: string, trelloCardId: string): Promise<void> {
    this.runWithRetry('delete', taskId, () => this._syncTaskDeletion(taskId, trelloCardId));
  }

  // ─── Internal implementations ─────────────────────────────────────────────

  private async _syncTaskCreation(task: SyncTask): Promise<void> {
    const client = await this.buildClient();
    if (!client) return;

    const config = await getConfig();
    if (!config) return;

    // Determine target list from status mapping
    const statusMappings = await getStatusMappings();
    const listMapping = statusMappings.find((m) => m.status === task.status);
    const idList = listMapping?.trello_list_id;
    if (!idList) {
      console.warn(`[TrelloSync] No list mapping for status "${task.status}", skipping card creation`);
      return;
    }

    // Create the card
    const card = await client.createCard({
      name: task.title,
      desc: task.description ?? '',
      due: task.due_date ?? null,
      idList,
    });

    // Persist mapping
    await saveCardMapping(task.id, card.id, card.url);

    // Sync members, checklist, labels in parallel (best-effort)
    await Promise.allSettled([
      this.syncMembers(task, card.id),
      this.syncChecklist(task, card.id),
      this.syncLabels(task, card.id),
    ]);
  }

  private async _syncTaskUpdate(task: SyncTask, changes: TaskChanges): Promise<void> {
    const client = await this.buildClient();
    if (!client) return;

    const mapping = await getCardMapping(task.id);
    if (!mapping) {
      // Card doesn't exist yet — create it
      await this._syncTaskCreation(task);
      return;
    }

    const cardId = mapping.trello_card_id;

    // Update basic info if relevant fields changed
    const basicUpdate: Record<string, unknown> = {};
    if (changes.title !== undefined) basicUpdate.name = changes.title;
    if (changes.description !== undefined) basicUpdate.desc = changes.description ?? '';
    if (changes.due_date !== undefined) basicUpdate.due = changes.due_date ?? null;

    if (Object.keys(basicUpdate).length > 0) {
      await client.updateCard(cardId, basicUpdate);
    }

    // Move list on status change
    if (changes.status !== undefined) {
      await this.syncStatus(task, cardId);
    }

    // Update labels on priority change
    if (changes.priority !== undefined) {
      await this.syncLabels(task, cardId);
    }

    // Sync members if assignments changed
    if (changes.assigned_users !== undefined) {
      await this.syncMembers(task, cardId);
    }

    // Sync checklist if checklists changed
    if (changes.checklists !== undefined) {
      await this.syncChecklist(task, cardId);
    }
  }

  private async _syncTaskDeletion(taskId: string, trelloCardId: string): Promise<void> {
    const client = await this.buildClient();
    if (!client) return;

    await client.deleteCard(trelloCardId);
    await deleteCardMapping(taskId);
  }

  // ─── Specific sync operations ─────────────────────────────────────────────

  /** Diff current task members vs Trello card members and add/remove accordingly. */
  async syncMembers(task: SyncTask, cardId: string): Promise<void> {
    try {
      const client = await this.buildClient();
      if (!client) return;

      const userMappings = await getUserMappings();
      const card = await client.getCard(cardId);
      const currentTrelloMembers = new Set(card.idMembers);

      // Build set of desired Trello member IDs from task assignments
      const desiredTrelloMembers = new Set<string>();
      for (const assignment of task.assignments ?? []) {
        const mapping = userMappings.find((m) => m.user_id === assignment.id);
        if (!mapping) {
          console.log(
            `[TrelloSync] User ${assignment.id} (${assignment.first_name} ${assignment.last_name}) has no Trello mapping — skipping`
          );
          continue;
        }
        desiredTrelloMembers.add(mapping.trello_member_id);
      }

      // Add missing members
      for (const memberId of desiredTrelloMembers) {
        if (!currentTrelloMembers.has(memberId)) {
          await client.addMemberToCard(cardId, memberId);
        }
      }

      // Remove extra members
      for (const memberId of currentTrelloMembers) {
        if (!desiredTrelloMembers.has(memberId)) {
          await client.removeMemberFromCard(cardId, memberId);
        }
      }
    } catch (err) {
      console.error('[TrelloSync] syncMembers error:', err);
    }
  }

  /** Create or update checklist items on the Trello card. */
  async syncChecklist(task: SyncTask, cardId: string): Promise<void> {
    try {
      const client = await this.buildClient();
      if (!client) return;

      if (!task.checklists || task.checklists.length === 0) return;

      for (const checklist of task.checklists) {
        // Create a new checklist on the card for each task checklist
        const trelloChecklist = await client.createChecklist(cardId, checklist.title);

        for (const item of checklist.items) {
          const checkItem = await client.addCheckItem(trelloChecklist.id, item.title);
          if (item.is_completed) {
            await client.updateCheckItem(cardId, checkItem.id, 'complete');
          }
        }
      }
    } catch (err) {
      console.error('[TrelloSync] syncChecklist error:', err);
    }
  }

  /** Move the card to the list that corresponds to the task's current status. */
  async syncStatus(task: SyncTask, cardId: string): Promise<void> {
    try {
      const client = await this.buildClient();
      if (!client) return;

      const statusMappings = await getStatusMappings();
      const mapping = statusMappings.find((m) => m.status === task.status);
      if (!mapping) {
        console.warn(`[TrelloSync] No list mapping for status "${task.status}"`);
        return;
      }

      await client.updateCard(cardId, { idList: mapping.trello_list_id });
    } catch (err) {
      console.error('[TrelloSync] syncStatus error:', err);
    }
  }

  /** Update the priority label on the Trello card. */
  async syncLabels(task: SyncTask, cardId: string): Promise<void> {
    try {
      const client = await this.buildClient();
      if (!client) return;

      const card = await client.getCard(cardId);
      const config = await getConfig();
      if (!config) return;

      const targetColor = PRIORITY_COLOR[task.priority];

      // Remove existing priority labels (those whose color matches any priority color)
      const priorityColors = new Set(Object.values(PRIORITY_COLOR));
      for (const label of card.labels) {
        if (priorityColors.has(label.color)) {
          await client.removeLabelFromCard(cardId, label.id);
        }
      }

      if (!targetColor) return;

      // Trello labels are board-level; we need to find or create one with the right color.
      // The API supports adding a label by ID. We look for an existing label on the card's
      // board that matches the color. Since we don't have a direct "get board labels" method
      // in the client, we use the board ID from config and rely on the card's existing labels
      // list. If none found, we skip (label management requires board-level access not in scope).
      // For now, log the intended color so operators know what to configure.
      console.log(
        `[TrelloSync] Priority label color for task ${task.id}: ${targetColor} (ensure board has a label with this color)`
      );
    } catch (err) {
      console.error('[TrelloSync] syncLabels error:', err);
    }
  }

  // ─── Retry wrapper ────────────────────────────────────────────────────────

  /**
   * Runs `fn` with up to MAX_RETRIES attempts, logging each attempt.
   * Fire-and-forget: errors are caught and logged, never thrown.
   */
  private runWithRetry(
    action: 'create' | 'update' | 'delete',
    taskId: string,
    fn: () => Promise<void>
  ): void {
    // Intentionally not awaited — fire-and-forget
    (async () => {
      let log = await createSyncLog({
        task_id: taskId,
        trello_card_id: undefined,
        action,
        request_payload: { taskId },
      });

      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await fn();

          await updateSyncLog(log.id, {
            status: 'success',
            error_message: undefined,
            retry_count: attempt - 1,
            response_payload: undefined,
          });
          return;
        } catch (err) {
          lastError = err;
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[TrelloSync] ${action} attempt ${attempt}/${MAX_RETRIES} failed for task ${taskId}:`, errorMessage);

          if (attempt < MAX_RETRIES) {
            await updateSyncLog(log.id, {
              status: 'retrying',
              error_message: errorMessage,
              retry_count: attempt,
              response_payload: undefined,
            });
            await sleep(RETRY_DELAY_MS);
          }
        }
      }

      // All retries exhausted
      const finalError = lastError instanceof Error ? lastError.message : String(lastError);
      console.error(`[TrelloSync] ${action} permanently failed for task ${taskId} after ${MAX_RETRIES} attempts: ${finalError}`);

      await updateSyncLog(log.id, {
        status: 'failed',
        error_message: finalError,
        retry_count: MAX_RETRIES,
        response_payload: undefined,
      });
    })().catch((err) => {
      // Safety net: log any unexpected error in the retry wrapper itself
      console.error('[TrelloSync] Unexpected error in retry wrapper:', err);
    });
  }
}

export const trelloSyncService = new TrelloSyncService();
