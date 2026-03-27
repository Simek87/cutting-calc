import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ITEM_PART_SELECT = {
  select: {
    id: true, name: true,
    tool: { select: { id: true, projectName: true } },
    section: { select: { id: true, name: true } },
  },
};

// POST /api/orders/[id]/items — add a part to an existing order (upsert by partId)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!body.partId) return NextResponse.json({ error: "partId required" }, { status: 400 });

  // Avoid duplicate items for the same part
  const existing = await prisma.orderItem.findFirst({ where: { orderId: id, partId: body.partId } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const item = await prisma.orderItem.create({
    data: { orderId: id, partId: body.partId, qty: body.qty ?? 1, notes: body.notes ?? null },
    include: { part: ITEM_PART_SELECT },
  });
  return NextResponse.json(item, { status: 201 });
}

// DELETE /api/orders/[id]/items/[itemId] lives at the [itemId] sub-route,
// but for simplicity accept DELETE with body.itemId here too.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  await prisma.orderItem.deleteMany({ where: { id: body.itemId, orderId: id } });
  return new NextResponse(null, { status: 204 });
}
