import { db } from "../../config/firebase-admin.js";
import type { ApprovalWorkflow, ApprovalStep, ApprovalStatus } from "../../types/approval.js";

const COLLECTION = "approvals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapWorkflow(id: string, data: FirebaseFirestore.DocumentData): ApprovalWorkflow {
  return {
    id,
    task_id: data.task_id ?? "",
    created_by: data.created_by ?? "",
    status: data.status ?? "pending",
    steps: (data.steps ?? []) as ApprovalStep[],
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function createApprovalWorkflow(
  data: Omit<ApprovalWorkflow, "id" | "created_at" | "updated_at">
): Promise<ApprovalWorkflow> {
  const ref = db.collection(COLLECTION).doc();
  const now = new Date().toISOString();
  const workflow: ApprovalWorkflow = {
    ...data,
    id: ref.id,
    created_at: now,
    updated_at: now,
  };
  await ref.set(workflow);
  return workflow;
}

export async function findApprovalById(id: string): Promise<ApprovalWorkflow | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return mapWorkflow(doc.id, doc.data()!);
}

export async function findApprovalByTaskId(taskId: string): Promise<ApprovalWorkflow | null> {
  const snap = await db
    .collection(COLLECTION)
    .where("task_id", "==", taskId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapWorkflow(doc.id, doc.data());
}

export async function findPendingApprovalsByUserId(
  userId: string
): Promise<ApprovalWorkflow[]> {
  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "pending")
    .get();
  const results: ApprovalWorkflow[] = [];
  for (const doc of snap.docs) {
    const workflow = mapWorkflow(doc.id, doc.data());
    const currentStep = workflow.steps.find((s) => s.status === "pending");
    if (currentStep?.approver_id === userId) {
      results.push(workflow);
    }
  }
  return results;
}

// ─── Atomic step update (using Firestore Transaction) ────────────────────────

/**
 * Atomically update an approval step and derive the new workflow status.
 *
 * State machine rules:
 *   - approved + more steps pending → status stays "pending", next step is activated
 *   - approved + all steps done     → status becomes "approved"
 *   - rejected → status becomes "rejected"
 *   - returned → status becomes "returned"
 */
export async function updateApprovalStepAtomic(
  id: string,
  stepOrder: number,
  decision: "approved" | "rejected" | "returned",
  comment: string,
  actorId: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTION).doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Approval workflow not found.");
    const workflow = mapWorkflow(snap.id, snap.data()!);

    // Validate actor is the expected approver
    const currentStep = workflow.steps.find((s) => s.status === "pending");
    if (!currentStep) throw new Error("No pending step found.");
    if (currentStep.order !== stepOrder)
      throw new Error(`Expected step order ${currentStep.order}, got ${stepOrder}.`);
    if (currentStep.approver_id !== actorId)
      throw new Error("You are not the current approver for this step.");

    // Apply decision to current step
    const updatedSteps = workflow.steps.map((s) => {
      if (s.order === stepOrder) {
        return { ...s, status: decision, comment, decided_at: now };
      }
      return s;
    });

    // Derive next workflow status
    let newWorkflowStatus: ApprovalStatus = "pending";
    if (decision === "rejected") {
      newWorkflowStatus = "rejected";
    } else if (decision === "returned") {
      newWorkflowStatus = "returned";
    } else {
      // Approved — check if more steps remain
      const nextPending = updatedSteps.find((s) => s.status === "pending");
      newWorkflowStatus = nextPending ? "pending" : "approved";
    }

    tx.update(docRef, {
      steps: updatedSteps,
      status: newWorkflowStatus,
      updated_at: now,
    });
  });
}

export async function updateApprovalStatus(
  id: string,
  status: ApprovalStatus
): Promise<void> {
  await db.collection(COLLECTION).doc(id).update({
    status,
    updated_at: new Date().toISOString(),
  });
}

// ─── Legacy compat wrapper (kept for existing controller calls) ───────────────
export async function updateApprovalStep(
  id: string,
  stepOrder: number,
  stepUpdates: Partial<ApprovalStep>,
  workflowStatus: ApprovalStatus
): Promise<void> {
  const workflow = await findApprovalById(id);
  if (!workflow) throw new Error("Approval workflow not found");
  const updatedSteps = workflow.steps.map((step) => {
    if (step.order === stepOrder) {
      return { ...step, ...stepUpdates, decided_at: new Date().toISOString() };
    }
    return step;
  });
  await db.collection(COLLECTION).doc(id).update({
    steps: updatedSteps,
    status: workflowStatus,
    updated_at: new Date().toISOString(),
  });
}
