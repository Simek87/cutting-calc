import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { BatchDocument } from "@/lib/pdf/ProcessCard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: {
      id: true,
      projectName: true,
      parts: {
        include: {
          section: { select: { name: true } },
          operations: { orderBy: { order: "asc" } },
        },
        orderBy: [{ section: { name: "asc" } }, { name: "asc" }],
      },
    },
  });

  if (!tool) {
    return new Response("Tool not found", { status: 404 });
  }

  if (tool.parts.length === 0) {
    return new Response("No parts to export", { status: 404 });
  }

  const pdfParts = tool.parts.map((part) => ({
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
  }));

  const buffer = await renderToBuffer(
    React.createElement(BatchDocument, {
      parts: pdfParts,
      tool: { id: tool.id, projectName: tool.projectName },
    }) as React.ReactElement<DocumentProps>
  );

  const filename = `${tool.projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}-process-cards.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
