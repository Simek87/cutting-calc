import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const prev = await prisma.order.findUnique({ where: { id }, select: { status: true, supplier: true } });
  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.supplier && { supplier: body.supplier }),
      ...(body.supplierId !== undefined && { supplierId: body.supplierId || null }),
      ...("partId" in body && { partId: body.partId || null }),
      ...(body.eta !== undefined && { eta: body.eta ? new Date(body.eta) : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.poNumber !== undefined && { poNumber: body.poNumber }),
      ...(body.supplierQuoteRef !== undefined && { supplierQuoteRef: body.supplierQuoteRef }),
    },
  });
  if (body.status && prev?.status !== body.status) {
    await logActivity({ entityType: "order", entityId: id, entityName: `Order ${order.supplier}`, action: "status_changed", detail: `${prev?.status} → ${body.status}` });
  }
  return NextResponse.json(order);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { supplier: true } });
  await prisma.order.delete({ where: { id } });
  if (order) await logActivity({ entityType: "order", entityId: id, entityName: `Order ${order.supplier}`, action: "deleted" });
  return NextResponse.json({ ok: true });
}
