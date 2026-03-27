import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.outsourceJob.findMany({
    include: { part: { include: { tool: true } } },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      partId: j.partId,
      partName: j.part.name,
      toolName: j.part.tool.projectName,
      toolId: j.part.tool.id,
      company: j.company,
      status: j.status,
      sentDate: j.sentDate,
      eta: j.eta,
      notes: j.notes,
      externalJobRef: j.externalJobRef,
    }))
  );
}
