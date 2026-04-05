import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/reference/entries/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.label !== undefined) data.label = body.label;
  if (body.value !== undefined) data.value = body.value;
  if (body.unit !== undefined) data.unit = body.unit || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.order !== undefined) data.order = body.order;

  const entry = await prisma.referenceEntry.update({ where: { id }, data });
  return NextResponse.json(entry);
}

// DELETE /api/reference/entries/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.referenceEntry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
