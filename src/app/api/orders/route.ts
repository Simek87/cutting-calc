import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

const ITEM_PART_SELECT = {
  select: {
    id: true, name: true,
    tool: { select: { id: true, projectName: true } },
    section: { select: { id: true, name: true } },
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  // items[] takes priority; fall back to single partId for PartRow backward compat
  const rawItems: { partId: string; qty?: number; notes?: string }[] =
    body.items?.length ? body.items : body.partId ? [{ partId: body.partId, qty: 1 }] : [];

  const order = await prisma.order.create({
    data: {
      supplier: body.supplier,
      supplierId: body.supplierId || null,
      partId: body.partId || null,
      status: "Draft",
      eta: body.eta ? new Date(body.eta) : null,
      notes: body.notes ?? null,
      poNumber: body.poNumber ?? null,
      supplierQuoteRef: body.supplierQuoteRef ?? null,
      items: rawItems.length
        ? { create: rawItems.map((i) => ({ partId: i.partId, qty: i.qty ?? 1, notes: i.notes ?? null })) }
        : undefined,
    },
    include: { items: { include: { part: ITEM_PART_SELECT } } },
  });
  await logActivity({ entityType: "order", entityId: order.id, entityName: `Order ${order.supplier}`, action: "created" });
  return NextResponse.json(order, { status: 201 });
}
