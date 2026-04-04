import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { SinglePartDocument } from "@/lib/pdf/ProcessCard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  const { partId } = await params;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      section: { select: { name: true } },
      operations: { orderBy: { order: "asc" } },
      tool: { select: { id: true, projectName: true } },
    },
  });

  if (!part) {
    return new Response("Part not found", { status: 404 });
  }

  const pdfPart = {
    id: part.id,
    name: part.name,
    material: part.material,
    materialType: part.materialType as string | null,
    dimX: part.dimX,
    dimY: part.dimY,
    dimZ: part.dimZ,
    revModel: part.revModel,
    revProgram: part.revProgram,
    revProgramNote: part.revProgramNote,
    notes: part.notes ?? null,
    section: part.section,
    operations: part.operations.map((op) => ({
      order: op.order,
      name: op.name,
      type: op.type as string,
      status: op.status as string,
      changedBy: op.changedBy,
      statusChangedAt: op.statusChangedAt?.toISOString() ?? null,
      estimatedTime: op.estimatedTime,
    })),
  };

  const buffer = await renderToBuffer(
    React.createElement(SinglePartDocument, {
      part: pdfPart,
      tool: { id: part.tool.id, projectName: part.tool.projectName },
    }) as React.ReactElement<DocumentProps>
  );

  const filename = `${part.name.replace(/[^a-zA-Z0-9-_]/g, "_")}-process-card.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
