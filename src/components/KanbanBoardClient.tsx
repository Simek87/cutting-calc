"use client";

import dynamic from "next/dynamic";
import { Tool } from "@/lib/types";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((m) => m.KanbanBoard),
  { ssr: false, loading: () => <div className="p-4 text-gray-400 text-sm">Loading board...</div> }
);

export function KanbanBoardClient({ initialTools }: { initialTools: Tool[] }) {
  return <KanbanBoard initialTools={initialTools} />;
}
