import { prisma } from "@/lib/prisma";
import { CuttingToolsClient } from "./CuttingToolsClient";

export const dynamic = "force-dynamic";

export default async function CuttingToolsPage() {
  const tools = await prisma.cuttingTool.findMany({
    orderBy: [{ machine: "asc" }, { name: "asc" }],
  });

  const serialized = tools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return <CuttingToolsClient initialTools={JSON.parse(JSON.stringify(serialized))} />;
}
