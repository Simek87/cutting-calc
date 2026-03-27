import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const part = await prisma.part.findUnique({ where: { id }, select: { name: true, toolId: true } });
  const job = await prisma.outsourceJob.create({
    data: {
      partId: id,
      company: body.company,
      supplierId: body.supplierId || null,
      status: "Pending",
      sentDate: body.sentDate ? new Date(body.sentDate) : null,
      eta: body.eta ? new Date(body.eta) : null,
      notes: body.notes ?? null,
      externalJobRef: body.externalJobRef ?? null,
    },
  });
  if (part) {
    await logActivity({
      entityType: "outsource",
      entityId: job.id,
      entityName: `${part.name} @ ${body.company}`,
      action: "created",
      toolId: part.toolId,
      partId: id,
    });
  }
  return NextResponse.json(job, { status: 201 });
}
