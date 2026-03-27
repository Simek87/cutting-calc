import { prisma } from "@/lib/prisma";
import { ProcurementClient } from "./ProcurementClient";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const [orders, suppliers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        // Primary: OrderItems (multi-part orders)
        items: {
          include: {
            part: {
              select: {
                id: true, name: true,
                tool: { select: { id: true, projectName: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { part: { name: "asc" } },
        },
        // Compat: direct part link (orders created before OrderItems)
        part: {
          select: {
            id: true, name: true,
            tool: { select: { id: true, projectName: true } },
            section: { select: { id: true, name: true } },
          },
        },
        // Compat: very old orders linked only via operations
        operations: {
          include: {
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
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <ProcurementClient
      orders={JSON.parse(JSON.stringify(orders))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
