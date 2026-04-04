import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PartDetailClient } from "./PartDetailClient";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string; partId: string }>;
}) {
  const { id: toolId, partId } = await params;

  const [part, tool, suppliers] = await Promise.all([
    prisma.part.findUnique({
      where: { id: partId },
      include: {
        section: true,
        operations: { orderBy: { order: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, projectName: true, projectType: true, archived: true },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!part || !tool || part.toolId !== toolId) notFound();

  return (
    <PartDetailClient
      part={JSON.parse(JSON.stringify(part))}
      tool={JSON.parse(JSON.stringify(tool))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
