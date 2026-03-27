import { prisma } from "@/lib/prisma";
import { isOutsourceJobBlocking, isOutsourceJobOverdue, isOrderOverdue, isPartBlocked } from "@/lib/blockers";
import { isOpEffectivelyComplete } from "@/lib/types";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [tools, orders, outsourceJobs, activityLogs] = await Promise.all([
    prisma.tool.findMany({
      where: { status: { not: "Cancelled" } },
      orderBy: { createdAt: "desc" },
      include: {
        parts: {
          include: {
            operations: {
              orderBy: { order: "asc" },
              include: {
                linkedOrder: { select: { id: true, supplier: true, status: true, eta: true, poNumber: true } },
                linkedJob:   { select: { id: true, company: true, status: true, eta: true } },
              },
            },
            outsourceJobs: true,
          },
        },
      },
    }),
    prisma.order.findMany({ orderBy: { eta: "asc" } }),
    prisma.outsourceJob.findMany({
      include: { part: { include: { tool: true } } },
      orderBy: { eta: "asc" },
    }),
    prisma.activityLog.findMany({
      where: {
        NOT: {
          entityType: "operation",
          action: "status_changed",
          entityName: { startsWith: "order material", mode: "insensitive" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const now = new Date();

  // Stats
  const activeTools = tools.filter((t) => t.status !== "Done");
  const openOrders = orders.filter((o) => o.status !== "Received" && o.status !== "Cancelled");
  const overdueOrders = orders.filter((o) => isOrderOverdue(o.eta?.toISOString() ?? null, o.status));
  const openJobs = outsourceJobs.filter((j) => isOutsourceJobBlocking({ ...j, eta: j.eta?.toISOString() ?? null, sentDate: j.sentDate?.toISOString() ?? null }));
  const overdueJobs = outsourceJobs.filter((j) => isOutsourceJobOverdue({ ...j, eta: j.eta?.toISOString() ?? null, sentDate: j.sentDate?.toISOString() ?? null }));

  const blockedParts = tools.flatMap((t) =>
    t.parts.filter((p) =>
      isPartBlocked({
        ...p,
        createdAt: p.createdAt.toISOString(),
        outsourceJobs: p.outsourceJobs.map((j) => ({
          ...j,
          eta: j.eta?.toISOString() ?? null,
          sentDate: j.sentDate?.toISOString() ?? null,
        })),
        operations: p.operations.map((o) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
          estimatedTime: o.estimatedTime,
          actualTime: o.actualTime,
          linkedOrder: o.linkedOrder ? { ...o.linkedOrder, eta: o.linkedOrder.eta?.toISOString() ?? null } : null,
          linkedJob:   o.linkedJob   ? { ...o.linkedJob,   eta: o.linkedJob.eta?.toISOString()   ?? null } : null,
        })),
      })
    )
  );

  const readyForAssembly = tools.flatMap((t) =>
    t.parts.filter((p) => {
      const ops = p.operations;
      const assemblyIdx = ops.findIndex((o) => o.type === "assembly");
      if (assemblyIdx < 0) return false;
      const assemblyOp = ops[assemblyIdx];
      if (isOpEffectivelyComplete(assemblyOp)) return false;
      const prevOp = assemblyIdx > 0 ? ops[assemblyIdx - 1] : null;
      return !prevOp || isOpEffectivelyComplete(prevOp);
    })
  );

  // Upcoming ETAs (within 7 days)
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingOrders = orders.filter(
    (o) => o.eta && o.eta >= now && o.eta <= weekFromNow && o.status !== "Received"
  );
  const upcomingJobs = outsourceJobs.filter(
    (j) => j.eta && j.eta >= now && j.eta <= weekFromNow && j.status !== "Done" && j.status !== "Cancelled"
  );

  // Tool due dates
  const toolsWithDue = tools.filter(
    (t) => t.dueDate && t.dueDate <= weekFromNow && t.status !== "Done"
  );

  const data = {
    stats: {
      activeTools: activeTools.length,
      openOrders: openOrders.length,
      overdueOrders: overdueOrders.length,
      openJobs: openJobs.length,
      overdueJobs: overdueJobs.length,
      blockedParts: blockedParts.length,
      readyForAssembly: readyForAssembly.length,
    },
    urgentItems: [
      ...overdueOrders.map((o) => ({
        type: "order" as const,
        id: o.id,
        label: `Order #${o.id.slice(-6).toUpperCase()} — ${o.supplier}`,
        eta: o.eta?.toISOString() ?? null,
        status: o.status,
        href: "/procurement",
      })),
      ...overdueJobs.map((j) => ({
        type: "outsource" as const,
        id: j.id,
        label: `${j.part.name} @ ${j.company}`,
        eta: j.eta?.toISOString() ?? null,
        status: j.status,
        href: "/outsourcing",
      })),
      ...toolsWithDue
        .filter((t) => t.dueDate && t.dueDate < now)
        .map((t) => ({
          type: "tool" as const,
          id: t.id,
          label: t.projectName,
          eta: t.dueDate?.toISOString() ?? null,
          status: t.status,
          href: `/tools/${t.id}`,
        })),
    ],
    upcomingEtas: [
      ...upcomingOrders.map((o) => ({
        type: "order" as const,
        id: o.id,
        label: `Order #${o.id.slice(-6).toUpperCase()} — ${o.supplier}`,
        eta: o.eta!.toISOString(),
        status: o.status,
        href: "/procurement",
      })),
      ...upcomingJobs.map((j) => ({
        type: "outsource" as const,
        id: j.id,
        label: `${j.part.name} @ ${j.company} (${j.part.tool.projectName})`,
        eta: j.eta!.toISOString(),
        status: j.status,
        href: "/outsourcing",
      })),
      ...toolsWithDue
        .filter((t) => t.dueDate && t.dueDate >= now)
        .map((t) => ({
          type: "tool" as const,
          id: t.id,
          label: t.projectName,
          eta: t.dueDate!.toISOString(),
          status: t.status,
          href: `/tools/${t.id}`,
        })),
    ].sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime()),
    recentTools: tools.slice(0, 5).map((t) => ({
      id: t.id,
      projectName: t.projectName,
      status: t.status,
      dueDate: t.dueDate?.toISOString() ?? null,
      partsCount: t.parts.length,
      progress: (() => {
        const total = t.parts.reduce((a, p) => a + p.operations.length, 0);
        const done = t.parts.reduce((a, p) => a + p.operations.filter(isOpEffectivelyComplete).length, 0);
        return total > 0 ? Math.round((done / total) * 100) : 0;
      })(),
    })),
  };

  // Enrich activity logs with toolName + partName
  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t.projectName]));
  const activityPartIds = [...new Set(activityLogs.map((l) => l.partId ?? (l.entityType === "part" ? l.entityId : null)).filter(Boolean) as string[])];
  const activityParts = activityPartIds.length
    ? await prisma.part.findMany({ where: { id: { in: activityPartIds } }, select: { id: true, name: true } })
    : [];
  const partMap = Object.fromEntries(activityParts.map((p) => [p.id, p.name]));

  const enrichedLogs = activityLogs.map((l) => {
    const resolvedPartId = l.partId ?? (l.entityType === "part" ? l.entityId : null);
    return {
      ...l,
      createdAt: l.createdAt.toISOString(),
      toolName: l.toolId ? (toolMap[l.toolId] ?? null) : null,
      partName: resolvedPartId ? (partMap[resolvedPartId] ?? null) : null,
      partId: resolvedPartId,
    };
  });

  return <DashboardClient data={JSON.parse(JSON.stringify(data))} activityLogs={JSON.parse(JSON.stringify(enrichedLogs))} />;
}
