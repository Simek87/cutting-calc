"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  toolId: string;
  tool: { id: string; projectName: string };
  partId: string | null;
  part: { id: string; name: string } | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
}

interface ToolOption {
  id: string;
  projectName: string;
  parts: { id: string; name: string }[];
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
  green: "#22c55e",
  red: "#ef4444",
};

const fieldStyle = {
  backgroundColor: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
};

// ── Badges ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Open:       { bg: "rgba(239,68,68,0.15)",  text: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  InProgress: { bg: "rgba(232,160,32,0.15)", text: "#fbbf24", border: "rgba(232,160,32,0.35)" },
  Closed:     { bg: "rgba(34,197,94,0.15)",  text: "#86efac", border: "rgba(34,197,94,0.35)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: C.border };
  return (
    <span className="text-xs px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {status === "InProgress" ? "In Progress" : status}
    </span>
  );
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string; order: number }> = {
  Critical: { bg: "rgba(239,68,68,0.2)",    text: "#fca5a5",  order: 0 },
  High:     { bg: "rgba(251,146,60,0.2)",   text: "#fdba74",  order: 1 },
  Medium:   { bg: "rgba(232,160,32,0.15)",  text: "#fbbf24",  order: 2 },
  Low:      { bg: "rgba(107,114,128,0.15)", text: "#9ca3af",  order: 3 },
};

function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLE[priority] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", order: 99 };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text }}>
      {priority}
    </span>
  );
}

