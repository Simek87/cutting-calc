"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  redBorder: "rgba(239,68,68,0.35)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.35)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(34,197,94,0.3)",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface FusionRef {
  id: string;
  section: string;
  date: string;
  path: string;
  notes: string | null;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SECTION_ORDER = ["Moulding", "Cutter", "Pusher", "Pressure Box", "Pattern", "Part", "All"];

function parseDateSort(date: string): number {
  const parts = date.split(".");
  if (parts.length === 2) {
    const month = parseInt(parts[0], 10);
    const year  = parseInt(parts[1], 10);
    if (!isNaN(month) && !isNaN(year)) return year * 100 + month;
  }
  return 0;
}

function isInteresting(notes: string | null): boolean {
  return notes?.includes("**") ?? false;
}

function stripStars(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/\*\*/g, "").trim();
}

// ── Shared styles ──────────────────────────────────────────────────────────

const smallBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "3px 10px",
  backgroundColor: C.accentDim,
  color: C.accent,
  border: `1px solid ${C.accentBorder}`,
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
};

const smallBtnGhost: React.CSSProperties = {
  fontSize: 12,
  padding: "3px 10px",
  backgroundColor: "transparent",
  color: C.textDim,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  cursor: "pointer",
};

const inlineInput: React.CSSProperties = {
  padding: "4px 7px",
  fontSize: 13,
  backgroundColor: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  outline: "none",
};

// ── EditableRow ────────────────────────────────────────────────────────────

function EditableRow({
  ref: entry,
  onSave,
  onCancel,
}: {
  ref: FusionRef;
  onSave: (id: string, date: string, path: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [date,  setDate]  = useState(entry.date);
  const [path,  setPath]  = useState(entry.path);
  const [notes, setNotes] = useState(entry.notes ?? "");

  return (
    <tr style={{ backgroundColor: "rgba(232,160,32,0.04)", borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: "8px 12px", width: 90 }}>
        <input value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inlineInput, width: 72 }} placeholder="M.YYYY" />
      </td>
      <td style={{ padding: "8px 12px" }}>
        <input value={path} onChange={(e) => setPath(e.target.value)} style={{ ...inlineInput, width: "100%" }} placeholder="GENERAL/PRODUCTS/…" />
      </td>
      <td style={{ padding: "8px 12px" }}>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inlineInput, width: "100%" }} placeholder="Notes (use ** for Interesting)" />
      </td>
      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onSave(entry.id, date, path, notes)} style={smallBtn}>Save</button>
          <button onClick={onCancel} style={smallBtnGhost}>✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── AddRow ─────────────────────────────────────────────────────────────────

function AddRow({
  section,
  onAdd,
  onCancel,
}: {
  section: string;
  onAdd: (section: string, date: string, path: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [date,  setDate]  = useState("");
  const [path,  setPath]  = useState("");
  const [notes, setNotes] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dateRef.current?.focus(); }, []);

  const handleAdd = () => { if (date.trim() && path.trim()) onAdd(section, date, path, notes); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") onCancel();
  };

  return (
    <tr style={{ backgroundColor: "rgba(232,160,32,0.04)", borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: "8px 12px", width: 90 }}>
        <input ref={dateRef} value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={handleKey} style={{ ...inlineInput, width: 72 }} placeholder="M.YYYY" />
      </td>
      <td style={{ padding: "8px 12px" }}>
        <input value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={handleKey} style={{ ...inlineInput, width: "100%" }} placeholder="GENERAL/PRODUCTS/…" />
      </td>
      <td style={{ padding: "8px 12px" }}>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} onKeyDown={handleKey} style={{ ...inlineInput, width: "100%" }} placeholder="Notes (use ** for Interesting)" />
      </td>
      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleAdd} style={smallBtn}>Add</button>
          <button onClick={onCancel} style={smallBtnGhost}>✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── SectionBlock ───────────────────────────────────────────────────────────

