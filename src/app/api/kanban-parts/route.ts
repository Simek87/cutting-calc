import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const parts = tools.flatMap((tool) =>
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

  return NextResponse.json(parts);
}
