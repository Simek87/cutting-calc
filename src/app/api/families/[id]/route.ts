import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const family = await prisma.family.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(family);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.family.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
