"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReferenceEntry {
  id: string;
  categoryId: string;
  label: string;
  value: string;
  unit: string | null;
  notes: string | null;
  order: number;
}

interface ReferenceCategory {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  entries: ReferenceEntry[];
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
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  redBorder: "rgba(239,68,68,0.35)",
};

// ── Sortable category item ─────────────────────────────────────────────────

function SortableCategoryItem({
  cat,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  cat: ReferenceCategory;
  selected: boolean;
  onSelect: () => void;
  onEdit: (cat: ReferenceCategory) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: "flex",
        alignItems: "center",
        padding: "8px 10px",
        gap: 8,
        cursor: "pointer",
        borderRadius: 6,
        backgroundColor: selected ? C.accentDim : hovered ? C.surface2 : "transparent",
        border: selected ? `1px solid ${C.accentBorder}` : "1px solid transparent",
        marginBottom: 2,
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ color: C.textMuted, fontSize: 12, cursor: "grab", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>

      <span style={{ fontSize: 15, flexShrink: 0 }}>{cat.icon ?? "📂"}</span>
      <span
        style={{
          fontSize: 13,
          color: selected ? C.accent : C.text,
          fontWeight: selected ? 600 : 400,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {cat.name}
      </span>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{ display: "flex", gap: 4, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(cat)}
            style={iconBtn}
            title="Edit category"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(cat.id)}
            style={{ ...iconBtn, color: C.red }}
            title="Delete category"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  fontSize: 13,
  padding: "2px 5px",
  backgroundColor: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  color: C.textDim,
  cursor: "pointer",
  lineHeight: 1,
};

// ── Sortable entry row ─────────────────────────────────────────────────────

function SortableEntryRow({
  entry,
  editMode,
  onSave,
  onDelete,
}: {
  entry: ReferenceEntry;
  editMode: boolean;
  onSave: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {editMode && (
        <td style={{ ...td, width: 24, paddingLeft: 8 }}>
          <span
            {...attributes}
            {...listeners}
            style={{ color: C.textMuted, cursor: "grab", fontSize: 13 }}
          >
            ⠿
          </span>
        </td>
      )}
      <td style={td}>
        {editMode ? (
          <EditableCell value={entry.label} onSave={(v) => onSave(entry.id, "label", v)} />
        ) : (
          <span style={{ color: C.text, fontSize: 13 }}>{entry.label}</span>
        )}
      </td>
      <td style={td}>
        {editMode ? (
          <EditableCell value={entry.value} onSave={(v) => onSave(entry.id, "value", v)} />
        ) : (
          <span style={{ color: C.accent, fontSize: 13, fontFamily: "var(--font-jetbrains-mono)" }}>
            {entry.value}
          </span>
        )}
      </td>
      <td style={{ ...td, width: 80 }}>
        {editMode ? (
          <EditableCell value={entry.unit ?? ""} onSave={(v) => onSave(entry.id, "unit", v)} placeholder="unit" />
        ) : (
          <span style={{ color: C.textDim, fontSize: 12 }}>{entry.unit ?? ""}</span>
        )}
      </td>
      <td style={td}>
        {editMode ? (
          <EditableCell value={entry.notes ?? ""} onSave={(v) => onSave(entry.id, "notes", v)} placeholder="notes" />
        ) : (
          <span style={{ color: C.textDim, fontSize: 12 }}>{entry.notes ?? ""}</span>
        )}
      </td>
      {editMode && (
        <td style={{ ...td, width: 36, textAlign: "right" }}>
          <button
            onClick={() => onDelete(entry.id)}
            style={{
              fontSize: 11,
              padding: "2px 6px",
              backgroundColor: C.redDim,
              border: `1px solid ${C.redBorder}`,
              color: C.red,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Del
          </button>
        </td>
      )}
    </tr>
  );
}

const td: React.CSSProperties = {
  padding: "8px 12px",
  verticalAlign: "middle",
};

// ── Editable cell ──────────────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onSave(local);
      }}
      style={{
        width: "100%",
        padding: "4px 6px",
        fontSize: 13,
        backgroundColor: C.bg,
        color: C.text,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        outline: "none",
        minWidth: 60,
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ReferenceClient() {
  const [categories, setCategories] = useState<ReferenceCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "entry"; id: string } | null>(null);

  // New category inline form
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");

  // Edit category inline
  const [editingCat, setEditingCat] = useState<ReferenceCategory | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  // New entry form
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ label: "", value: "", unit: "", notes: "" });

  const newCatInputRef = useRef<HTMLInputElement>(null);
  const newEntryLabelRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/reference");
    if (res.ok) {
      const data: ReferenceCategory[] = await res.json();
      setCategories(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    }
  }, [selectedId]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (addingCategory && newCatInputRef.current) newCatInputRef.current.focus();
  }, [addingCategory]);

  useEffect(() => {
    if (addingEntry && newEntryLabelRef.current) newEntryLabelRef.current.focus();
  }, [addingEntry]);

  // ── Category CRUD ────────────────────────────────────────────────────────

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch("/api/reference/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), icon: newCatIcon.trim() || null }),
    });
    if (res.ok) {
      const cat: ReferenceCategory = await res.json();
      setCategories((prev) => [...prev, cat]);
      setSelectedId(cat.id);
      setNewCatName("");
      setNewCatIcon("");
      setAddingCategory(false);
    }
  };

  const saveEditCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    const res = await fetch(`/api/reference/categories/${editingCat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName.trim(), icon: editCatIcon.trim() || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setEditingCat(null);
    }
  };

  const deleteCategory = async (id: string) => {
    await fetch(`/api/reference/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(categories.find((c) => c.id !== id)?.id ?? null);
    setDeleteConfirm(null);
  };

  const reorderCategories = async (newOrder: ReferenceCategory[]) => {
    setCategories(newOrder);
    await Promise.all(
      newOrder.map((c, i) =>
        fetch(`/api/reference/categories/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: i }),
        })
      )
    );
  };

  const handleCatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    reorderCategories(arrayMove(categories, oldIndex, newIndex));
  };

  // ── Entry CRUD ───────────────────────────────────────────────────────────

  const createEntry = async () => {
    if (!selectedId || !newEntry.label.trim() || !newEntry.value.trim()) return;
    const res = await fetch("/api/reference/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedId,
        label: newEntry.label.trim(),
        value: newEntry.value.trim(),
        unit: newEntry.unit.trim() || null,
        notes: newEntry.notes.trim() || null,
      }),
    });
    if (res.ok) {
      const entry: ReferenceEntry = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, entries: [...c.entries, entry] } : c
        )
      );
      setNewEntry({ label: "", value: "", unit: "", notes: "" });
      setAddingEntry(false);
    }
  };

  const saveEntry = async (id: string, field: string, value: string) => {
    const res = await fetch(`/api/reference/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          entries: c.entries.map((e) => (e.id === updated.id ? updated : e)),
        }))
      );
    }
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/reference/entries/${id}`, { method: "DELETE" });
    setCategories((prev) =>
      prev.map((c) => ({ ...c, entries: c.entries.filter((e) => e.id !== id) }))
    );
    setDeleteConfirm(null);
  };

  const reorderEntries = async (catId: string, newOrder: ReferenceEntry[]) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, entries: newOrder } : c))
    );
    await Promise.all(
      newOrder.map((e, i) =>
        fetch(`/api/reference/entries/${e.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: i }),
        })
      )
    );
  };

  const handleEntryDragEnd = (event: DragEndEvent) => {
    if (!selectedCat) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const entries = selectedCat.entries;
    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    reorderEntries(selectedCat.id, arrayMove(entries, oldIndex, newIndex));
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedCat = categories.find((c) => c.id === selectedId) ?? null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "calc(100vh - 45px)", backgroundColor: C.bg, overflow: "hidden" }}>

      {/* ── Left sidebar ────────────────────────────────────────────────── */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          backgroundColor: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 14px 10px",
            borderBottom: `1px solid ${C.border}`,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: C.textMuted,
          }}
        >
          Categories
        </div>

        {/* Category list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 0" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map((cat) =>
                editingCat?.id === cat.id ? (
                  // Inline edit form
                  <div key={cat.id} style={{ padding: "6px 8px", marginBottom: 2 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <input
                        value={editCatIcon}
                        onChange={(e) => setEditCatIcon(e.target.value)}
                        placeholder="🔧"
                        style={{ ...sidebarInput, width: 40 }}
                      />
                      <input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditCategory(); if (e.key === "Escape") setEditingCat(null); }}
                        style={{ ...sidebarInput, flex: 1 }}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEditCategory} style={smallBtn}>Save</button>
                      <button onClick={() => setEditingCat(null)} style={smallBtnGhost}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <SortableCategoryItem
                    key={cat.id}
                    cat={cat}
                    selected={cat.id === selectedId}
                    onSelect={() => { setSelectedId(cat.id); setEditMode(false); setAddingEntry(false); }}
                    onEdit={(c) => { setEditingCat(c); setEditCatName(c.name); setEditCatIcon(c.icon ?? ""); }}
                    onDelete={(id) => setDeleteConfirm({ type: "category", id })}
                  />
                )
              )}
            </SortableContext>
          </DndContext>

          {categories.length === 0 && !addingCategory && (
            <div style={{ padding: "16px 8px", color: C.textMuted, fontSize: 12, textAlign: "center" }}>
              No categories yet
            </div>
          )}

          {/* Inline new category form */}
          {addingCategory && (
            <div style={{ padding: "6px 4px", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  placeholder="🔧"
                  style={{ ...sidebarInput, width: 40 }}
                />
                <input
                  ref={newCatInputRef}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  onKeyDown={(e) => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") setAddingCategory(false); }}
                  style={{ ...sidebarInput, flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={createCategory} style={smallBtn}>Add</button>
                <button onClick={() => { setAddingCategory(false); setNewCatName(""); setNewCatIcon(""); }} style={smallBtnGhost}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Add category button */}
        {!addingCategory && (
          <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => setAddingCategory(true)}
              style={{
                width: "100%",
                padding: "7px",
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
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add Category
            </button>
          </div>
        )}
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selectedCat ? (
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
            <span style={{ fontSize: 36 }}>📐</span>
            <span style={{ fontSize: 14 }}>Select a category or create a new one</span>
          </div>
        ) : (
          <>
            {/* Category header */}
            <div
              style={{
                padding: "14px 24px 12px",
                borderBottom: `1px solid ${C.border}`,
                backgroundColor: C.surface,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>{selectedCat.icon ?? "📂"}</span>
              <span style={{ fontSize: 17, fontWeight: 600, color: C.text, flex: 1 }}>
                {selectedCat.name}
              </span>
              <span style={{ fontSize: 11, color: C.textMuted, marginRight: 8 }}>
                {selectedCat.entries.length} {selectedCat.entries.length === 1 ? "entry" : "entries"}
              </span>
              <button
                onClick={() => { setEditMode((v) => !v); setAddingEntry(false); }}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  backgroundColor: editMode ? C.accentDim : "transparent",
                  color: editMode ? C.accent : C.textDim,
                  border: `1px solid ${editMode ? C.accentBorder : C.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: editMode ? 600 : 400,
                }}
              >
                {editMode ? "✓ Done" : "✎ Edit"}
              </button>
              <button
                onClick={() => { setAddingEntry(true); setEditMode(true); }}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  backgroundColor: C.accentDim,
                  color: C.accent,
                  border: `1px solid ${C.accentBorder}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + Add Entry
              </button>
            </div>

            {/* Entries table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {editMode && <th style={th}></th>}
                    <th style={th}>Label</th>
                    <th style={th}>Value</th>
                    <th style={{ ...th, width: 80 }}>Unit</th>
                    <th style={th}>Notes</th>
                    {editMode && <th style={{ ...th, width: 36 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleEntryDragEnd}
                  >
                    <SortableContext
                      items={selectedCat.entries.map((e) => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectedCat.entries.map((entry) => (
                        <SortableEntryRow
                          key={entry.id}
                          entry={entry}
                          editMode={editMode}
                          onSave={saveEntry}
                          onDelete={(id) => setDeleteConfirm({ type: "entry", id })}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* New entry row */}
                  {addingEntry && (
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {editMode && <td style={td} />}
                      <td style={td}>
                        <input
                          ref={newEntryLabelRef}
                          value={newEntry.label}
                          onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })}
                          placeholder="Label"
                          onKeyDown={(e) => { if (e.key === "Enter") createEntry(); if (e.key === "Escape") setAddingEntry(false); }}
                          style={newEntryInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          value={newEntry.value}
                          onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                          placeholder="Value"
                          onKeyDown={(e) => { if (e.key === "Enter") createEntry(); if (e.key === "Escape") setAddingEntry(false); }}
                          style={newEntryInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          value={newEntry.unit}
                          onChange={(e) => setNewEntry({ ...newEntry, unit: e.target.value })}
                          placeholder="unit"
                          onKeyDown={(e) => { if (e.key === "Enter") createEntry(); if (e.key === "Escape") setAddingEntry(false); }}
                          style={newEntryInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          value={newEntry.notes}
                          onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                          placeholder="notes"
                          onKeyDown={(e) => { if (e.key === "Enter") createEntry(); if (e.key === "Escape") setAddingEntry(false); }}
                          style={newEntryInput}
                        />
                      </td>
                      <td style={{ ...td, display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={createEntry} style={smallBtn}>Add</button>
                        <button onClick={() => setAddingEntry(false)} style={smallBtnGhost}>✕</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {selectedCat.entries.length === 0 && !addingEntry && (
                <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, marginTop: 40 }}>
                  No entries yet — click{" "}
                  <span
                    style={{ color: C.accent, cursor: "pointer" }}
                    onClick={() => { setAddingEntry(true); setEditMode(true); }}
                  >
                    + Add Entry
                  </span>{" "}
                  to start
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
              {deleteConfirm.type === "category" ? "Delete category?" : "Delete entry?"}
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>
              {deleteConfirm.type === "category"
                ? "All entries in this category will also be deleted."
                : "This entry will be permanently removed."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={smallBtnGhost}>
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteConfirm.type === "category"
                    ? deleteCategory(deleteConfirm.id)
                    : deleteEntry(deleteConfirm.id)
                }
                style={{
                  fontSize: 13,
                  padding: "6px 14px",
                  backgroundColor: C.redDim,
                  color: C.red,
                  border: `1px solid ${C.redBorder}`,
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

// ── Shared styles ──────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#4e5560",
};

const sidebarInput: React.CSSProperties = {
  padding: "5px 7px",
  fontSize: 12,
  backgroundColor: "#0d0f10",
  color: "#e2e4e6",
  border: "1px solid #2a2d30",
  borderRadius: 4,
  outline: "none",
};

const smallBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 10px",
  backgroundColor: "rgba(232,160,32,0.12)",
  color: "#e8a020",
  border: "1px solid rgba(232,160,32,0.3)",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
};

const smallBtnGhost: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 10px",
  backgroundColor: "transparent",
  color: "#8b9196",
  border: "1px solid #2a2d30",
  borderRadius: 4,
  cursor: "pointer",
};

const newEntryInput: React.CSSProperties = {
  width: "100%",
  padding: "5px 7px",
  fontSize: 13,
  backgroundColor: "#0d0f10",
  color: "#e2e4e6",
  border: "1px solid #2a2d30",
  borderRadius: 4,
  outline: "none",
};
