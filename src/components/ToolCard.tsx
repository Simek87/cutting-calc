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
      style={style}
      {...attributes}
      className={`bg-white rounded border border-gray-200 shadow-sm group select-none ${
        isDragging ? "shadow-lg rotate-1 cursor-grabbing" : ""
      }`}
    >
      {/* Drag handle */}
      <div {...listeners} className="px-3 pt-2 pb-1 cursor-grab active:cursor-grabbing">
        <div className="w-6 h-1 bg-gray-200 rounded mx-auto mb-2" />
      </div>

      {/* Clickable content */}
      <div className="px-3 pb-3 cursor-pointer" onClick={() => router.push(`/tools/${tool.id}`)}>
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-medium text-gray-800 leading-tight hover:text-blue-600">
            {tool.projectName}
          </span>
          <button
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs ml-1 shrink-0"
            title="Delete"
          >
            ✕
          </button>
        </div>

        {dueDateStr && (
          <div className={`text-xs mt-1 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "⚠ " : ""}Due: {dueDateStr}
          </div>
        )}

        {/* Progress */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{parts.length} parts</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage breakdown */}
        {parts.length > 0 && (activeStages.length > 0 || blockedEntry || doneEntry) && (
          <div className="mt-2 space-y-1">
            {activeStages.length > 0 && (
              <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 font-mono text-xs text-gray-500">
                {activeStages.map(({ stage, count }, i) => (
                  <span key={stage} title={stage}>
                    {i > 0 && <span className="text-gray-300 mr-1">|</span>}
                    <span className="font-semibold text-gray-700">{shortLabel(stage)}</span>
                    {" "}
                    <span className="text-gray-400">({count})</span>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 font-mono text-xs">
              {blockedEntry && (
                <span className="text-red-600 font-semibold">
                  BLOCKED ({blockedEntry.count})
                </span>
              )}
              {doneEntry && (
                <span className="text-green-600">
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
