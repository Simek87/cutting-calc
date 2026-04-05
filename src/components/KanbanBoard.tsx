"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Tool, TOOL_STATUSES, ToolStatus } from "@/lib/types";

interface KanbanBoardProps {
  initialTools: Tool[];
}

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  border: "#2a2d30",
  accent: "#e8a020",
  text: "#e2e4e6",
  textDim: "#8b9196",
};

export function KanbanBoard({ initialTools }: KanbanBoardProps) {
  const router = useRouter();
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

  const handleToolDeleted = (toolId: string) => {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
  };

  const activeTool = tools.find((t) => t.id === activeId);

  const filteredTools = search.trim()
    ? tools.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.projectName.toLowerCase().includes(q) ||
          (t.toolGroup?.name ?? "").toLowerCase().includes(q)
        );
      })
    : tools;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
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
        <input
          type="search"
          placeholder="Search tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 10px",
            fontSize: 13,
            backgroundColor: C.surface,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            outline: "none",
            width: 200,
          }}
        />
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => router.push("/tools/new")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: "rgba(232,160,32,0.10)",
              color: "#e8a020",
              border: "1px solid rgba(232,160,32,0.3)",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            + New Tool
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: "flex", gap: 10, overflowX: "auto", flex: 1, paddingBottom: 8 }}>
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
