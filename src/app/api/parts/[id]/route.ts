import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// PartStatus import retained only for the legacy `status` write path below.
// Part.status is not derived from operations and should not be set by new callers.
import { PartStatus } from "@/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const part = await prisma.part.update({
    where: { id },
    data: {
      // @deprecated — Part.status is legacy; not derived from operations. Kept for backward compat only.
      ...(body.status && { status: body.status as PartStatus }),
      ...(body.supplier !== undefined && { supplier: body.supplier }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.drawingRef !== undefined && { drawingRef: body.drawingRef }),
      ...(body.sectionId !== undefined && { sectionId: body.sectionId }),
      ...(body.requiresLaser !== undefined && { requiresLaser: body.requiresLaser }),
      ...(body.material !== undefined && { material: body.material }),
      ...(body.thickness !== undefined && { thickness: body.thickness }),
      ...(body.size !== undefined && { size: body.size }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
    },
  });
  return NextResponse.json(part);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.part.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
