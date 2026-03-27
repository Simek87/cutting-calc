import { prisma } from "@/lib/prisma";
import { KanbanBoardClient } from "@/components/KanbanBoardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = await prisma.tool.findMany({
    where: { status: { not: "Cancelled" } },
    orderBy: { createdAt: "desc" },
    include: { parts: { include: { operations: true } }, family: true },
  });

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-50">
      <KanbanBoardClient initialTools={JSON.parse(JSON.stringify(tools))} />
    </div>
  );
}
