import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/reference/categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.icon !== undefined) data.icon = body.icon || null;
  if (body.order !== undefined) data.order = body.order;

  const category = await prisma.referenceCategory.update({ where: { id }, data });
  return NextResponse.json(category);
}

// DELETE /api/reference/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.referenceCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
