import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toolId = searchParams.get("toolId");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const logs = await prisma.activityLog.findMany({
    where: {
      ...(toolId ? { toolId } : {}),
      // Suppress old "Order material: NotStarted → Done" entries
      NOT: {
        entityType: "operation",
        action: "status_changed",
        entityName: { startsWith: "order material", mode: "insensitive" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Enrich with toolName and partName
  const toolIds = [...new Set(logs.map((l) => l.toolId).filter(Boolean) as string[])];
  const partIds = [...new Set(logs.map((l) => l.partId ?? (l.entityType === "part" ? l.entityId : null)).filter(Boolean) as string[])];

  const [tools, parts] = await Promise.all([
    toolIds.length ? prisma.tool.findMany({ where: { id: { in: toolIds } }, select: { id: true, projectName: true } }) : [],
    partIds.length ? prisma.part.findMany({ where: { id: { in: partIds } }, select: { id: true, name: true } }) : [],
  ]);

  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t.projectName]));
  const partMap = Object.fromEntries(parts.map((p) => [p.id, p.name]));

  const enriched = logs.map((l) => {
    const resolvedPartId = l.partId ?? (l.entityType === "part" ? l.entityId : null);
    return {
      ...l,
      createdAt: l.createdAt.toISOString(),
      toolName: l.toolId ? (toolMap[l.toolId] ?? null) : null,
      partName: resolvedPartId ? (partMap[resolvedPartId] ?? null) : null,
      partId: resolvedPartId,
    };
  });

  return NextResponse.json(enriched);
}
