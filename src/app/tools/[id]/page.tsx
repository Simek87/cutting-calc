import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToolDetailClient } from "./ToolDetailClient";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tool, orders, families, suppliers] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      include: {
        family: true,
        sections: { orderBy: { name: "asc" } },
        parts: {
          include: {
            operations: {
              orderBy: { order: "asc" },
              include: {
                linkedOrder: { select: { id: true, supplier: true, status: true, eta: true, poNumber: true } },
                linkedJob: { select: { id: true, company: true, status: true, eta: true } },
              },
            },
            outsourceJobs: true,
            attachments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.order.findMany({
      where: { status: { not: "Cancelled" } },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true, orderId: true, partId: true, qty: true, notes: true,
            part: {
              select: {
                id: true, name: true,
                tool: { select: { id: true, projectName: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.family.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!tool) notFound();

  return (
    <ToolDetailClient
      tool={JSON.parse(JSON.stringify(tool))}
      orders={JSON.parse(JSON.stringify(orders))}
      families={JSON.parse(JSON.stringify(families))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