function SectionBlock({
  section,
  entries,
  defaultOpen,
  onUpdate,
  onDelete,
  onCreate,
}: {
  section: string;
  entries: FusionRef[];
  defaultOpen?: boolean;
  onUpdate: (id: string, date: string, path: string, notes: string) => void;
  onDelete: (id: string) => void;
  onCreate: (section: string, date: string, path: string, notes: string) => void;
}) {
  const [open,         setOpen]         = useState(defaultOpen ?? true);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [addingRow,    setAddingRow]    = useState(false);
  const [deleteConfId, setDeleteConfId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => parseDateSort(b.date) - parseDateSort(a.date));

  return (
    <>
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        {/* Section header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: open ? C.surface2 : C.surface, borderBottom: open ? `1px solid ${C.border}` : "none" }}
        >
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
              style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.18s ease", color: C.accent }}
            >
              <path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, textAlign: "left" }}
          >
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600, fontSize: 14, color: C.text }}>
              {section}
            </span>
          </button>

          <span style={{ fontSize: 11, color: C.textMuted, marginRight: 4 }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>

          <button
            onClick={() => { setAddingRow(true); if (!open) setOpen(true); }}
            style={{ ...smallBtn, fontSize: 11 }}
          >
            + Entry
          </button>
        </div>

        {/* Entries table */}
        {open && (
          <div style={{ backgroundColor: C.bg, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={th}>Date</th>
                  <th style={th}>Path</th>
                  <th style={th}>Notes</th>
                  <th style={{ ...th, width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) =>
                  editingId === entry.id ? (
                    <EditableRow
                      key={entry.id}
                      ref={entry}
                      onSave={(id, date, path, notes) => {
                        onUpdate(id, date, path, notes);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: i < sorted.length - 1 || addingRow ? `1px solid ${C.border}` : "none",
                        backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}
                    >
                      {/* Date badge */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top", width: 90, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
                            fontSize: 11,
                            fontFamily: "var(--font-jetbrains-mono)",
                            backgroundColor: C.accentDim,
                            color: C.accent,
                            border: `1px solid ${C.accentBorder}`,
                            borderRadius: 4,
                          }}
                        >
                          {entry.date}
                        </span>
                      </td>

                      {/* Path */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                        <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, color: C.text }}>
                          {entry.path}
                        </span>
                      </td>

                      {/* Notes + Interesting badge */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                          {isInteresting(entry.notes) && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                padding: "1px 7px",
                                fontSize: 11,
                                fontFamily: "var(--font-jetbrains-mono)",
                                backgroundColor: C.amberDim,
                                color: C.amber,
                                border: `1px solid ${C.amberBorder}`,
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              ★ Interesting
                            </span>
                          )}
                          {entry.notes && (
                            <span style={{ fontSize: 13, color: C.textDim }}>
                              {stripStars(entry.notes)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "10px 12px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            onClick={() => setEditingId(entry.id)}
                            style={{ fontSize: 11, padding: "2px 7px", backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textDim, cursor: "pointer" }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setDeleteConfId(entry.id)}
                            style={{ fontSize: 11, padding: "2px 7px", backgroundColor: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 4, color: C.red, cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {/* Add row form */}
                {addingRow && (
                  <AddRow
                    section={section}
                    onAdd={(sec, date, path, notes) => {
                      onCreate(sec, date, path, notes);
                      setAddingRow(false);
                    }}
                    onCancel={() => setAddingRow(false)}
                  />
                )}

                {sorted.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={4} style={{ padding: "20px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                      No entries — click{" "}
                      <span style={{ color: C.accent, cursor: "pointer" }} onClick={() => setAddingRow(true)}>
                        + Entry
                      </span>{" "}
                      to add one
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfId && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
          onClick={() => setDeleteConfId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "22px 26px", width: 320 }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Delete entry?</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 18 }}>This Fusion reference will be permanently removed.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfId(null)} style={smallBtnGhost}>Cancel</button>
              <button
                onClick={() => { onDelete(deleteConfId); setDeleteConfId(null); }}
                style={{ fontSize: 13, padding: "5px 14px", backgroundColor: C.redDim, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 5, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#4e5560",
};

// ── Main component ─────────────────────────────────────────────────────────

export function FusionRefsClient() {
  const [refs,    setRefs]    = useState<FusionRef[]>([]);
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRefs = useCallback(async (q?: string) => {
    const url = q ? `/api/fusion-refs?q=${encodeURIComponent(q)}` : "/api/fusion-refs";
    const res = await fetch(url);
    if (res.ok) setRefs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchRefs(query || undefined), 250);
    return () => clearTimeout(t);
  }, [query, fetchRefs]);

  const handleUpdate = async (id: string, date: string, path: string, notes: string) => {
    const res = await fetch(`/api/fusion-refs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, path, notes }),
    });
    if (res.ok) {
      const updated: FusionRef = await res.json();
      setRefs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/fusion-refs/${id}`, { method: "DELETE" });
    setRefs((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreate = async (section: string, date: string, path: string, notes: string) => {
    const res = await fetch("/api/fusion-refs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, date, path, notes }),
    });
    if (res.ok) {
      const created: FusionRef = await res.json();
      setRefs((prev) => [...prev, created]);
    }
  };

  // Group by section
  const grouped = new Map<string, FusionRef[]>();
  for (const ref of refs) {
    const bucket = grouped.get(ref.section) ?? [];
    bucket.push(ref);
    grouped.set(ref.section, bucket);
  }

  // Build ordered sections list (known order first, then any extras)
  const sections: string[] = [];
  for (const s of SECTION_ORDER) {
    if (grouped.has(s)) sections.push(s);
  }
  for (const s of grouped.keys()) {
    if (!SECTION_ORDER.includes(s)) sections.push(s);
  }
  // If searching show all sections that have results
  if (query && sections.length === 0 && !loading) {
    // handled by empty state below
  }

  const totalInteresting = refs.filter((r) => isInteresting(r.notes)).length;

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)", color: C.text }}>
              Fusion References
            </h1>
            <p className="text-sm" style={{ color: C.textDim }}>
              CAM program library — Fusion 360 examples by component type
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {refs.length} entries
            </span>
            {totalInteresting > 0 && (
              <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: C.amberDim, color: C.amber, border: `1px solid ${C.amberBorder}`, borderRadius: 4 }}>
                ★ {totalInteresting} interesting
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }}
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search path, notes, section…"
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              fontSize: 14,
              backgroundColor: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              outline: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 14, lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0", fontSize: 13 }}>
            Loading…
          </div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0", fontSize: 13 }}>
            {query ? `No results for "${query}"` : "No entries yet"}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section, i) => (
              <SectionBlock
                key={section}
                section={section}
                entries={grouped.get(section) ?? []}
                defaultOpen={i === 0}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
