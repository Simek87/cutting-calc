"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ToolCard } from "./ToolCard";
import { Tool, ToolStatus, STATUS_COLORS } from "@/lib/types";

interface KanbanColumnProps {
  status: ToolStatus;
  tools: Tool[];
  onToolDeleted: (id: string) => void;
}

export function KanbanColumn({ status, tools, onToolDeleted }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[220px] w-[220px]">
      <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded border text-sm font-medium ${STATUS_COLORS[status]}`}>
        <span>{status}</span>
        <span className="ml-2 text-xs font-normal opacity-70">{tools.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 rounded-md p-2 min-h-[120px] transition-colors ${
          isOver ? "bg-blue-50 border border-dashed border-blue-300" : "bg-gray-50"
        }`}
      >
        <SortableContext
          items={tools.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onDeleted={onToolDeleted} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
