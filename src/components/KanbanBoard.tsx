"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { ToolCard } from "./ToolCard";
import { CreateToolDialog } from "./CreateToolDialog";
import { Tool, TOOL_STATUSES, ToolStatus } from "@/lib/types";

interface KanbanBoardProps {
  initialTools: Tool[];
}

export function KanbanBoard({ initialTools }: KanbanBoardProps) {
  const [tools, setTools] = useState<Tool[]>(initialTools);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const toolId = active.id as string;
      const newStatus = over.id as ToolStatus;
      const tool = tools.find((t) => t.id === toolId);
      if (!tool || tool.status === newStatus) return;

      setTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, status: newStatus } : t))
      );

      await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    },
    [tools]
  );

  const handleToolCreated = (tool: Tool) => {
    setTools((prev) => [tool, ...prev]);
  };

  const handleToolDeleted = (toolId: string) => {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
  };

  const activeTool = tools.find((t) => t.id === activeId);

  const filteredTools = search.trim()
    ? tools.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.projectName.toLowerCase().includes(q) ||
          (t.family?.name ?? "").toLowerCase().includes(q)
        );
      })
    : tools;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1 gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Toolroom Dashboard</h1>
        <input
          type="search"
          placeholder="Search tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400"
        />
        <CreateToolDialog onCreated={handleToolCreated} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {TOOL_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tools={filteredTools.filter((t) => t.status === status)}
              onToolDeleted={handleToolDeleted}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTool ? (
            <ToolCard tool={activeTool} isDragging onDeleted={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
