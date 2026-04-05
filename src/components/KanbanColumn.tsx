"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ToolCard } from "./ToolCard";
import { Tool, ToolStatus } from "@/lib/types";

interface KanbanColumnProps {
  status: ToolStatus;
  tools: Tool[];
  onToolDeleted: (id: string) => void;
}

const STATUS_STYLE: Record<ToolStatus, { text: string; border: string; bg: string }> = {
  Management:    { text: "#9ca3af", border: "#374151",        bg: "rgba(156,163,175,0.08)" },
  CAD:           { text: "#93c5fd", border: "#1d4ed8",        bg: "rgba(59,130,246,0.08)"  },
  CAM:           { text: "#c4b5fd", border: "#7c3aed",        bg: "rgba(139,92,246,0.08)"  },
  Manufacturing: { text: "#fcd34d", border: "#b45309",        bg: "rgba(245,158,11,0.08)"  },
  Toolmaking:    { text: "#fdba74", border: "#c2410c",        bg: "rgba(249,115,22,0.08)"  },
  Done:          { text: "#86efac", border: "#15803d",        bg: "rgba(34,197,94,0.08)"   },
  Cancelled:     { text: "#6b7280", border: "#374151",        bg: "rgba(107,114,128,0.06)" },
};

export function KanbanColumn({ status, tools, onToolDeleted }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const s = STATUS_STYLE[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 210, width: 210 }}>
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          padding: "5px 10px",
          borderRadius: 5,
          backgroundColor: s.bg,
          border: `1px solid ${s.border}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: s.text }}>{status}</span>
        <span style={{ fontSize: 11, color: s.text, opacity: 0.6 }}>{tools.length}</span>
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
          backgroundColor: isOver ? "rgba(232,160,32,0.06)" : "rgba(255,255,255,0.02)",
          border: isOver ? "1px dashed rgba(232,160,32,0.4)" : "1px solid transparent",
          transition: "background-color 0.15s, border-color 0.15s",
        }}
      >
        <SortableContext items={tools.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onDeleted={onToolDeleted} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
