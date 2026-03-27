import { prisma } from "@/lib/prisma";

export type { ActivityEntry } from "./activity-types";
export { activityLabel } from "./activity-types";

export type ActivityEntityType = "tool" | "order" | "outsource" | "part" | "operation";
export type ActivityAction = "created" | "deleted" | "status_changed" | "updated";

export async function logActivity(opts: {
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  action: ActivityAction;
  detail?: string;
  toolId?: string;
  partId?: string;
}) {
  try {
    await prisma.activityLog.create({ data: opts });
  } catch {
    // activity log is non-critical — never crash the main request
  }
}
