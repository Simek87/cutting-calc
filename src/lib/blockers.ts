import type { Part, Operation, OutsourceJob, OperationStatus } from "@/lib/types";
import { isOpEffectivelyComplete, getEffectiveStatus } from "@/lib/types";

export type BlockReason =
  | "procurement_pending"   // has a procurement op that is not Received
  | "outsource_pending"     // has an outsource op that is not Done
  | "outsource_overdue"     // has an outsource op whose linked job ETA is past
  | "operation_blocked";    // previous sequential operation is not complete

export interface PartBlockInfo {
  partId: string;
  reasons: BlockReason[];
}

export function isOutsourceJobBlocking(job: OutsourceJob): boolean {
  return job.status !== "Done" && job.status !== "Cancelled";
}

export function isOutsourceJobOverdue(job: OutsourceJob): boolean {
  if (!job.eta) return false;
  return new Date(job.eta) < new Date() && job.status !== "Done" && job.status !== "Cancelled";
}

export function isOrderOverdue(eta: string | null, status: string): boolean {
  if (!eta) return false;
  return new Date(eta) < new Date() && status !== "Received" && status !== "Cancelled";
}

export function getPartBlockReasons(
  part: Part & { outsourceJobs?: OutsourceJob[] }
): BlockReason[] {
  const reasons: BlockReason[] = [];
  const ops: Operation[] = part.operations ?? [];

  // Procurement-blocked: any procurement op that hasn't been received
  const hasProcurementBlock = ops.some(
    (op) =>
      (op.type === "procurement" || op.name.toLowerCase() === "order material") &&
      getEffectiveStatus(op) !== "Received"
  );
  if (hasProcurementBlock) reasons.push("procurement_pending");

  // Outsource-blocked: any outsource op that isn't done
  const pendingOutsourceOps = ops.filter(
    (op) => op.type === "outsource" && getEffectiveStatus(op) !== "Done"
  );
  if (pendingOutsourceOps.length > 0) {
    const isOverdue = pendingOutsourceOps.some(
      (op) => op.linkedJob?.eta && new Date(op.linkedJob.eta) < new Date()
    );
    reasons.push(isOverdue ? "outsource_overdue" : "outsource_pending");
  }

  // Operation-blocked: a sequential dependency is not satisfied
  const notYetStarted = (s: OperationStatus) =>
    s === "NotStarted" || s === "NotOrdered" || s === "Pending" || s === "Ready";

  for (let i = 1; i < ops.length; i++) {
    if (
      ops[i].dependsOnPrevious &&
      !isOpEffectivelyComplete(ops[i - 1]) &&
      !notYetStarted(getEffectiveStatus(ops[i]))
    ) {
      reasons.push("operation_blocked");
      break;
    }
  }

  return reasons;
}

export function isPartBlocked(part: Part & { outsourceJobs?: OutsourceJob[] }): boolean {
  return getPartBlockReasons(part).length > 0;
}

export function isToolBlocked(parts: (Part & { outsourceJobs?: OutsourceJob[] })[]): boolean {
  return parts.some(isPartBlocked);
}

export function getEtaLabel(eta: string | null): "overdue" | "today" | "this_week" | null {
  if (!eta) return null;
  const now = new Date();
  const date = new Date(eta);
  const diffMs = date.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays < 1) return "today";
  if (diffDays < 7) return "this_week";
  return null;
}
