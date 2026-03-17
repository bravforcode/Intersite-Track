import { query } from '../database/connection.js';
import { getConfig, getCardMapping } from '../database/queries/trello.queries.js';

// ─── Loop prevention ──────────────────────────────────────────────────────────
// Track event IDs we've recently processed to avoid echo loops.
// Each entry expires after TTL_MS milliseconds.

const TTL_MS = 60_000; // 1 minute
const processedEvents = new Map<string, number>(); // eventId → expiresAt

function hasProcessed(eventId: string): boolean {
  const exp = processedEvents.get(eventId);
  if (exp === undefined) return false;
  if (Date.now() > exp) {
    processedEvents.delete(eventId);
    return false;
  }
  return true;
}

function markProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now() + TTL_MS);
}

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of processedEvents) {
    if (now > exp) processedEvents.delete(id);
  }
}, 5 * 60_000);

// ─── Webhook payload types ────────────────────────────────────────────────────

interface WebhookAction {
  id: string;
  type: string;
  data: {
    card?: { id: string; name?: string; desc?: string; due?: string | null };
    checkItem?: { id: string; state?: string; name?: string };
    checklist?: { id: string };
    member?: { id: string };
    board?: { id: string };
    list?: { id: string };
    listAfter?: { id: string };
    listBefore?: { id: string };
  };
  memberCreator?: { id: string };
}

interface WebhookPayload {
  action: WebhookAction;
  model?: { id: string };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export class TrelloWebhookHandler {
  async handle(payload: WebhookPayload): Promise<void> {
    const config = await getConfig();
    if (!config || !config.enable_two_way_sync) return;

    const action = payload.action;
    if (!action?.id || !action?.type) return;

    // Deduplicate
    if (hasProcessed(action.id)) {
      console.log(`[Webhook] Skipping duplicate event ${action.id}`);
      return;
    }
    markProcessed(action.id);

    console.log(`[Webhook] Processing action: ${action.type} (${action.id})`);

    try {
      switch (action.type) {
        case 'updateCard':
          await this.handleUpdateCard(action);
          break;
        case 'updateCheckItemStateOnCard':
          await this.handleCheckItemUpdate(action);
          break;
        case 'addMemberToCard':
          await this.handleMemberChange(action, 'add');
          break;
        case 'removeMemberFromCard':
          await this.handleMemberChange(action, 'remove');
          break;
        default:
          // Ignore other action types
          break;
      }
    } catch (err) {
      console.error(`[Webhook] Error handling action ${action.type}:`, err);
    }
  }

  // ─── updateCard ─────────────────────────────────────────────────────────────

  private async handleUpdateCard(action: WebhookAction): Promise<void> {
    const cardId = action.data.card?.id;
    if (!cardId) return;

    const mapping = await this.getMappingByCardId(cardId);
    if (!mapping) return;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (action.data.card?.name !== undefined) {
      updates.push(`title = $${idx++}`);
      params.push(action.data.card.name);
    }
    if (action.data.card?.desc !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(action.data.card.desc);
    }
    if (action.data.card?.due !== undefined) {
      updates.push(`due_date = $${idx++}`);
      params.push(action.data.card.due ?? null);
    }

    if (updates.length === 0) return;

    params.push(mapping.task_id);
    await query(
      `UPDATE tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      params
    );

    console.log(`[Webhook] Updated task ${mapping.task_id} from card ${cardId}`);
  }

  // ─── updateCheckItemStateOnCard ──────────────────────────────────────────────

  private async handleCheckItemUpdate(action: WebhookAction): Promise<void> {
    const cardId = action.data.card?.id;
    const checkItemName = action.data.checkItem?.name;
    const state = action.data.checkItem?.state; // 'complete' | 'incomplete'

    if (!cardId || !checkItemName || !state) return;

    const mapping = await this.getMappingByCardId(cardId);
    if (!mapping) return;

    const isChecked = state === 'complete' ? 1 : 0;

    await query(
      `UPDATE task_checklists SET is_checked = $1
       WHERE task_id = $2 AND title = $3`,
      [isChecked, mapping.task_id, checkItemName]
    );

    // Recalculate progress
    const allItems = await query(
      'SELECT is_checked FROM task_checklists WHERE task_id = $1',
      [mapping.task_id]
    );
    const total = allItems.rows.length;
    const checked = allItems.rows.filter((r: any) => r.is_checked === 1).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const newStatus = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending';

    await query(
      'UPDATE tasks SET progress = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [pct, newStatus, mapping.task_id]
    );

    console.log(`[Webhook] Updated checklist item "${checkItemName}" on task ${mapping.task_id}`);
  }

  // ─── addMemberToCard / removeMemberFromCard ──────────────────────────────────

  private async handleMemberChange(action: WebhookAction, op: 'add' | 'remove'): Promise<void> {
    const cardId = action.data.card?.id;
    const trelloMemberId = action.data.member?.id;

    if (!cardId || !trelloMemberId) return;

    const mapping = await this.getMappingByCardId(cardId);
    if (!mapping) return;

    // Find system user by Trello member ID
    const userResult = await query(
      'SELECT user_id FROM trello_user_mappings WHERE trello_member_id = $1',
      [trelloMemberId]
    );
    if (userResult.rows.length === 0) {
      console.log(`[Webhook] No system user mapped to Trello member ${trelloMemberId}`);
      return;
    }

    const userId = userResult.rows[0].user_id;

    if (op === 'add') {
      // Insert assignment if not already present
      await query(
        `INSERT INTO task_assignments (task_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [mapping.task_id, userId]
      );
      console.log(`[Webhook] Added user ${userId} to task ${mapping.task_id}`);
    } else {
      await query(
        'DELETE FROM task_assignments WHERE task_id = $1 AND user_id = $2',
        [mapping.task_id, userId]
      );
      console.log(`[Webhook] Removed user ${userId} from task ${mapping.task_id}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getMappingByCardId(cardId: string) {
    const result = await query(
      'SELECT task_id, trello_card_id FROM trello_card_mappings WHERE trello_card_id = $1',
      [cardId]
    );
    return result.rows[0] ?? null;
  }
}

export const trelloWebhookHandler = new TrelloWebhookHandler();
