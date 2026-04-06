"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ─────────────────────────────────────────────────────────────────

interface PartOp {
  id: string;
  name: string;
  order: number;
  type: string;
  status: string;
}

export interface KanbanPart {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  sectionName: string | null;
  dueDate: string | null;
  operations: PartOp[];
}

type KanbanColId =
  | "MaterialOrder"
  | "Programming"
  | "Milling"
  | "Outsourcing"
  | "Inspection"
  | "Done";

const SECTION_CODES = ["MLD", "PLG", "CUT", "AVL", "PBX"] as const;
type SectionCode = (typeof SECTION_CODES)[number];

// ── Theme ─────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

const SECTION_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  MLD: { bg: "rgba(59,130,246,0.15)",  text: "#93c5fd", border: "rgba(59,130,246,0.35)"  },
  PLG: { bg: "rgba(168,85,247,0.15)",  text: "#c4b5fd", border: "rgba(168,85,247,0.35)"  },
  CUT: { bg: "rgba(239,68,68,0.15)",   text: "#fca5a5", border: "rgba(239,68,68,0.35)"   },
  AVL: { bg: "rgba(139,92,246,0.15)",  text: "#ddd6fe", border: "rgba(139,92,246,0.35)"  },
  PBX: { bg: "rgba(34,197,94,0.15)",   text: "#86efac", border: "rgba(34,197,94,0.35)"   },
};

