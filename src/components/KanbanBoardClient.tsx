"use client";

import dynamic from "next/dynamic";
import { KanbanPart } from "./KanbanBoard";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-gray-400 text-sm">Loading board...</div>
    ),
  }
);

export function KanbanBoardClient({
  initialParts,
}: {
  initialParts: KanbanPart[];
}) {
  return <KanbanBoard initialParts={initialParts} />;
}