// ── Sort helpers ───────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { Open: 0, InProgress: 1, Closed: 2 };

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (so !== 0) return so;
    const po = (PRIORITY_STYLE[a.priority]?.order ?? 9) - (PRIORITY_STYLE[b.priority]?.order ?? 9);
    if (po !== 0) return po;
    // Closed: newest first; others: oldest first
    if (a.status === "Closed") return new Date(b.closedAt ?? b.createdAt).getTime() - new Date(a.closedAt ?? a.createdAt).getTime();
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function issueNumber(allSortedByCreated: Issue[], id: string): string {
  const idx = allSortedByCreated.findIndex((i) => i.id === id);
  return `#${String(idx + 1).padStart(3, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── New Issue Modal ────────────────────────────────────────────────────────

function NewIssueModal({
  tools,
  onClose,
  onCreated,
}: {
  tools: ToolOption[];
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    toolId: tools[0]?.id ?? "",
    partId: "",
    priority: "Medium",
  });
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const selectedTool = tools.find((t) => t.id === form.toolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          toolId: form.toolId,
          partId: form.partId || null,
          priority: form.priority,
          status: "Open",
        }),
      });
      if (res.ok) {
        const issue = await res.json();
        onCreated(issue);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg w-full max-w-md p-6"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: C.text }}>
          New Issue
          <span className="text-xs font-normal ml-2" style={{ color: C.textMuted }}>Ctrl+N</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1" style={{ color: C.textDim }}>Title *</label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Describe the issue…"
              className={inputCls}
              style={fieldStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs mb-1" style={{ color: C.textDim }}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Additional details…"
              className="w-full px-3 py-2 text-sm rounded outline-none resize-none"
              style={fieldStyle}
            />
          </div>

          {/* Tool + Part row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: C.textDim }}>Project *</label>
              <select
                value={form.toolId}
                onChange={(e) => setForm({ ...form, toolId: e.target.value, partId: "" })}
                className={inputCls}
                style={fieldStyle}
              >
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>{t.projectName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: C.textDim }}>Part (optional)</label>
              <select
                value={form.partId}
                onChange={(e) => setForm({ ...form, partId: e.target.value })}
                className={inputCls}
                style={fieldStyle}
              >
                <option value="">— none —</option>
                {(selectedTool?.parts ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs mb-1" style={{ color: C.textDim }}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={inputCls}
              style={fieldStyle}
            >
              {["Critical", "High", "Medium", "Low"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs rounded"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}>Cancel</button>
            <button type="submit" disabled={loading || !form.title.trim() || !form.toolId}
              className="px-4 py-2 text-xs rounded font-medium disabled:opacity-50"
              style={{ backgroundColor: C.accent, color: "#000" }}>
              {loading ? "Creating…" : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Panel ─────────────────────────────────────────────────────────────

function EditPanel({
  issue,
  tools,
  issueNum,
  onClose,
  onUpdated,
  onDeleted,
}: {
  issue: Issue;
  tools: ToolOption[];
  issueNum: string;
  onClose: () => void;
  onUpdated: (updated: Issue) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    title: issue.title,
    description: issue.description ?? "",
    status: issue.status,
    priority: issue.priority,
    partId: issue.partId ?? "",
  });
  const [saving, setSaving] = useState(false);

  const selectedTool = tools.find((t) => t.id === issue.toolId);
  const isDirty =
    form.title !== issue.title ||
    form.description !== (issue.description ?? "") ||
    form.status !== issue.status ||
    form.priority !== issue.priority ||
    form.partId !== (issue.partId ?? "");

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        partId: form.partId || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete issue "${issue.title}"?`)) return;
    await fetch(`/api/issues/${issue.id}`, { method: "DELETE" });
    onDeleted(issue.id);
  };

  const inputCls = "w-full px-3 py-1.5 text-sm rounded outline-none";

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: C.surface, borderLeft: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}>
        <span className="text-xs font-bold" style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}>
          {issueNum}
        </span>
        <button onClick={onClose} className="text-lg w-6 h-6 flex items-center justify-center rounded hover:opacity-70"
          style={{ color: C.textDim }}>×</button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Title */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputCls}
            style={fieldStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-1.5 text-sm rounded outline-none resize-none"
            style={fieldStyle}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={inputCls} style={fieldStyle}>
            <option value="Open">Open</option>
            <option value="InProgress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className={inputCls} style={fieldStyle}>
            {["Critical", "High", "Medium", "Low"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Part */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Part</label>
          <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}
            className={inputCls} style={fieldStyle}>
            <option value="">— none —</option>
            {(selectedTool?.parts ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Project (read-only) */}
        <div>
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>Project</label>
          <Link
            href={`/tools/${issue.toolId}`}
            className="block text-xs hover:opacity-80"
            style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {issue.tool.projectName} ↗
          </Link>
        </div>

        {/* Dates */}
        <div className="pt-1 space-y-1">
          <div className="text-xs" style={{ color: C.textMuted }}>
            Opened: <span style={{ color: C.textDim }}>{fmtDate(issue.openedAt)}</span>
          </div>
          {issue.closedAt && (
            <div className="text-xs" style={{ color: C.textMuted }}>
              Closed: <span style={{ color: C.textDim }}>{fmtDate(issue.closedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleDelete}
          className="text-xs px-3 py-1.5 rounded"
          style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || !form.title.trim()}
          className="text-xs px-4 py-1.5 rounded font-medium disabled:opacity-40"
          style={{ backgroundColor: C.accent, color: "#000" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Main client ────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["ALL", "OPEN", "IN PROGRESS", "CLOSED"] as const;
const PRIORITY_FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

const STATUS_FILTER_MAP: Record<string, string> = {
  "OPEN": "Open", "IN PROGRESS": "InProgress", "CLOSED": "Closed",
};

export function IssuesClient({
  issues: initialIssues,
  tools,
  initialFilter,
  initialSelected = "",
}: {
  issues: Issue[];
  tools: ToolOption[];
  initialFilter: string;
  initialSelected?: string;
}) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const f = initialFilter.toUpperCase();
    if (f === "OPEN") return "OPEN";
    if (f === "INPROGRESS" || f === "IN_PROGRESS" || f === "IN PROGRESS") return "IN PROGRESS";
    if (f === "CLOSED") return "CLOSED";
    return "ALL";
  });
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowNewModal(true);
      }
      if (e.key === "Escape") {
        if (showNewModal) { setShowNewModal(false); return; }
        if (selectedId) { setSelectedId(null); return; }
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showNewModal, selectedId]);

  const handleCreated = useCallback((issue: Issue) => {
    setIssues((prev) => [...prev, issue]);
    setSelectedId(issue.id);
  }, []);

  const handleUpdated = useCallback((updated: Issue) => {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }, []);

  // Sorted by createdAt for numbering
  const byCreated = [...issues].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Stats
  const openCount = issues.filter((i) => i.status === "Open").length;
  const inProgressCount = issues.filter((i) => i.status === "InProgress").length;
  const closedCount = issues.filter((i) => i.status === "Closed").length;

  // Filter & search
  const visible = sortIssues(issues).filter((issue) => {
    if (statusFilter !== "ALL") {
      const expected = STATUS_FILTER_MAP[statusFilter];
      if (issue.status !== expected) return false;
    }
    if (priorityFilter !== "ALL") {
      if (issue.priority.toUpperCase() !== priorityFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const inTitle = issue.title.toLowerCase().includes(q);
      const inPart = issue.part?.name.toLowerCase().includes(q) ?? false;
      const inProject = issue.tool.projectName.toLowerCase().includes(q);
      if (!inTitle && !inPart && !inProject) return false;
    }
    return true;
  });

  const selectedIssue = issues.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: C.bg, color: C.text }}>
      {/* Header bar */}
      <div className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}>
        <h1 className="text-sm font-semibold" style={{ color: C.text }}>Issues</h1>

        {/* Stats */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: STATUS_STYLE.Open.bg, color: STATUS_STYLE.Open.text, border: `1px solid ${STATUS_STYLE.Open.border}` }}>
            {openCount} Open
          </span>
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: STATUS_STYLE.InProgress.bg, color: STATUS_STYLE.InProgress.text, border: `1px solid ${STATUS_STYLE.InProgress.border}` }}>
            {inProgressCount} In Progress
          </span>
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: STATUS_STYLE.Closed.bg, color: STATUS_STYLE.Closed.text, border: `1px solid ${STATUS_STYLE.Closed.border}` }}>
            {closedCount} Closed
          </span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search… Ctrl+F"
          className="text-xs px-3 py-1.5 rounded outline-none w-44"
          style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
        />

        {/* New Issue */}
        <button
          onClick={() => setShowNewModal(true)}
          className="text-xs px-3 py-1.5 rounded"
          style={{ backgroundColor: C.accentDim, color: C.accent, border: `1px solid ${C.accentBorder}` }}
        >
          + New <span style={{ color: C.textMuted, fontSize: 10 }}>Ctrl+N</span>
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-6 px-6 py-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}>
        {/* Status filters */}
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className="text-xs px-2.5 py-1 rounded transition-colors"
              style={{
                backgroundColor: statusFilter === f ? C.accent : C.surface,
                color: statusFilter === f ? "#000" : C.textDim,
                border: `1px solid ${statusFilter === f ? C.accent : C.border}`,
                fontWeight: statusFilter === f ? 600 : 400,
              }}>
              {f}
            </button>
          ))}
        </div>

        <div className="w-px h-4" style={{ backgroundColor: C.border }} />

        {/* Priority filters */}
        <div className="flex items-center gap-1.5">
          {PRIORITY_FILTERS.map((f) => {
            const pStyle = f !== "ALL" ? PRIORITY_STYLE[f.charAt(0) + f.slice(1).toLowerCase()] : null;
            const isActive = priorityFilter === f;
            return (
              <button key={f} onClick={() => setPriorityFilter(f)}
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={{
                  backgroundColor: isActive ? (pStyle?.bg ?? C.accent) : C.surface,
                  color: isActive ? (pStyle?.text ?? "#000") : C.textDim,
                  border: `1px solid ${isActive ? (pStyle?.bg ?? C.accent) : C.border}`,
                  fontWeight: isActive ? 600 : 400,
                }}>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Issue list */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="text-sm text-center py-16" style={{ color: C.textMuted }}>
              No issues match the current filters.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: C.bg }}>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["#", "TITLE", "PROJECT", "PART", "PRIORITY", "STATUS", "OPENED", "CLOSED"].map((col) => (
                    <th key={col}
                      className="text-left px-4 py-2 text-xs font-medium whitespace-nowrap"
                      style={{ color: C.textMuted }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((issue) => {
                  const isClosed = issue.status === "Closed";
                  const isSelected = issue.id === selectedId;
                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedId(isSelected ? null : issue.id)}
                      className="cursor-pointer"
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        backgroundColor: isSelected ? C.accentDim : "transparent",
                        opacity: isClosed ? 0.5 : 1,
                      }}
                    >
                      {/* # */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: C.textMuted, fontFamily: "var(--font-jetbrains-mono)" }}>
                          {issueNumber(byCreated, issue.id)}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-sm leading-snug"
                          style={{
                            color: C.text,
                            textDecoration: isClosed ? "line-through" : "none",
                          }}>
                          {issue.title}
                        </span>
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}>
                          {issue.tool.projectName}
                        </span>
                      </td>

                      {/* Part */}
                      <td className="px-4 py-3">
                        {issue.part ? (
                          <span className="text-xs" style={{ color: C.textDim, fontFamily: "var(--font-jetbrains-mono)" }}>
                            {issue.part.name}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: C.textMuted }}>—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PriorityBadge priority={issue.priority} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={issue.status} />
                      </td>

                      {/* Opened */}
                      <td className="px-4 py-3">
                        <span className="text-xs tabular-nums" style={{ color: C.textDim }}>
                          {fmtDate(issue.openedAt)}
                        </span>
                      </td>

                      {/* Closed */}
                      <td className="px-4 py-3">
                        {issue.closedAt ? (
                          <span className="text-xs tabular-nums" style={{ color: C.textDim }}>
                            {fmtDate(issue.closedAt)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: C.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit panel */}
        {selectedIssue && (
          <div className="flex-shrink-0 overflow-hidden" style={{ width: 300 }}>
            <EditPanel
              key={selectedIssue.id}
              issue={selectedIssue}
              tools={tools}
              issueNum={issueNumber(byCreated, selectedIssue.id)}
              onClose={() => setSelectedId(null)}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          </div>
        )}
      </div>

      {/* New Issue modal */}
      {showNewModal && (
        <NewIssueModal
          tools={tools}
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
