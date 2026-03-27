import { prisma } from "@/lib/prisma";
import { OutsourcingClient } from "./OutsourcingClient";

export const dynamic = "force-dynamic";

export default async function OutsourcingPage() {
  const [jobs, suppliers] = await Promise.all([
    prisma.outsourceJob.findMany({
      include: { part: { include: { tool: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const data = jobs.map((j) => ({
    id: j.id,
    partId: j.partId,
    partName: j.part.name,
    toolName: j.part.tool.projectName,
    toolId: j.part.tool.id,
    company: j.company,
    supplierId: j.supplierId,
    status: j.status,
    sentDate: j.sentDate?.toISOString() ?? null,
    eta: j.eta?.toISOString() ?? null,
    notes: j.notes,
    externalJobRef: j.externalJobRef,
  }));

  return (
    <OutsourcingClient
      jobs={JSON.parse(JSON.stringify(data))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
