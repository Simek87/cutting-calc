"use client";

import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tool, Part } from "@/lib/types";
import { getPartBlockReasons } from "@/lib/blockers";

interface ToolCardProps {
  tool: Tool;
  isDragging?: boolean;
  onDeleted: (id: string) => void;
}

const C = {
  surface: "#141618",
  surface2: "#1a1d20",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

function getPartStage(part: Part): string {
  if (getPartBlockReasons(part).length > 0) return "Blocked";
  const ops = part.operations;
  if (ops.length === 0) return "—";
  for (let i = 0; i < ops.length; i++) {
    if (ops[i].status === "Blocked") return "Blocked";
    if (ops[i].status !== "Done") {
      const canStart = i === 0 || !ops[i].dependsOnPrevious || ops[i - 1].status === "Done";
      if (canStart) return ops[i].name;
    }
  }
  return "Done";
}

function getBreakdown(parts: Part[]): { stage: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const p of parts) {
    const stage = getPartStage(p);
    counts[stage] = (counts[stage] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => {
      if (a.stage === "Blocked") return -1;
      if (b.stage === "Blocked") return 1;
      if (a.stage === "Done") return 1;
      if (b.stage === "Done") return -1;
      return b.count - a.count;
    });
}

const STAGE_SHORT: Record<string, string> = {
  "Order material":   "ORDER",
  "CAM":              "CAM",
  "Milling":          "MILL",
  "Mill":             "MILL",
  "Assembly":         "ASSY",
  "Inspection":       "INSP",
  "Gundrill":         "DRILL",
  "Finish":           "FINISH",
  "Laser cutting":    "LASER",
  "Deburr":           "DEBURR",
  "Send to supplier": "SEND",
  "Done":             "DONE",
};

function shortLabel(stage: string): string {
  return STAGE_SHORT[stage] ?? stage.slice(0, 6).toUpperCase();
}

export function ToolCard({ tool, isDragging, onDeleted }: ToolCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, active } =
    useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: active?.id === tool.id && !isDragging ? 0.3 : 1,
  };

  const parts = tool.parts ?? [];
  const totalOps = parts.reduce((acc, p) => acc + p.operations.length, 0);
  const doneOps = parts.reduce(
    (acc, p) => acc + p.operations.filter((o) => o.status === "Done").length, 0
  );
  const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;

  const dueDateStr = tool.dueDate
    ? new Date(tool.dueDate).toLocaleDateString("pl-PL")
    : null;

  const isOverdue = tool.dueDate && tool.status !== "Done"
    ? new Date(tool.dueDate) < new Date()
    : false;

  const breakdown = getBreakdown(parts);
  const blockedEntry = breakdown.find((b) => b.stage === "Blocked");
  const activeStages = breakdown.filter((b) => b.stage !== "Blocked" && b.stage !== "Done" && b.stage !== "—");
  const doneEntry = breakdown.find((b) => b.stage === "Done");

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${tool.projectName}"?`)) return;
    await fetch(`/api/tools/${tool.id}`, { method: "DELETE" });
    onDeleted(tool.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.5)" : "none",
        transform: isDragging ? `${CSS.Transform.toString(transform)} rotate(1deg)` : CSS.Transform.toString(transform),
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
          padding: "6px 10px 2px",
          cursor: "grab",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 24, height: 3, backgroundColor: C.border, borderRadius: 2 }} />
      </div>

      {/* Clickable content */}
      <div
        style={{ padding: "4px 10px 10px", cursor: "pointer" }}
        onClick={() => router.push(`/tools/${tool.id}`)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.3,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {tool.projectName}
          </span>
          <button
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              fontSize: 11,
              color: C.textMuted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 2px",
              opacity: 0,
              flexShrink: 0,
            }}
            className="group-hover:opacity-100"
            title="Delete"
          >
            ✕
          </button>
        </div>

        {dueDateStr && (
          <div style={{ fontSize: 11, marginTop: 4, color: isOverdue ? "#ef4444" : C.textMuted, fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue ? "⚠ " : ""}Due: {dueDateStr}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
            <span>{parts.length} parts</span>
            <span style={{ color: progress === 100 ? "#22c55e" : C.textDim }}>{progress}%</span>
          </div>
          <div style={{ height: 3, backgroundColor: "#1c2024", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: progress === 100 ? "#22c55e" : C.accent,
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        {/* Stage breakdown */}
        {parts.length > 0 && (activeStages.length > 0 || blockedEntry || doneEntry) && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            {activeStages.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 4px", fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: C.textDim }}>
                {activeStages.map(({ stage, count }, i) => (
                  <span key={stage} title={stage}>
                    {i > 0 && <span style={{ color: C.textMuted, marginRight: 2 }}>|</span>}
                    <span style={{ color: C.text }}>{shortLabel(stage)}</span>
                    {" "}
                    <span style={{ color: C.textMuted }}>({count})</span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, fontFamily: "var(--font-jetbrains-mono)", fontSize: 10 }}>
              {blockedEntry && (
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  BLOCKED ({blockedEntry.count})
                </span>
              )}
              {doneEntry && (
                <span style={{ color: "#22c55e" }}>
                  DONE ({doneEntry.count})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
