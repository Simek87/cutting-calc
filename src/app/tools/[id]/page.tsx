import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToolDetailClient } from "./ToolDetailClient";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tool, activityLogs] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { name: "asc" } },
        parts: {
          include: {
            section: true,
            operations: { orderBy: { order: "asc" } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        issues: {
          where: { status: { in: ["Open", "InProgress"] } },
          include: { part: { select: { id: true, name: true } } },
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.activityLog.findMany({
      where: { toolId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  if (!tool) notFound();

  return (
    <ToolDetailClient
      tool={JSON.parse(JSON.stringify(tool))}
      activityLogs={JSON.parse(
        JSON.stringify(
          activityLogs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))
        )
      )}
    />
  );
}
