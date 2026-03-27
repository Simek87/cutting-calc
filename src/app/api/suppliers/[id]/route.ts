import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.email !== undefined && { email: body.email.trim() }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.emailSubjectTemplate !== undefined && { emailSubjectTemplate: body.emailSubjectTemplate?.trim() || null }),
      ...(body.emailBodyTemplate !== undefined && { emailBodyTemplate: body.emailBodyTemplate?.trim() || null }),
    },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.supplier.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
