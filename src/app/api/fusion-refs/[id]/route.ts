import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/fusion-refs/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string | null> = {};
  if (body.date  !== undefined) data.date  = body.date.trim();
  if (body.path  !== undefined) data.path  = body.path.trim();
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  const ref = await prisma.fusionRef.update({ where: { id }, data });
  return NextResponse.json(ref);
}

// DELETE /api/fusion-refs/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.fusionRef.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
