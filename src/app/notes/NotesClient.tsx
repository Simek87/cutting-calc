"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
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
  amber: "#e8a020",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function groupByCategory(notes: Note[]): Map<string, Note[]> {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const key = n.category?.trim() || "General";
    const arr = map.get(key) ?? [];
    arr.push(n);
    map.set(key, arr);
  }
  // Sort categories: General last
  const sorted = new Map<string, Note[]>();
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });
  for (const k of keys) sorted.set(k, map.get(k)!);
  return sorted;
}

// ── Main component ─────────────────────────────────────────────────────────

export function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ noteId: string; x: number; y: number } | null>(null);

  // Editor field state (controlled)
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorCategory, setEditorCategory] = useState("");
  const [editorTags, setEditorTags] = useState("");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/notes?${params}`);
    if (res.ok) {
      const data: Note[] = await res.json();
      setNotes(data);
    }
  }, [search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  // ── Select note ──────────────────────────────────────────────────────────

  const selectNote = useCallback((note: Note) => {
    setSelectedId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorCategory(note.category ?? "");
    setEditorTags(note.tags ?? "");
    setLastSaved(new Date(note.updatedAt));
    setSaving(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // ── Auto-save ────────────────────────────────────────────────────────────

  const save = useCallback(
    async (id: string, title: string, content: string, category: string, tags: string) => {
      setSaving(true);
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, tags }),
      });
      if (res.ok) {
        const updated: Note = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        setLastSaved(new Date(updated.updatedAt));
      }
      setSaving(false);
    },
    []
  );

  const scheduleSave = useCallback(
    (title: string, content: string, category: string, tags: string) => {
      if (!selectedIdRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (selectedIdRef.current) {
          save(selectedIdRef.current, title, content, category, tags);
        }
      }, 1000);
    },
    [save]
  );

  const flushSave = useCallback(() => {
    if (!selectedIdRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      save(selectedIdRef.current, editorTitle, editorContent, editorCategory, editorTags);
    }
  }, [save, editorTitle, editorContent, editorCategory, editorTags]);

  // ── Create note ──────────────────────────────────────────────────────────

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New note", content: "" }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      selectNote(note);
    }
  };

  // ── Delete note ──────────────────────────────────────────────────────────

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setEditorTitle("");
      setEditorContent("");
      setEditorCategory("");
      setEditorTags("");
      setLastSaved(null);
    }
    setDeleteConfirm(null);
    setContextMenu(null);
  };

  // ── Toggle pin ───────────────────────────────────────────────────────────

  const togglePin = async (note: Note) => {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    if (res.ok) {
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
    setContextMenu(null);
  };

  // ── Filtered + grouped notes ─────────────────────────────────────────────

  const pinnedNotes = notes.filter((n) => n.pinned);
  const unpinnedNotes = notes.filter((n) => !n.pinned);
  const grouped = groupByCategory(unpinnedNotes);

  // All unique categories for datalist
  const allCategories = [...new Set(notes.map((n) => n.category).filter(Boolean) as string[])];

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderNoteItem = (note: Note) => {
    const isSelected = note.id === selectedId;
    const isHovered = note.id === hoveredId;
    const firstLine = note.content.split("\n")[0]?.slice(0, 80) ?? "";

    return (
      <div
        key={note.id}
        onClick={() => selectNote(note)}
        onMouseEnter={() => setHoveredId(note.id)}
        onMouseLeave={() => setHoveredId(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
        }}
        style={{
          position: "relative",
          padding: "10px 12px",
          cursor: "pointer",
          backgroundColor: isSelected ? C.accentDim : isHovered ? C.surface2 : "transparent",
          borderLeft: note.pinned ? `3px solid ${C.amber}` : "3px solid transparent",
          borderBottom: `1px solid ${C.border}`,
          transition: "background-color 0.1s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isSelected ? C.accent : C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {note.pinned && (
              <span style={{ color: C.amber, marginRight: 4, fontSize: 11 }}>📌</span>
            )}
            {note.title}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>
            {formatDate(note.updatedAt)}
          </span>
        </div>
        {firstLine && (
          <div
            style={{
              fontSize: 11,
              color: C.textDim,
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {firstLine}
          </div>
        )}

        {/* Hover action buttons */}
        {isHovered && (
          <div
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              gap: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => togglePin(note)}
              title={note.pinned ? "Unpin" : "Pin"}
              style={{
                fontSize: 12,
                padding: "2px 6px",
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                color: C.textDim,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {note.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => setDeleteConfirm(note.id)}
              title="Delete"
              style={{
                fontSize: 12,
                padding: "2px 6px",
                backgroundColor: C.surface,
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#ef4444",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Del
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "calc(100vh - 45px)", backgroundColor: C.bg, overflow: "hidden" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 240,
          flexShrink: 0,
          backgroundColor: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top: search + new */}
        <div style={{ padding: "12px 10px 8px", borderBottom: `1px solid ${C.border}` }}>
          <input
            type="text"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12,
              backgroundColor: C.bg,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              outline: "none",
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={createNote}
            style={{
              width: "100%",
              padding: "6px",
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: C.accentDim,
              color: C.accent,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Note
          </button>
        </div>

        {/* Note list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {notes.length === 0 && (
            <div style={{ padding: "20px 12px", color: C.textMuted, fontSize: 12, textAlign: "center" }}>
              No notes yet
            </div>
          )}

          {/* Pinned section */}
          {pinnedNotes.length > 0 && (
            <>
              <div
                style={{
                  padding: "6px 12px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: C.textMuted,
                  backgroundColor: C.surface,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                Pinned
              </div>
              {pinnedNotes.map(renderNoteItem)}
            </>
          )}

          {/* Grouped by category */}
          {[...grouped.entries()].map(([cat, catNotes]) => (
            <div key={cat}>
              <div
                style={{
                  padding: "6px 12px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: C.textMuted,
                  backgroundColor: C.surface,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  borderBottom: `1px solid ${C.border}`,
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                {cat}
              </div>
              {catNotes.map(renderNoteItem)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selectedNote ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: C.textMuted,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 36 }}>📓</span>
            <span style={{ fontSize: 14 }}>Select a note or create a new one</span>
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div
              style={{
                padding: "16px 24px 12px",
                borderBottom: `1px solid ${C.border}`,
                backgroundColor: C.surface,
              }}
            >
              {/* Title */}
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => {
                  setEditorTitle(e.target.value);
                  scheduleSave(e.target.value, editorContent, editorCategory, editorTags);
                }}
                onBlur={flushSave}
                placeholder="Note title"
                style={{
                  width: "100%",
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.text,
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  marginBottom: 10,
                }}
              />

              {/* Meta row: category, tags, save status, delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Category */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Category</span>
                  <input
                    type="text"
                    list="note-categories"
                    value={editorCategory}
                    onChange={(e) => {
                      setEditorCategory(e.target.value);
                      scheduleSave(editorTitle, editorContent, e.target.value, editorTags);
                    }}
                    onBlur={flushSave}
                    placeholder="e.g. Hurco"
                    style={{
                      fontSize: 12,
                      padding: "3px 7px",
                      backgroundColor: C.bg,
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      outline: "none",
                      width: 130,
                    }}
                  />
                  <datalist id="note-categories">
                    {allCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Tags</span>
                  <input
                    type="text"
                    value={editorTags}
                    onChange={(e) => {
                      setEditorTags(e.target.value);
                      scheduleSave(editorTitle, editorContent, editorCategory, e.target.value);
                    }}
                    onBlur={flushSave}
                    placeholder="comma separated"
                    style={{
                      fontSize: 12,
                      padding: "3px 7px",
                      backgroundColor: C.bg,
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      outline: "none",
                      width: 160,
                    }}
                  />
                </div>

                {/* Save status */}
                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: "auto" }}>
                  {saving
                    ? "Saving…"
                    : lastSaved
                    ? `Saved ${lastSaved.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirm(selectedNote.id)}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    backgroundColor: "transparent",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Content textarea */}
            <textarea
              value={editorContent}
              onChange={(e) => {
                setEditorContent(e.target.value);
                scheduleSave(editorTitle, e.target.value, editorCategory, editorTags);
              }}
              onBlur={flushSave}
              placeholder="Start writing…"
              style={{
                flex: 1,
                padding: "20px 24px",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "var(--font-jetbrains-mono)",
                color: C.text,
                backgroundColor: C.bg,
                border: "none",
                outline: "none",
                resize: "none",
                overflowY: "auto",
              }}
            />
          </>
        )}
      </div>

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {contextMenu && (() => {
        const ctxNote = notes.find((n) => n.id === contextMenu.noteId);
        if (!ctxNote) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              zIndex: 1000,
              minWidth: 130,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => togglePin(ctxNote)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 14px",
                fontSize: 13,
                color: C.text,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surface2)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {ctxNote.pinned ? "📌 Unpin" : "📌 Pin"}
            </button>
            <div style={{ height: 1, backgroundColor: C.border }} />
            <button
              onClick={() => { setDeleteConfirm(ctxNote.id); setContextMenu(null); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 14px",
                fontSize: 13,
                color: "#ef4444",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surface2)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              🗑 Delete
            </button>
          </div>
        );
      })()}

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "24px 28px",
              width: 340,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              Delete note?
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>
              &ldquo;{notes.find((n) => n.id === deleteConfirm)?.title}&rdquo; will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  fontSize: 13,
                  padding: "6px 14px",
                  backgroundColor: "transparent",
                  color: C.textDim,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNote(deleteConfirm)}
                style={{
                  fontSize: 13,
                  padding: "6px 14px",
                  backgroundColor: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 5,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
