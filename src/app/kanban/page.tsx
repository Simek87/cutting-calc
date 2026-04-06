import { prisma } from "@/lib/prisma";
import { KanbanBoardClient } from "@/components/KanbanBoardClient";
import { KanbanPart } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const tools = await prisma.tool.findMany({
    where: { archived: false, status: { not: "Cancelled" } },
    orderBy: { createdAt: "desc" },
    include: {
      parts: {
        include: {
          section: true,
          operations: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  const parts: KanbanPart[] = tools.flatMap((tool) =>
    tool.parts.map((part) => ({
      id: part.id,
      name: part.name,
      toolId: tool.id,
      toolName: tool.projectName,
      sectionName: part.section?.name ?? null,
      dueDate: tool.dueDate?.toISOString() ?? null,
      operations: part.operations.map((op) => ({
        id: op.id,
        name: op.name,
        order: op.order,
        type: op.type as string,
        status: op.status as string,
      })),
    }))
  );

  return (
    <div
      style={{
        height: "calc(100vh - 45px)",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        backgroundColor: "#0d0f10",
      }}
    >
      <KanbanBoardClient initialParts={JSON.parse(JSON.stringify(parts))} />
    </div>
  );
}