const KANBAN_COLS: {
  id: KanbanColId;
  label: string;
  color: string;
  border: string;
  bg: string;
}[] = [
  { id: "MaterialOrder", label: "Material Order", color: "#a78bfa", border: "rgba(167,139,250,0.35)", bg: "rgba(167,139,250,0.08)" },
  { id: "Programming",   label: "Programming",   color: "#93c5fd", border: "rgba(147,197,253,0.35)", bg: "rgba(59,130,246,0.08)"  },
  { id: "Milling",       label: "Milling",       color: "#fcd34d", border: "rgba(252,211,77,0.35)",  bg: "rgba(245,158,11,0.08)"  },
  { id: "Outsourcing",   label: "Outsourcing",   color: "#fdba74", border: "rgba(253,186,116,0.35)", bg: "rgba(249,115,22,0.08)"  },
  { id: "Inspection",    label: "Inspection",    color: "#86efac", border: "rgba(134,239,172,0.35)", bg: "rgba(34,197,94,0.08)"   },
  { id: "Done",          label: "Done",          color: "#22c55e", border: "rgba(34,197,94,0.35)",   bg: "rgba(34,197,94,0.06)"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function toSectionCode(name: string): string {
  const n = name.trim().toUpperCase();
  const MAP: Record<string, string> = {
    MLD: "MLD", MOULDING: "MLD", MOULD: "MLD",
    PLG: "PLG", "PLUG ASSIST": "PLG", PLUG: "PLG",
    CUT: "CUT", CUTTING: "CUT", CUTTER: "CUT",
    AVL: "AVL", ANVIL: "AVL",
    PBX: "PBX", "PRESSURE BOX": "PBX", PNP: "PBX", PUSHER: "PBX",
  };
  return MAP[n] ?? n.slice(0, 3);
}

function opMatchesColumn(op: PartOp, colId: KanbanColId): boolean {
  const name = op.name.toLowerCase();
  switch (colId) {
    case "MaterialOrder": return op.type === "procurement";
    case "Programming":   return op.type === "internal" && (name.includes("cam") || name.includes("program"));
    case "Milling":       return op.type === "internal" && !name.includes("cam") && !name.includes("program");
    case "Outsourcing":   return op.type === "outsource";
    case "Inspection":    return op.type === "inspection" || op.type === "assembly";
    case "Done":          return false;
  }
}

function getActiveOp(part: KanbanPart): PartOp | null {
  return (
    part.operations.find((op) => op.status === "InProgress") ??
    part.operations.find((op) => !["Done", "Received"].includes(op.status)) ??
    null
  );
}

function opToColumn(op: PartOp): KanbanColId {
  const name = op.name.toLowerCase();
  if (op.type === "procurement") return "MaterialOrder";
  if (op.type === "outsource") return "Outsourcing";
  if (op.type === "inspection" || op.type === "assembly") return "Inspection";
  if (op.type === "internal") {
    if (name.includes("cam") || name.includes("program")) return "Programming";
    return "Milling";
  }
  return "Milling";
}

function getPartColumnId(part: KanbanPart): KanbanColId {
  const activeOp = getActiveOp(part);
  if (!activeOp) return "Done";
  return opToColumn(activeOp);
}

function getPartProgress(part: KanbanPart): number {
  const total = part.operations.length;
  if (total === 0) return 0;
  const done = part.operations.filter((op) =>
    ["Done", "Received"].includes(op.status)
  ).length;
  return Math.round((done / total) * 100);
}

function getDoneStatus(op: PartOp): string {
  return op.type === "procurement" ? "Received" : "Done";
}

function getEntryStatus(op: PartOp): string {
  if (op.type === "procurement") return "NotOrdered";
  if (op.type === "outsource") return "Pending";
  return "InProgress";
}

// ── Part Card ─────────────────────────────────────────────────────────────

function PartCard({
  part,
  isDragging,
}: {
  part: KanbanPart;
  isDragging?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, active } =
    useSortable({ id: part.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: active?.id === part.id && !isDragging ? 0.3 : 1,
  };

  const activeOp = getActiveOp(part);
  const progress = getPartProgress(part);
  const sectionCode = part.sectionName ? toSectionCode(part.sectionName) : null;
  const sectionStyle = sectionCode ? (SECTION_STYLE[sectionCode] ?? null) : null;
  const isOverdue =
    part.dueDate && !isDragging
      ? new Date(part.dueDate) < new Date()
      : false;

  const pips = part.operations.slice(0, 8);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.5)" : "none",
        cursor: isDragging ? "grabbing" : "default",
        position: "relative",
      }}
      className="group"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          padding: "5px 10px 2px",
          cursor: "grab",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{ width: 20, height: 3, backgroundColor: C.border, borderRadius: 2 }}
        />
      </div>

      {/* Clickable content */}
      <div
        style={{ padding: "2px 10px 8px", cursor: "pointer" }}
        onClick={() => router.push(`/tools/${part.toolId}/parts/${part.id}`)}
      >
        {/* Part name */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.accent,
            fontFamily: "var(--font-jetbrains-mono)",
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {part.name}
        </div>

        {/* Tool name + section badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: C.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {part.toolName}
          </span>
          {sectionStyle && (
            <span
              style={{
                fontSize: 9,
                padding: "0 4px",
                borderRadius: 3,
                lineHeight: "14px",
                backgroundColor: sectionStyle.bg,
                color: sectionStyle.text,
                border: `1px solid ${sectionStyle.border}`,
                fontFamily: "var(--font-jetbrains-mono)",
                flexShrink: 0,
              }}
            >
              {sectionCode}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 2,
            backgroundColor: C.border,
            borderRadius: 1,
            marginBottom: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#22c55e" : C.accent,
              borderRadius: 1,
            }}
          />
        </div>

        {/* Current op + deadline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          {activeOp ? (
            <span
              style={{
                fontSize: 10,
                color: C.textDim,
                fontFamily: "var(--font-jetbrains-mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeOp.name}
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                color: "#22c55e",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              DONE
            </span>
          )}
          {part.dueDate && (
            <span
              style={{
                fontSize: 9,
                color: isOverdue ? "#ef4444" : C.textMuted,
                flexShrink: 0,
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              {new Date(part.dueDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>

        {/* Progress pips */}
        {pips.length > 0 && (
          <div
            style={{ display: "flex", gap: 2, marginTop: 5, alignItems: "center" }}
          >
            {pips.map((op) => (
              <div
                key={op.id}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  flexShrink: 0,
                  backgroundColor: ["Done", "Received"].includes(op.status)
                    ? "#22c55e"
                    : op.status === "InProgress"
                    ? C.accent
                    : op.status === "Blocked"
                    ? "#ef4444"
                    : C.border,
                }}
              />
            ))}
            {part.operations.length > 8 && (
              <span style={{ fontSize: 8, color: C.textMuted, lineHeight: "6px" }}>
                +{part.operations.length - 8}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────

function KanbanCol({
  col,
  parts,
  collapsed,
  onToggleCollapse,
}: {
  col: (typeof KANBAN_COLS)[number];
  parts: KanbanPart[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  if (collapsed) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 40,
          flexShrink: 0,
          borderRadius: 6,
          backgroundColor: col.bg,
          border: `1px solid ${col.border}`,
          cursor: "pointer",
          padding: "8px 0",
          gap: 8,
          userSelect: "none",
        }}
        onClick={onToggleCollapse}
        title={`Expand ${col.label}`}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: col.color,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            letterSpacing: "0.06em",
          }}
        >
          {col.label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: col.color,
            opacity: 0.7,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {parts.length}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 200,
        width: 200,
        flexShrink: 0,
      }}
    >
      {/* Column header */}
      <div
        onClick={onToggleCollapse}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          padding: "5px 10px",
          borderRadius: 5,
          backgroundColor: col.bg,
          border: `1px solid ${col.border}`,
          cursor: "pointer",
          userSelect: "none",
        }}
        title={`Collapse ${col.label}`}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: col.color }}>
          {col.label}
        </span>
        <span style={{ fontSize: 11, color: col.color, opacity: 0.7 }}>
          {parts.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 7,
          borderRadius: 6,
          padding: 6,
          minHeight: 120,
          backgroundColor: isOver
            ? "rgba(232,160,32,0.06)"
            : "rgba(255,255,255,0.02)",
          border: isOver
            ? "1px dashed rgba(232,160,32,0.4)"
            : "1px solid transparent",
          transition: "background-color 0.15s, border-color 0.15s",
        }}
      >
        <SortableContext
          items={parts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────

export function KanbanBoard({ initialParts }: { initialParts: KanbanPart[] }) {
  const [parts, setParts] = useState<KanbanPart[]>(initialParts);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<SectionCode | "ALL">("ALL");
  const [collapsedCols, setCollapsedCols] = useState<Set<KanbanColId>>(new Set());

  const toggleColCollapse = useCallback((colId: KanbanColId) => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const projectNames = useMemo(
    () => [...new Set(initialParts.map((p) => p.toolName))].sort(),
    [initialParts]
  );

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.id as string);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const partId = active.id as string;
      const overId = over.id as string;
      const VALID_COLS = new Set<string>(KANBAN_COLS.map((c) => c.id));
      const targetColId = (
        VALID_COLS.has(overId)
          ? overId
          : (over.data?.current as { sortable?: { containerId?: string } })
              ?.sortable?.containerId ?? overId
      ) as KanbanColId;
      if (!VALID_COLS.has(targetColId)) return;

      const part = parts.find((p) => p.id === partId);
      if (!part) return;

      const currentColId = getPartColumnId(part);
      if (currentColId === targetColId) return;

      const activeOp = getActiveOp(part);
      const statusUpdates: { opId: string; status: string }[] = [];

      if (targetColId === "Done") {
        for (const op of part.operations) {
          if (!["Done", "Received"].includes(op.status)) {
            statusUpdates.push({ opId: op.id, status: getDoneStatus(op) });
          }
        }
      } else {
        if (activeOp) {
          statusUpdates.push({
            opId: activeOp.id,
            status: getDoneStatus(activeOp),
          });
        }
        const targetOp = part.operations.find(
          (op) =>
            opMatchesColumn(op, targetColId) &&
            !["Done", "Received"].includes(op.status)
        );
        if (targetOp) {
          statusUpdates.push({
            opId: targetOp.id,
            status: getEntryStatus(targetOp),
          });
        }
      }

      if (statusUpdates.length === 0) return;

      // Optimistic update
      setParts((prev) =>
        prev.map((p) => {
          if (p.id !== partId) return p;
          let ops = [...p.operations];
          for (const u of statusUpdates) {
            ops = ops.map((op) =>
              op.id === u.opId ? { ...op, status: u.status } : op
            );
          }
          return { ...p, operations: ops };
        })
      );

      await Promise.all(
        statusUpdates.map((u) =>
          fetch(`/api/operations/${u.opId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: u.status }),
          })
        )
      );
    },
    [parts]
  );

  // Filter
  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (projectFilter !== "ALL" && p.toolName !== projectFilter) return false;
      if (sectionFilter !== "ALL") {
        const code = p.sectionName ? toSectionCode(p.sectionName) : null;
        if (code !== sectionFilter) return false;
      }
      return true;
    });
  }, [parts, projectFilter, sectionFilter]);

  // Group by column
  const colParts = useMemo(() => {
    const groups: Record<KanbanColId, KanbanPart[]> = {
      MaterialOrder: [],
      Programming: [],
      Milling: [],
      Outsourcing: [],
      Inspection: [],
      Done: [],
    };
    for (const p of filtered) {
      groups[getPartColumnId(p)].push(p);
    }
    return groups;
  }, [filtered]);

  const activePart = parts.find((p) => p.id === activeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: C.accent,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.05em",
          }}
        >
          KANBAN
        </span>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: "5px 10px",
            fontSize: 12,
            backgroundColor: C.surface,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            outline: "none",
          }}
        >
          <option value="ALL">All Projects</option>
          {projectNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {/* Section chips */}
        <div style={{ display: "flex", gap: 5 }}>
          {(["ALL", ...SECTION_CODES] as const).map((code) => {
            const s = code !== "ALL" ? (SECTION_STYLE[code] ?? null) : null;
            const isActive = sectionFilter === code;
            return (
              <button
                key={code}
                onClick={() =>
                  setSectionFilter(code as typeof sectionFilter)
                }
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily:
                    code !== "ALL"
                      ? "var(--font-jetbrains-mono)"
                      : undefined,
                  backgroundColor: isActive
                    ? (s?.bg ?? C.accentDim)
                    : "transparent",
                  color: isActive ? (s?.text ?? C.accent) : C.textDim,
                  border: `1px solid ${
                    isActive ? (s?.border ?? C.accentBorder) : C.border
                  }`,
                  transition: "all 0.1s",
                }}
              >
                {code}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>
          {filtered.length} parts
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            flex: 1,
            paddingBottom: 8,
          }}
        >
          {KANBAN_COLS.map((col) => (
            <KanbanCol
              key={col.id}
              col={col}
              parts={colParts[col.id]}
              collapsed={collapsedCols.has(col.id)}
              onToggleCollapse={() => toggleColCollapse(col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activePart ? <PartCard part={activePart} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
