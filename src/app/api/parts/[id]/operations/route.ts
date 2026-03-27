import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OperationType, OperationStatus } from "@/generated/prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.operation.count({ where: { partId: id } });

  const operation = await prisma.operation.create({
    data: {
      partId: id,
      name: body.name,
      order: body.order ?? existing + 1,
      type: (body.type as OperationType) ?? "internal",
      status: (body.status as OperationStatus) ?? "NotStarted",
      machine: body.machine ?? null,
      supplier: body.supplier ?? null,
      estimatedTime: body.estimatedTime ?? null,
    },
  });
  return NextResponse.json(operation, { status: 201 });
}
