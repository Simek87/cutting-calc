"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface PartOp {
  id: string;
  status: string;
  type: string;
}

interface ToolPart {
  id: string;
  name: string;
  sectionId: string | null;
  section: { id: string; name: string } | null;
  conversionStatus: string;
  operations: PartOp[];
}

interface ToolIssue {
  id: string;
  title: string;
  status: string;
  priority: string;
  part: { id: string; name: string } | null;
  openedAt: string;
}

interface ToolData {
  id: string;
  projectName: string;
  status: string;
  projectType: string;
  archived: boolean;
  archivedAt: string | null;
  machineTarget: string | null;
  dueDate: string | null;
  sections: { id: string; name: string }[];
  parts: ToolPart[];
  issues: ToolIssue[];
}

interface ActivityLog {
  id: string;
  entityType: string;
  entityName: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  surface2: "#1a1d20",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

// ── Section helpers ────────────────────────────────────────────────────────

function toSectionCode(name: string): string {
  const MAP: Record<string, string> = {
    MLD: "MLD", MOULDING: "MLD", MOULD: "MLD",
    PLG: "PLG", "PLUG ASSIST": "PLG", PLUG: "PLG",
    CUT: "CUT", CUTTING: "CUT", CUTTER: "CUT",
    AVL: "AVL", ANVIL: "AVL",
    PBX: "PBX", "PRESSURE BOX": "PBX", PNP: "PBX", PUSHER: "PBX",
  };
  return MAP[name.trim().toUpperCase()] ?? name.toUpperCase().slice(0, 3);
}

const SECTION_STYLE: Record<string, { bg: string; text: string; border: string; header: string }> = {
  MLD: { bg: "rgba(59,130,246,0.1)", text: "#93c5fd", border: "rgba(59,130,246,0.3)", header: "rgba(59,130,246,0.18)" },
  PLG: { bg: "rgba(168,85,247,0.1)", text: "#c4b5fd", border: "rgba(168,85,247,0.3)", header: "rgba(168,85,247,0.18)" },
  CUT: { bg: "rgba(239,68,68,0.1)", text: "#fca5a5", border: "rgba(239,68,68,0.3)", header: "rgba(239,68,68,0.18)" },
  AVL: { bg: "rgba(139,92,246,0.1)", text: "#ddd6fe", border: "rgba(139,92,246,0.3)", header: "rgba(139,92,246,0.18)" },
  PBX: { bg: "rgba(34,197,94,0.1)", text: "#86efac", border: "rgba(34,197,94,0.3)", header: "rgba(34,197,94,0.18)" },
};

function getSectionStyle(sectionName: string) {
  const code = toSectionCode(sectionName);
  return (
    SECTION_STYLE[code] ?? {
      bg: "rgba(107,114,128,0.1)",
      text: "#9ca3af",
      border: "rgba(107,114,128,0.3)",
      header: "rgba(107,114,128,0.15)",
    }
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────

const PROJECT_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  NewTool:    { bg: "rgba(34,197,94,0.15)",  text: "#86efac" },
  Conversion: { bg: "rgba(232,160,32,0.15)", text: "#fbbf24" },
  RnD:        { bg: "rgba(59,130,246,0.15)", text: "#93c5fd" },
  Custom:     { bg: "rgba(168,85,247,0.15)", text: "#c4b5fd" },
};

function ProjectTypeBadge({ type }: { type: string }) {
  const s = PROJECT_TYPE_STYLE[type] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
      {type}
    </span>
  );
}

const CONV_STYLE: Record<string, { bg: string; text: string }> = {
  New:    { bg: "rgba(59,130,246,0.15)", text: "#93c5fd" },
  Reuse:  { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  Rework: { bg: "rgba(232,160,32,0.15)", text: "#fbbf24" },
};

function ConvBadge({ status }: { status: string }) {
  const s = CONV_STYLE[status] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

const TOOL_STATUS_STYLE: Record<string, { text: string; border: string }> = {
  Management: { text: "#9ca3af", border: "#374151" },
  CAD:        { text: "#93c5fd", border: "#1d4ed8" },
  CAM:        { text: "#c4b5fd", border: "#7c3aed" },
  Manufacturing: { text: "#fcd34d", border: "#b45309" },
  Toolmaking: { text: "#fdba74", border: "#c2410c" },
  Done:       { text: "#86efac", border: "#15803d" },
  Cancelled:  { text: "#6b7280", border: "#374151" },
};

function ToolStatusBadge({ status }: { status: string }) {
  const s = TOOL_STATUS_STYLE[status] ?? { text: C.textDim, border: C.border };
  return (
    <span className="text-xs px-2 py-0.5 rounded" style={{ color: s.text, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  Critical: { bg: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  High:     { bg: "rgba(251,146,60,0.2)",   text: "#fdba74" },
  Medium:   { bg: "rgba(232,160,32,0.15)",  text: "#fbbf24" },
  Low:      { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLE[priority] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
      {priority}
    </span>
  );
}

// ── Op pip ─────────────────────────────────────────────────────────────────

function OpPip({ status }: { status: string }) {
  const COLOR: Record<string, string> = {
    Done: "#22c55e", Received: "#22c55e",
    InProgress: "#e8a020",
    Blocked: "#ef4444",
    NotStarted: "#2a2d30", NotOrdered: "#2a2d30", Pending: "#2a2d30",
    Ready: "#3b82f6", Sent: "#818cf8", Ordered: "#a78bfa",
  };
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
      style={{ backgroundColor: COLOR[status] ?? "#2a2d30" }}
      title={status}
    />
  );
}

// ── Part card ──────────────────────────────────────────────────────────────

function PartCard({
  part,
  toolId,
  showConversion,
}: {
  part: ToolPart;
  toolId: string;
  showConversion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const secStyle = part.section ? getSectionStyle(part.section.name) : null;

  return (
    <Link
      href={`/tools/${toolId}/parts/${part.id}`}
      className="block rounded-lg p-3"
      style={{
        backgroundColor: C.surface2,
        border: `1px solid ${hovered ? C.accentBorder : C.border}`,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className="text-xs font-semibold leading-tight break-words"
          style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {part.name}
        </span>
        {showConversion && <ConvBadge status={part.conversionStatus} />}
      </div>

      {part.section && secStyle && (
        <div className="mb-2">
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: secStyle.bg, color: secStyle.text }}
          >
            {toSectionCode(part.section.name)}
          </span>
        </div>
      )}

      {part.operations.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {part.operations.map((op) => (
            <OpPip key={op.id} status={op.status} />
          ))}
        </div>
      )}

      {part.operations.length === 0 && (
        <span className="text-xs" style={{ color: C.textMuted }}>
          No operations
        </span>
      )}
    </Link>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function ToolDetailClient({
  tool: initialTool,
  activityLogs,
}: {
  tool: ToolData;
  activityLogs: ActivityLog[];
}) {
  const router = useRouter();
  const [tool] = useState(initialTool);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleArchive = async () => {
    if (!confirm(`Archive "${tool.projectName}"? It will be hidden from the dashboard.`)) return;
    setArchiving(true);
    await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    router.push("/");
  };

  const handleRestore = async () => {
    if (!confirm(`Restore "${tool.projectName}" to active projects?`)) return;
    setRestoring(true);
    await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    router.push("/");
  };

  // Group parts by section
  const assignedIds = new Set<string>();
  const grouped: { section: { id: string; name: string } | null; parts: ToolPart[] }[] = [];

  tool.sections.forEach((sec) => {
    const parts = tool.parts.filter((p) => p.sectionId === sec.id);
    parts.forEach((p) => assignedIds.add(p.id));
    grouped.push({ section: sec, parts });
  });

  const unassigned = tool.parts.filter((p) => !assignedIds.has(p.id));
  if (unassigned.length > 0) grouped.push({ section: null, parts: unassigned });

  const isConversion = tool.projectType === "Conversion";

  return (
    <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: C.bg, color: C.text }}>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Archived banner */}
        {tool.archived && (
          <div
            className="rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: "rgba(232,160,32,0.08)", border: `1px solid ${C.accentBorder}` }}
          >
            <span className="text-sm" style={{ color: C.accent }}>
              This project is archived. Restore to make changes.
            </span>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="text-xs px-3 py-1.5 rounded flex-shrink-0 disabled:opacity-50"
              style={{ backgroundColor: C.accent, color: "#000", fontWeight: 600 }}
            >
              {restoring ? "Restoring…" : "Restore Project"}
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-4" style={{ color: C.textMuted }}>
          <Link href="/" style={{ color: C.textDim }} className="hover:opacity-80">
            Dashboard
          </Link>
          <span>›</span>
          <span style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}>
            {tool.projectName}
          </span>
        </div>

        {/* Header card */}
        <div
          className="rounded-lg p-5 mb-6"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="text-xl font-bold mb-2"
                style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {tool.projectName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <ProjectTypeBadge type={tool.projectType} />
                <ToolStatusBadge status={tool.status} />
                {tool.machineTarget && (
                  <span className="text-xs" style={{ color: C.textDim }}>
                    {tool.machineTarget}
                  </span>
                )}
                {tool.dueDate && (
                  <span className="text-xs" style={{ color: C.textMuted }}>
                    Due:{" "}
                    {new Date(tool.dueDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={`/api/process-card/project/${tool.id}`}
                download
                className="text-xs px-3 py-1.5 rounded hover:opacity-80"
                style={{ color: C.textDim, border: `1px solid ${C.border}` }}
              >
                Export PDF
              </a>
              {tool.archived ? (
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                  style={{ backgroundColor: C.accent, color: "#000", fontWeight: 600 }}
                >
                  {restoring ? "Restoring…" : "Restore"}
                </button>
              ) : (
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                  style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {archiving ? "Archiving…" : "Archive"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Parts by section */}
        <div className="space-y-6">
          {tool.parts.length === 0 && (
            <p className="text-sm text-center py-12" style={{ color: C.textMuted }}>
              No parts yet.
            </p>
          )}

          {grouped.map(({ section, parts }) => {
            if (parts.length === 0 && section !== null) return null;
            const code = section ? toSectionCode(section.name) : null;
            const ss = section ? getSectionStyle(section.name) : null;

            return (
              <div key={section?.id ?? "__unassigned"}>
                {section && ss && (
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 rounded-t-lg"
                    style={{
                      backgroundColor: ss.header,
                      border: `1px solid ${ss.border}`,
                      borderBottom: "none",
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: ss.text,
                        fontFamily: "var(--font-jetbrains-mono)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      [{code}] {section.name}
                    </span>
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {parts.length} {parts.length === 1 ? "part" : "parts"}
                    </span>
                  </div>
                )}

                {!section && parts.length > 0 && (
                  <p className="text-xs mb-2" style={{ color: C.textMuted }}>
                    Unassigned
                  </p>
                )}

                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                    ...(section && ss
                      ? {
                          padding: "12px",
                          border: `1px solid ${ss.border}`,
                          borderTop: "none",
                          borderRadius: "0 0 8px 8px",
                          backgroundColor: "rgba(0,0,0,0.15)",
                        }
                      : {}),
                  }}
                >
                  {parts.length === 0 ? (
                    <p className="text-xs col-span-full py-2" style={{ color: C.textMuted }}>
                      No parts in this section.
                    </p>
                  ) : (
                    parts.map((part) => (
                      <PartCard
                        key={part.id}
                        part={part}
                        toolId={tool.id}
                        showConversion={isConversion}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{ width: 280, borderLeft: `1px solid ${C.border}`, backgroundColor: C.surface }}
      >
        {/* Changelog */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div
            className="px-4 py-3 text-xs font-semibold sticky top-0 z-10"
            style={{
              color: C.textDim,
              borderBottom: `1px solid ${C.border}`,
              backgroundColor: C.surface,
            }}
          >
            CHANGELOG
          </div>
          {activityLogs.length === 0 ? (
            <p className="px-4 py-4 text-xs" style={{ color: C.textMuted }}>
              No activity yet.
            </p>
          ) : (
            activityLogs.map((log) => {
              const isAuto = log.action === "status_changed" || log.action === "created";
              return (
                <div
                  key={log.id}
                  className="px-4 py-3 flex gap-2.5"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: isAuto ? "#3b82f6" : C.accent }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs leading-snug" style={{ color: C.text }}>
                      <span className="font-medium">{log.entityName}</span>{" "}
                      {log.action.replace(/_/g, " ")}
                      {log.detail ? (
                        <span style={{ color: C.textDim }}>{`: ${log.detail}`}</span>
                      ) : null}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                      {new Date(log.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Open issues */}
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div
            className="px-4 py-3 text-xs font-semibold flex items-center justify-between"
            style={{ color: C.textDim, borderBottom: `1px solid ${C.border}` }}
          >
            <span>OPEN ISSUES</span>
            {tool.issues.length > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                {tool.issues.length}
              </span>
            )}
          </div>
          {tool.issues.length === 0 ? (
            <p className="px-4 py-4 text-xs" style={{ color: C.textMuted }}>
              No open issues.
            </p>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
              {tool.issues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/issues?filter=open`}
                  className="block px-4 py-3 hover:opacity-80 transition-opacity"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium leading-snug" style={{ color: C.text }}>
                      {issue.title}
                    </span>
                    <PriorityBadge priority={issue.priority} />
                  </div>
                  {issue.part && (
                    <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                      {issue.part.name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
