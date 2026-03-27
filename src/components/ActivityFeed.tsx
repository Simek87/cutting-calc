"use client";

import Link from "next/link";
import { ActivityEntry, activityLabel } from "@/lib/activity-types";

const ENTITY_ICON: Record<string, string> = {
  tool:      "🗂",
  order:     "📦",
  outsource: "🔧",
  part:      "⚙",
  operation: "⚡",
};

const ACTION_COLOR: Record<string, string> = {
  created:        "text-green-600",
  deleted:        "text-red-500",
  status_changed: "text-blue-600",
  updated:        "text-gray-600",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function entryHref(e: ActivityEntry): string | null {
  if (e.entityType === "order") return "/procurement";
  if (!e.toolId) return null;
  const base = `/tools/${e.toolId}`;
  const pid = e.partId ?? (e.entityType === "part" ? e.entityId : null);
  return pid ? `${base}#part-${pid}` : base;
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
  title?: string;
}

export function ActivityFeed({ entries, title = "Recent Activity" }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">{title}</h2>
        <p className="text-sm text-gray-400 py-4 border border-dashed rounded-lg text-center">No activity yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">{title}</h2>
      <div className="border rounded-lg divide-y bg-white">
        {entries.map((e) => {
          const href = entryHref(e);
          const context = [e.toolName, e.partName].filter(Boolean).join(" → ");

          const inner = (
            <div className="flex items-start gap-3 px-4 py-3 group">
              <span className="text-sm mt-0.5 shrink-0">{ENTITY_ICON[e.entityType] ?? "•"}</span>
              <div className="flex-1 min-w-0">
                {context && (
                  <div className="text-xs text-gray-400 truncate mb-0.5">{context}</div>
                )}
                <span className={`text-sm ${ACTION_COLOR[e.action] ?? "text-gray-600"}`}>
                  {activityLabel(e)}
                </span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(e.createdAt)}</span>
            </div>
          );

          if (href) {
            return (
              <Link
                key={e.id}
                href={href}
                className="block hover:bg-gray-50 transition-colors"
              >
                {inner}
              </Link>
            );
          }
          return <div key={e.id}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
