"use client";

import Link from "next/link";
import { ToolStatus, STATUS_COLORS } from "@/lib/types";
import { getEtaLabel } from "@/lib/blockers";
import { ActivityFeed } from "@/components/ActivityFeed";
import type { ActivityEntry } from "@/lib/activity-types";

interface Stat {
  label: string;
  value: number;
  href?: string;
  alert?: boolean;
}

interface EtaItem {
  type: "order" | "outsource" | "tool";
  id: string;
  label: string;
  eta: string;
  status: string;
  href: string;
}

interface DashboardData {
  stats: {
    activeTools: number;
    openOrders: number;
    overdueOrders: number;
    openJobs: number;
    overdueJobs: number;
    blockedParts: number;
    readyForAssembly: number;
  };
  urgentItems: EtaItem[];
  upcomingEtas: EtaItem[];
  recentTools: {
    id: string;
    projectName: string;
    status: ToolStatus;
    dueDate: string | null;
    partsCount: number;
    progress: number;
  }[];
}

const TYPE_ICON: Record<EtaItem["type"], string> = {
  order: "📦",
  outsource: "🔧",
  tool: "🗓",
};

function EtaBadge({ eta }: { eta: string | null }) {
  const label = getEtaLabel(eta);
  if (!label) return null;
  const map = {
    overdue: "bg-red-100 text-red-700",
    today: "bg-orange-100 text-orange-700",
    this_week: "bg-yellow-100 text-yellow-700",
  };
  const text = { overdue: "Overdue", today: "Due Today", this_week: "This Week" };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[label]}`}>
      {text[label]}
    </span>
  );
}

function StatCard({ label, value, href, alert }: Stat) {
  const content = (
    <div className={`bg-white border rounded-lg p-4 ${alert && value > 0 ? "border-red-300 bg-red-50" : ""}`}>
      <div className={`text-2xl font-bold ${alert && value > 0 ? "text-red-600" : "text-gray-800"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function DashboardClient({ data, activityLogs }: { data: DashboardData; activityLogs: ActivityEntry[] }) {
  const { stats, urgentItems, upcomingEtas, recentTools } = data;

  const statCards: Stat[] = [
    { label: "Active Tools", value: stats.activeTools, href: "/kanban" },
    { label: "Open Orders", value: stats.openOrders, href: "/procurement" },
    { label: "Overdue Orders", value: stats.overdueOrders, href: "/procurement", alert: true },
    { label: "Open Outsourcing", value: stats.openJobs, href: "/outsourcing" },
    { label: "Overdue Outsourcing", value: stats.overdueJobs, href: "/outsourcing", alert: true },
    { label: "Blocked Parts", value: stats.blockedParts, href: "/kanban", alert: true },
    { label: "Ready for Assembly", value: stats.readyForAssembly },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link href="/kanban" className="text-sm text-blue-500 hover:underline">
          Open Kanban →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Urgent / Overdue */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Urgent / Overdue
          </h2>
          {urgentItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 border border-dashed rounded-lg text-center">
              Nothing urgent.
            </p>
          ) : (
            <div className="border rounded-lg divide-y bg-white">
              {urgentItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <span className="text-base">{TYPE_ICON[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.label}</div>
                    {item.eta && (
                      <div className="text-xs text-gray-400">
                        {new Date(item.eta).toLocaleDateString("pl-PL")}
                      </div>
                    )}
                  </div>
                  <EtaBadge eta={item.eta} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming ETAs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Upcoming ETAs (7 days)
          </h2>
          {upcomingEtas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 border border-dashed rounded-lg text-center">
              No upcoming ETAs.
            </p>
          ) : (
            <div className="border rounded-lg divide-y bg-white">
              {upcomingEtas.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <span className="text-base">{TYPE_ICON[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.label}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.eta).toLocaleDateString("pl-PL")}
                    </div>
                  </div>
                  <EtaBadge eta={item.eta} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity log */}
      <ActivityFeed entries={activityLogs} />

      {/* Recent tools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            Recent Tools
          </h2>
          <Link href="/kanban" className="text-xs text-blue-500 hover:underline">View all</Link>
        </div>
        <div className="border rounded-lg divide-y bg-white">
          {recentTools.map((t) => (
            <Link
              key={t.id}
              href={`/tools/${t.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.projectName}</div>
                <div className="text-xs text-gray-400">{t.partsCount} parts</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[t.status as ToolStatus]}`}>
                {t.status}
              </span>
              <div className="w-20">
                <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                  <span>{t.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
              </div>
              {t.dueDate && (
                <EtaBadge eta={t.dueDate} />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
