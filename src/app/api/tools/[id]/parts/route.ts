import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PartType, OperationType } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { OPERATION_TEMPLATES } from "@/lib/operation-templates";

const FALLBACK_OPERATIONS = OPERATION_TEMPLATES.find((t) => t.id === "milled")!.operations;

// GET /api/tools/[id]/parts — lightweight list for part pickers
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parts = await prisma.part.findMany({
    where: { toolId: id },
    select: { id: true, name: true, section: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(parts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const template = OPERATION_TEMPLATES.find((t) => t.id === body.template);
  const operations = template ? template.operations : FALLBACK_OPERATIONS;

  const part = await prisma.part.create({
    data: {
      toolId: id,
      sectionId: body.sectionId ?? null,
      name: body.name,
      type: (body.type as PartType) ?? "standard",
      quantity: body.quantity ?? 1,
      status: "NotOrdered",
      supplier: body.supplier ?? null,
      notes: body.notes ?? null,
      drawingRef: body.drawingRef ?? null,
      material: body.material ?? null,
      size: body.size ?? null,
      thickness: body.thickness ?? null,
      operations: {
        create: operations.map((op) => ({
          name: op.name,
          type: op.type as OperationType,
          order: op.order,
          status: "NotStarted",
          dependsOnPrevious: op.dependsOnPrevious ?? true,
        })),
      },
    },
    include: {
      operations: { orderBy: { order: "asc" } },
      outsourceJobs: true,
      attachments: true,
    },
  });

  await logActivity({
    entityType: "part",
    entityId: part.id,
    entityName: part.name,
    action: "created",
    toolId: id,
    partId: part.id,
  });

  return NextResponse.json(part, { status: 201 });
}
