import { prisma } from "@/lib/prisma";
import { KanbanBoardClient } from "@/components/KanbanBoardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = await prisma.tool.findMany({
    where: { status: { not: "Cancelled" } },
    orderBy: { createdAt: "desc" },
    include: { parts: { include: { operations: true } }, toolGroup: true },
  });

  return (
    <div style={{ height: "calc(100vh - 45px)", display: "flex", flexDirection: "column", padding: "16px", backgroundColor: "#0d0f10" }}>
      <KanbanBoardClient initialTools={JSON.parse(JSON.stringify(tools))} />
    </div>
  );
}
