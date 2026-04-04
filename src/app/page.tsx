import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [tools, awaitingMaterialCount, openIssuesCount, activityLogs, suppliers] =
    await Promise.all([
      prisma.tool.findMany({
        where: { archived: false },
        orderBy: { createdAt: "desc" },
        include: {
          parts: {
            include: {
              section: true,
              operations: { orderBy: { order: "asc" } },
              attachments: true,
            },
          },
        },
      }),
      prisma.order.count({ where: { status: { in: ["Draft", "Sent"] } } }),
      prisma.issue.count({ where: { status: { in: ["Open", "InProgress"] } } }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    ]);

  const allOps = tools.flatMap((t) => t.parts.flatMap((p) => p.operations));
  const opsInProgress = allOps.filter((op) => op.status === "InProgress").length;

  const toolsData = tools.map((tool) => {
    const ops = tool.parts.flatMap((p) => p.operations);
    const totalOps = ops.length;
    const doneOps = ops.filter(
      (op) => op.status === "Done" || op.status === "Received"
    ).length;
    const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;

    const currentOp =
      ops.find((op) => op.status === "InProgress") ??
      ops.find((op) => op.status === "Blocked") ??
      null;

    const sectionNames = [
      ...new Set(
        tool.parts
          .map((p) => p.section?.name)
          .filter((n): n is string => !!n)
      ),
    ];

    return {
      id: tool.id,
      projectName: tool.projectName,
      status: tool.status as string,
      projectType: tool.projectType as string,
      dueDate: tool.dueDate?.toISOString() ?? null,
      machineTarget: tool.machineTarget,
      sections: sectionNames,
      progress,
      currentOperation: currentOp?.name ?? null,
      currentOpType: currentOp?.type ?? null,
      partsCount: tool.parts.length,
      parts: tool.parts.map((part) => ({
        id: part.id,
        name: part.name,
        sectionName: part.section?.name ?? null,
        material: part.material,
        materialType: part.materialType as string | null,
        dimX: part.dimX,
        dimY: part.dimY,
        dimZ: part.dimZ,
        revModel: part.revModel,
        revProgram: part.revProgram,
        revProgramNote: part.revProgramNote,
        operations: part.operations.map((op) => ({
          id: op.id,
          name: op.name,
          order: op.order,
          status: op.status as string,
          type: op.type as string,
          estimatedTime: op.estimatedTime,
        })),
        attachments: part.attachments.map((att) => ({
          id: att.id,
          name: att.name,
          type: att.type as string,
          url: att.url,
        })),
      })),
    };
  });

  return (
    <DashboardClient
      tools={JSON.parse(JSON.stringify(toolsData))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
      stats={{
        activeProjects: tools.length,
        opsInProgress,
        awaitingMaterial: awaitingMaterialCount,
        openIssues: openIssuesCount,
      }}
      activityLogs={JSON.parse(
        JSON.stringify(
          activityLogs.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          }))
        )
      )}
    />
  );
}
