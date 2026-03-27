// Client-safe types and helpers — no server imports

export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  detail: string | null;
  toolId: string | null;
  partId: string | null;
  partName: string | null;
  toolName: string | null;
  createdAt: string;
}

export function activityLabel(entry: ActivityEntry): string {
  const { entityType, entityName, action, detail } = entry;

  if (action === "status_changed" && detail) {
    return `${entityName}: ${detail}`;
  }

  if (action === "created") {
    if (entityType === "order")     return `New order — ${entityName}`;
    if (entityType === "outsource") return `Outsource started — ${entityName}`;
    if (entityType === "part")      return `Part added — ${entityName}`;
    if (entityType === "tool")      return `Tool created — ${entityName}`;
    return `Created — ${entityName}`;
  }

  if (action === "deleted") {
    return `Deleted — ${entityName}`;
  }

  if (action === "updated") {
    return detail ? `${entityName} — ${detail}` : `Updated — ${entityName}`;
  }

  return detail ? `${entityName}: ${detail}` : entityName;
}
