import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const toolGroup = await prisma.toolGroup.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(toolGroup);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.toolGroup.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
