import { supabaseAdmin } from "../config/supabase.js";
import { getConfig } from "../database/queries/trello.queries.js";

// ─── Loop prevention ──────────────────────────────────────────────────────────
// Track event IDs we've recently processed to avoid echo loops.
// Each entry expires after TTL_MS milliseconds.

const TTL_MS = 60_000; // 1 minute
const processedEvents = new Map<string, number>(); // eventId -> expiresAt

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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    let hasUpdates = false;

    if (action.data.card?.name !== undefined) {
      updates.title = action.data.card.name;
      hasUpdates = true;
    }
    if (action.data.card?.desc !== undefined) {
      updates.description = action.data.card.desc;
      hasUpdates = true;
    }
    if (action.data.card?.due !== undefined) {
      updates.due_date = action.data.card.due ?? null;
      hasUpdates = true;
    }

    if (!hasUpdates) return;

    const { error } = await supabaseAdmin
      .from("tasks")
      .update(updates)
      .eq("id", mapping.task_id);

    if (error) throw error;

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

    const { error: checklistError } = await supabaseAdmin
      .from("task_checklists")
      .update({ is_checked: isChecked })
      .eq("task_id", mapping.task_id)
      .eq("title", checkItemName);

    if (checklistError) throw checklistError;

    // Recalculate progress
    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from("task_checklists")
      .select("is_checked")
      .eq("task_id", mapping.task_id);

    if (allItemsError) throw allItemsError;

    const total = (allItems ?? []).length;
    const checked = (allItems ?? []).filter((row: any) => Number(row.is_checked) === 1).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const newStatus = pct >= 100 ? "completed" : pct > 0 ? "in_progress" : "pending";

    const { error: taskError } = await supabaseAdmin
      .from("tasks")
      .update({
        progress: pct,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mapping.task_id);

    if (taskError) throw taskError;

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
    const userId = await this.getMappedUserId(trelloMemberId);
    if (!userId) {
      console.log(`[Webhook] No system user mapped to Trello member ${trelloMemberId}`);
      return;
    }

    if (op === "add") {
      // Insert assignment if not already present
      const { error } = await supabaseAdmin
        .from("task_assignments")
        .upsert(
          { task_id: mapping.task_id, user_id: userId },
          { onConflict: "task_id,user_id", ignoreDuplicates: true }
        );

      if (error) throw error;

      console.log(`[Webhook] Added user ${userId} to task ${mapping.task_id}`);
    } else {
      const { error } = await supabaseAdmin
        .from("task_assignments")
        .delete()
        .eq("task_id", mapping.task_id)
        .eq("user_id", userId);

      if (error) throw error;

      console.log(`[Webhook] Removed user ${userId} from task ${mapping.task_id}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getMappingByCardId(
    cardId: string
  ): Promise<{ task_id: number; trello_card_id: string } | null> {
    const { data, error } = await supabaseAdmin
      .from("trello_card_mappings")
      .select("task_id, trello_card_id")
      .eq("trello_card_id", cardId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  private async getMappedUserId(trelloMemberId: string): Promise<number | null> {
    const { data, error } = await supabaseAdmin
      .from("trello_user_mappings")
      .select("user_id")
      .eq("trello_member_id", trelloMemberId)
      .maybeSingle();

    if (error) throw error;
    return data?.user_id ?? null;
  }
}

export const trelloWebhookHandler = new TrelloWebhookHandler();
