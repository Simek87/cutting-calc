import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OperationStatus } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const session = await auth();
  const changedBy = session?.user?.initials ?? session?.user?.name?.slice(0, 4) ?? "?";

  const prev = body.status
    ? await prisma.operation.findUnique({
        where: { id },
        select: { name: true, type: true, status: true, part: { select: { id: true, name: true, toolId: true } } },
      })
    : null;

  const operation = await prisma.operation.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status as OperationStatus }),
      ...(body.actualTime !== undefined && { actualTime: body.actualTime }),
      ...(body.estimatedTime !== undefined && { estimatedTime: body.estimatedTime }),
      ...(body.machine !== undefined && { machine: body.machine }),
      ...(body.dependsOnPrevious !== undefined && { dependsOnPrevious: body.dependsOnPrevious }),
      ...("orderId" in body && { orderId: body.orderId ?? null }),
      ...("outsourceJobId" in body && { outsourceJobId: body.outsourceJobId ?? null }),
      ...(body.programRevision !== undefined && { programRevision: body.programRevision }),
      ...(body.programRevNote !== undefined && { programRevNote: body.programRevNote }),
      ...(body.toolList !== undefined && { toolList: body.toolList }),
      ...(body.status && prev?.status !== body.status && {
        statusChangedAt: new Date(),
        changedBy,
      }),
    },
    include: {
      linkedOrder: { select: { id: true, supplier: true, status: true, eta: true, poNumber: true } },
      linkedJob: { select: { id: true, company: true, status: true, eta: true } },
    },
  });

  const isProcurementOp = prev?.type === "procurement" || prev?.name.toLowerCase() === "order material";

  if (body.status && prev && prev.status !== body.status && !isProcurementOp) {
    await logActivity({
      entityType: "operation",
      entityId: id,
      entityName: `${prev.name} (${prev.part.name})`,
      action: "status_changed",
      detail: `${prev.status} → ${body.status}`,
      toolId: prev.part.toolId,
      partId: prev.part.id,
    });
  }

  return NextResponse.json(operation);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.operation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
