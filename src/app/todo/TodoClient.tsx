"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

type TodoColumn = "MyTasks" | "Hurco" | "Danusys";

interface KanbanPart {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  sectionName: string | null;
  dueDate: string | null;
  operations: { id: string; name: string; order: number; type: string; status: string }[];
}

interface TodoItem {
  id: string;
  column: TodoColumn;
  text: string;
  subtext: string | null;
  done: boolean;
  doneAt: string | null;
  order: number;
  weekStart: string;
  linkedPartId: string | null;
  linkedOperationId: string | null;
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
  blue: "#3b82f6",
};

// ── Week helpers ───────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date`. */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function formatWeekLabel(monday: Date): string {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const weekNum = getWeekNumber(monday);
  const monStr = monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const friStr = friday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `Week ${weekNum} — ${monStr}–${friStr}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ── Column config ──────────────────────────────────────────────────────────

const COLUMNS: { key: TodoColumn; label: string; color: string; border: string }[] = [
  { key: "MyTasks", label: "My Tasks", color: C.textDim, border: C.border },
  { key: "Hurco",   label: "Hurco Queue", color: C.accent, border: C.accentBorder },
  { key: "Danusys", label: "Danusys Queue", color: "#60a5fa", border: "rgba(96,165,250,0.4)" },
];

const MY_TASKS_SUBTEXTS = [
  "Design / CAD",
  "CAM Programming",
  "Material Orders",
  "Laser / Water Jet",
  "Gundrilling",
  "Assembly",
  "Other",
];

// ── Sortable item ──────────────────────────────────────────────────────────

function SortableItem({
  item,
  col,
  isFirst,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: TodoItem;
  col: typeof COLUMNS[number];
  isFirst: boolean;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string, subtext: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editSubtext, setEditSubtext] = useState(item.subtext ?? "");
  const textRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitEdit = () => {
    if (editText.trim()) {
      onEdit(item.id, editText.trim(), editSubtext.trim());
    } else {
      setEditText(item.text);
      setEditSubtext(item.subtext ?? "");
    }
    setEditing(false);
  };

  const isQueue = col.key !== "MyTasks";
  const showNext = isQueue && isFirst && !item.done;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg px-3 py-2.5 flex items-start gap-2.5 group"
      {...attributes}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-70 cursor-grab active:cursor-grabbing touch-none"
        style={{ color: C.textMuted, fontSize: 12, lineHeight: 1, padding: "2px 0" }}
        tabIndex={-1}
      >
        ⠿
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.done)}
        className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center"
        style={{
          borderColor: item.done ? C.green : C.border,
          backgroundColor: item.done ? "rgba(34,197,94,0.15)" : "transparent",
        }}
      >
        {item.done && (
          <span style={{ color: C.green, fontSize: 10, lineHeight: 1 }}>✓</span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1">
            <input
              ref={textRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditText(item.text);
                  setEditSubtext(item.subtext ?? "");
                  setEditing(false);
                }
              }}
              onBlur={commitEdit}
              autoFocus
              className="w-full text-sm rounded px-2 py-1 outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.accentBorder}` }}
            />
            {col.key === "MyTasks" ? (
              <select
                value={editSubtext}
                onChange={(e) => setEditSubtext(e.target.value)}
                className="w-full text-xs rounded px-2 py-1 outline-none"
                style={{ backgroundColor: C.bg, color: C.textDim, border: `1px solid ${C.border}` }}
              >
                <option value="">— category —</option>
                {MY_TASKS_SUBTEXTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                value={editSubtext}
                onChange={(e) => setEditSubtext(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }}
                onBlur={commitEdit}
                placeholder="subtext (e.g. est. 4h)"
                className="w-full text-xs rounded px-2 py-1 outline-none"
                style={{ backgroundColor: C.bg, color: C.textDim, border: `1px solid ${C.border}` }}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {showNext && (
                <span
                  className="text-xs px-1.5 py-0 rounded flex-shrink-0 font-bold"
                  style={{ backgroundColor: col.border, color: col.color, fontSize: 9 }}
                >
                  NEXT
                </span>
              )}
              <span
                onClick={() => setEditing(true)}
                className="text-sm cursor-text leading-snug"
                style={{
                  color: item.done ? C.textMuted : C.text,
                  textDecoration: item.done ? "line-through" : "none",
                }}
              >
                {item.text}
              </span>
            </div>
            {item.subtext && (
              <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                {item.subtext}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-80"
        style={{ color: C.red, fontSize: 14, lineHeight: 1 }}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

// ── Add Item Form ──────────────────────────────────────────────────────────

function AddItemForm({
  col,
  weekStart,
  onAdd,
  parts,
}: {
  col: typeof COLUMNS[number];
  weekStart: string;
  onAdd: (item: TodoItem) => void;
  parts: KanbanPart[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [subtext, setSubtext] = useState("");
  const [linkedPartId, setLinkedPartId] = useState<string | null>(null);
  const [linkedOperationId, setLinkedOperationId] = useState<string | null>(null);
  const [partSearch, setPartSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const filteredParts = useMemo(() => {
    const q = partSearch.toLowerCase().trim();
    const list = q
      ? parts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.toolName.toLowerCase().includes(q)
        )
      : parts;
    return list.slice(0, 24);
  }, [parts, partSearch]);

  const getActiveOp = (p: KanbanPart) =>
    p.operations.find((op) => op.status === "InProgress") ??
    p.operations.find((op) => !["Done", "Received"].includes(op.status)) ??
    null;

  const selectPart = (p: KanbanPart) => {
    const op = getActiveOp(p);
    setText(`${p.toolName} — ${p.name}`);
    setSubtext(op?.name ?? "");
    setLinkedPartId(p.id);
    setLinkedOperationId(op?.id ?? null);
    setPartSearch(p.name);
    setPickerOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const clearLinked = () => {
    setLinkedPartId(null);
    setLinkedOperationId(null);
    setPartSearch("");
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const res = await fetch("/api/todo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column: col.key,
        text: text.trim(),
        subtext: subtext.trim() || null,
        weekStart,
        order: 999,
        linkedPartId: linkedPartId ?? undefined,
        linkedOperationId: linkedOperationId ?? undefined,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      onAdd(item);
      setText("");
      setSubtext("");
      setLinkedPartId(null);
      setLinkedOperationId(null);
      setPartSearch("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-xs px-3 py-2 rounded-lg opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: col.color, border: `1px dashed ${col.border}` }}
      >
        + Add {col.key === "MyTasks" ? "task" : "to queue"}
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ border: `1px solid ${col.border}`, backgroundColor: C.surface2 }}
    >
      {/* Part picker */}
      <div ref={pickerRef} style={{ position: "relative" }}>
        <div style={{ position: "relative" }}>
          <input
            value={partSearch}
            onChange={(e) => {
              setPartSearch(e.target.value);
              setPickerOpen(true);
              // clear link if user is re-typing
              if (linkedPartId) clearLinked();
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Search part… (optional)"
            className="w-full text-xs rounded px-2 py-1 outline-none"
            style={{
              backgroundColor: C.bg,
              color: linkedPartId ? C.accent : C.textDim,
              border: `1px solid ${linkedPartId ? C.accentBorder : C.border}`,
              paddingRight: linkedPartId ? 22 : undefined,
            }}
          />
          {linkedPartId && (
            <button
              onClick={clearLinked}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.textMuted,
                fontSize: 11,
                lineHeight: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              tabIndex={-1}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>

        {pickerOpen && filteredParts.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 2px)",
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              maxHeight: 200,
              overflowY: "auto",
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
            }}
          >
            {filteredParts.map((p) => {
              const op = getActiveOp(p);
              return (
                <div
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus
                    selectPart(p);
                  }}
                  style={{
                    padding: "6px 10px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                  className="hover:bg-[#1a1d20]"
                >
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>
                    {p.toolName}
                    {op ? <span style={{ color: C.textDim }}> · {op.name}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task text */}
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={col.key === "MyTasks" ? "Task description…" : "Part ID — Operation name"}
        className="w-full text-sm rounded px-2 py-1.5 outline-none"
        style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
      />

      {/* Subtext / category */}
      {col.key === "MyTasks" ? (
        <select
          value={subtext}
          onChange={(e) => setSubtext(e.target.value)}
          className="w-full text-xs rounded px-2 py-1 outline-none"
          style={{ backgroundColor: C.bg, color: C.textDim, border: `1px solid ${C.border}` }}
        >
          <option value="">— category (optional) —</option>
          {MY_TASKS_SUBTEXTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ) : (
        <input
          value={subtext}
          onChange={(e) => setSubtext(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="est. 4h"
          className="w-full text-xs rounded px-2 py-1 outline-none"
          style={{ backgroundColor: C.bg, color: C.textDim, border: `1px solid ${C.border}` }}
        />
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-3 py-1 rounded"
          style={{ color: C.textDim, border: `1px solid ${C.border}` }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="text-xs px-3 py-1 rounded font-medium"
          style={{
            backgroundColor: col.color === C.textDim ? C.surface2 : col.color,
            color: col.color === C.textDim ? C.text : "#000",
            border: `1px solid ${col.border}`,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Column component ───────────────────────────────────────────────────────

function TodoColumn({
  col,
  items,
  weekStart,
  onAdd,
  onToggle,
  onDelete,
  onEdit,
  onReorder,
  parts,
}: {
  col: typeof COLUMNS[number];
  items: TodoItem[];
  weekStart: string;
  onAdd: (item: TodoItem) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string, subtext: string) => void;
  onReorder: (col: TodoColumn, newOrder: TodoItem[]) => void;
  parts: KanbanPart[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const colItems = items.filter((i) => i.column === col.key);
  const done = colItems.filter((i) => i.done).length;
  const total = colItems.length;

  // Danusys 5-tool warning
  const showToolWarning = col.key === "Danusys" &&
    colItems.some((i) => {
      if (!i.subtext) return false;
      // subtext like "T01, T02, T03, T04, T05, T06" — count commas + 1
      const toolCount = (i.subtext.match(/,/g) ?? []).length + 1;
      return toolCount > 5;
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = colItems.findIndex((i) => i.id === active.id);
    const newIdx = colItems.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(colItems, oldIdx, newIdx);
    onReorder(col.key, reordered);
  };

  const firstIncompleteIdx = colItems.findIndex((i) => !i.done);

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ border: `1px solid ${C.border}`, backgroundColor: C.surface, minWidth: 0 }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, borderTop: `3px solid ${col.color}` }}
      >
        <span className="text-sm font-semibold" style={{ color: col.color }}>
          {col.label}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full tabular-nums"
          style={{ backgroundColor: C.surface2, color: C.textMuted, border: `1px solid ${C.border}` }}
        >
          {done}/{total}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={colItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {colItems.length === 0 ? (
              <p className="text-xs px-3 py-4 text-center" style={{ color: C.textMuted }}>
                Empty
              </p>
            ) : (
              colItems.map((item, idx) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  col={col}
                  isFirst={idx === firstIncompleteIdx}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>

      {/* Danusys warning */}
      {showToolWarning && (
        <div
          className="px-3 py-2 text-xs font-medium text-center flex-shrink-0"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5", borderTop: `1px solid rgba(239,68,68,0.3)` }}
        >
          ⚠ DANUSYS — 5 TOOL LIMIT — check ATC setup
        </div>
      )}

      {/* Add form */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
        <AddItemForm col={col} weekStart={weekStart} onAdd={onAdd} parts={parts} />
      </div>
    </div>
  );
}

// ── Main client ────────────────────────────────────────────────────────────

export function TodoClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<KanbanPart[]>([]);
  const carriedOver = useRef(false);

  // Fetch parts once on mount for the picker
  useEffect(() => {
    fetch("/api/kanban-parts")
      .then((r) => r.json())
      .then((data: KanbanPart[]) => setParts(data))
      .catch(() => {});
  }, []);

  const weekStartISO = toISO(weekStart);

  // Carryover check on mount (current week only)
  useEffect(() => {
    if (carriedOver.current) return;
    carriedOver.current = true;

    const today = getMondayOf(new Date());
    if (toISO(weekStart) !== toISO(today)) return;

    const prevWeek = addWeeks(weekStart, -1);
    fetch("/api/todo/carryover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prevWeekStart: toISO(prevWeek),
        currentWeekStart: weekStartISO,
      }),
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch items for current week
  useEffect(() => {
    setLoading(true);
    fetch(`/api/todo?weekStart=${weekStartISO}`)
      .then((r) => r.json())
      .then((data: TodoItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [weekStartISO]);

  const handleAdd = useCallback((item: TodoItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const handleToggle = useCallback(async (id: string, done: boolean) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, done, doneAt: done ? new Date().toISOString() : null } : i));
    await fetch(`/api/todo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/todo/${id}`, { method: "DELETE" });
  }, []);

  const handleEdit = useCallback(async (id: string, text: string, subtext: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, text, subtext: subtext || null } : i));
    await fetch(`/api/todo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, subtext: subtext || null }),
    });
  }, []);

  const handleReorder = useCallback(async (col: TodoColumn, reordered: TodoItem[]) => {
    // Assign new order values
    const updated = reordered.map((item, idx) => ({ ...item, order: idx }));
    setItems((prev) => {
      const other = prev.filter((i) => i.column !== col);
      return [...other, ...updated];
    });
    // Persist all order changes
    await Promise.all(
      updated.map((item) =>
        fetch(`/api/todo/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: item.order }),
        })
      )
    );
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: C.bg, color: C.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold" style={{ color: C.accent }}>
            To-Do
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              className="text-xs px-2 py-1 rounded hover:opacity-70"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}
            >
              ‹ Prev
            </button>
            <span
              className="text-sm font-medium tabular-nums"
              style={{ color: C.text, minWidth: 200, textAlign: "center" }}
            >
              {formatWeekLabel(weekStart)}
            </span>
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="text-xs px-2 py-1 rounded hover:opacity-70"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}
            >
              Next ›
            </button>
          </div>
          <button
            onClick={() => setWeekStart(getMondayOf(new Date()))}
            className="text-xs px-2.5 py-1 rounded"
            style={{ color: C.textMuted, border: `1px solid ${C.border}` }}
          >
            Today
          </button>
        </div>

        {loading && (
          <span className="text-xs" style={{ color: C.textMuted }}>Loading…</span>
        )}
      </div>

      {/* Three columns */}
      <div className="flex-1 overflow-hidden p-4 grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <TodoColumn
            key={col.key}
            col={col}
            items={items}
            weekStart={weekStartISO}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReorder={handleReorder}
            parts={parts}
          />
        ))}
      </div>
    </div>
  );
}
