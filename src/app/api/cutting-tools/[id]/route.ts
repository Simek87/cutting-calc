import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CuttingToolMachine } from "@/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const numOrNull = (v: unknown) =>
    v != null && v !== "" ? Number(v) : null;

  const tool = await prisma.cuttingTool.update({
    where: { id },
    data: {
      ...(body.name      !== undefined && { name:         body.name }),
      ...(body.machine   !== undefined && { machine:      body.machine as CuttingToolMachine }),
      ...(body.toolType  !== undefined && { toolType:     body.toolType || null }),
      ...(body.diameter  !== undefined && { diameter:     Number(body.diameter) }),
      ...(body.cornerRadius !== undefined && { cornerRadius: numOrNull(body.cornerRadius) }),
      ...(body.flutes    !== undefined && { flutes:       Number(body.flutes) }),
      ...(body.notes     !== undefined && { notes:        body.notes || null }),
      ...(body.vc   !== undefined && { vc:   numOrNull(body.vc) }),
      ...(body.rpm  !== undefined && { rpm:  numOrNull(body.rpm) }),
      ...(body.feed !== undefined && { feed: numOrNull(body.feed) }),
      ...(body.fz   !== undefined && { fz:   numOrNull(body.fz) }),
      ...(body.ap   !== undefined && { ap:   numOrNull(body.ap) }),
      ...(body.ae   !== undefined && { ae:   numOrNull(body.ae) }),
      ...(body.mrr  !== undefined && { mrr:  numOrNull(body.mrr) }),
    },
  });
  return NextResponse.json(tool);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.cuttingTool.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
