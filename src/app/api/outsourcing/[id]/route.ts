import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const prev = await prisma.outsourceJob.findUnique({
    where: { id },
    select: { status: true, company: true, part: { select: { id: true, name: true, toolId: true } } },
  });
  const job = await prisma.outsourceJob.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.company && { company: body.company }),
      ...(body.supplierId !== undefined && { supplierId: body.supplierId || null }),
      ...(body.sentDate !== undefined && { sentDate: body.sentDate ? new Date(body.sentDate) : null }),
      ...(body.eta !== undefined && { eta: body.eta ? new Date(body.eta) : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.externalJobRef !== undefined && { externalJobRef: body.externalJobRef }),
    },
  });
  if (body.status && prev?.status !== body.status) {
    await logActivity({
      entityType: "outsource",
      entityId: id,
      entityName: `${prev?.part.name} @ ${prev?.company}`,
      action: "status_changed",
      detail: `${prev?.status} → ${body.status}`,
      toolId: prev?.part.toolId,
      partId: prev?.part.id,
    });
  }
  return NextResponse.json(job);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.outsourceJob.findUnique({
    where: { id },
    select: { company: true, part: { select: { id: true, name: true, toolId: true } } },
  });
  await prisma.outsourceJob.delete({ where: { id } });
  if (job) {
    await logActivity({
      entityType: "outsource",
      entityId: id,
      entityName: `${job.part.name} @ ${job.company}`,
      action: "deleted",
      toolId: job.part.toolId,
      partId: job.part.id,
    });
  }
  return NextResponse.json({ ok: true });
}
