/**
 * notification.dispatcher.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised notification fan-out service (Phase 2J).
 *
 * Usage:
 *   import { NotificationDispatcher } from "./notification.dispatcher.js";
 *   await NotificationDispatcher.dispatch("task_assigned", { task, assignee });
 *
 * The dispatcher:
 *  1. Persists the notification via createNotification()
 *  2. Broadcasts to any SSE clients connected for the target user
 *  3. (Extensible) can dispatch to LINE, email, etc.
 */

import { createNotification } from "../database/queries/notification.queries.js";

// ─── SSE Registry ─────────────────────────────────────────────────────────────

type SSEClient = {
  userId: string;
  write: (data: string) => void;
};

const sseClients = new Map<string, Set<SSEClient>>();

export function registerSSEClient(client: SSEClient): () => void {
  if (!sseClients.has(client.userId)) {
    sseClients.set(client.userId, new Set());
  }
  sseClients.get(client.userId)!.add(client);

  // Returns cleanup function
  return () => {
    sseClients.get(client.userId)?.delete(client);
    if (sseClients.get(client.userId)?.size === 0) {
      sseClients.delete(client.userId);
    }
  };
}

function pushSSE(userId: string, payload: object): void {
  const clients = sseClients.get(userId);
  if (!clients?.size) return;
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(msg);
    } catch {
      // Client disconnected; will be cleaned up via cleanup fn
    }
  }
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

interface NotificationPayload {
  recipient_user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export class NotificationDispatcher {
  /**
   * Dispatch a notification to one or more recipients.
   * Persists to DB + SSE push.
   */
  static async dispatch(notifications: NotificationPayload[]): Promise<void> {
    await Promise.allSettled(
      notifications.map(async (n) => {
        try {
          await createNotification(
            n.recipient_user_id,
            n.title,
            n.message,
            n.type,
            n.reference_id
          );
          pushSSE(n.recipient_user_id, {
            event: "notification",
            title: n.title,
            message: n.message,
            type: n.type,
            reference_id: n.reference_id ?? null,
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error("[NotificationDispatcher] Failed for user", n.recipient_user_id, err);
        }
      })
    );
  }

  // ── Convenience factory methods ── ────────────────────────────────────────

  static taskAssigned(params: {
    assigneeId: string;
    assigneeName: string;
    taskId: string;
    taskTitle: string;
    assignedByName: string;
  }): NotificationPayload[] {
    return [
      {
        recipient_user_id: params.assigneeId,
        title: "มีงานใหม่มอบหมายให้คุณ",
        message: `"${params.taskTitle}" ถูกมอบหมายให้คุณโดย ${params.assignedByName}`,
        type: "task_assigned",
        reference_id: params.taskId,
      },
    ];
  }

  static taskDueSoon(params: {
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    daysLeft: number;
  }): NotificationPayload[] {
    return [
      {
        recipient_user_id: params.assigneeId,
        title: "งานใกล้ครบกำหนด",
        message: `"${params.taskTitle}" จะครบกำหนดใน ${params.daysLeft} วัน`,
        type: "task_due_soon",
        reference_id: params.taskId,
      },
    ];
  }

  static approvalRequired(params: {
    approverId: string;
    taskId: string;
    taskTitle: string;
    requestedByName: string;
  }): NotificationPayload[] {
    return [
      {
        recipient_user_id: params.approverId,
        title: "รออนุมัติงาน",
        message: `"${params.taskTitle}" รอการอนุมัติจากคุณ (ขอโดย ${params.requestedByName})`,
        type: "approval_required",
        reference_id: params.taskId,
      },
    ];
  }

  static approvalDecided(params: {
    requesterId: string;
    taskId: string;
    taskTitle: string;
    decision: "approved" | "rejected" | "returned";
    decidedByName: string;
  }): NotificationPayload[] {
    const decisionLabel =
      params.decision === "approved"
        ? "อนุมัติแล้ว ✅"
        : params.decision === "rejected"
        ? "ปฏิเสธ ❌"
        : "ส่งกลับแก้ไข 🔄";
    return [
      {
        recipient_user_id: params.requesterId,
        title: `งาน${decisionLabel}`,
        message: `"${params.taskTitle}" ${decisionLabel} โดย ${params.decidedByName}`,
        type: `approval_${params.decision}`,
        reference_id: params.taskId,
      },
    ];
  }

  static templateApplied(params: {
    creatorId: string;
    taskId: string;
    taskTitle: string;
    templateName: string;
  }): NotificationPayload[] {
    return [
      {
        recipient_user_id: params.creatorId,
        title: "สร้างงานจาก Template สำเร็จ",
        message: `สร้าง "${params.taskTitle}" จาก Template "${params.templateName}" แล้ว`,
        type: "template_applied",
        reference_id: params.taskId,
      },
    ];
  }
}
