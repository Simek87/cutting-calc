import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { OP_PRESETS, OpPreset } from "@/lib/operation-templates";
import { ToolStatus, ProjectType, ConversionStatus, OperationStatus } from "@/generated/prisma/client";

interface PartPayload {
  name: string;
  isStandard: boolean;
  opPreset: OpPreset;
  qty: number;
  conversionStatus: "New" | "Reuse" | "Rework";
}

interface SectionPayload {
  code: string;
  parts: PartPayload[];
}

interface CreateFromTemplateBody {
  projectName: string;
  projectType: "NewTool" | "Conversion";
  cavities: number;
  dueDate: string | null;
  machineTarget: string;
  status: string;
  sections: SectionPayload[];
}

function getInitialOpStatus(type: string): OperationStatus {
  if (type === "procurement") return OperationStatus.NotOrdered;
  if (type === "outsource") return OperationStatus.Pending;
  return OperationStatus.NotStarted;
}

export async function POST(req: NextRequest) {
  const body: CreateFromTemplateBody = await req.json();

  if (!body.projectName?.trim()) {
    return NextResponse.json({ error: "projectName is required" }, { status: 400 });
  }

  const tool = await prisma.$transaction(async (tx) => {
    // 1. Create the tool
    const newTool = await tx.tool.create({
      data: {
        projectName: body.projectName.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: (body.status as ToolStatus) ?? ToolStatus.Management,
        projectType: body.projectType === "Conversion" ? ProjectType.Conversion : ProjectType.NewTool,
        machineTarget: body.machineTarget || "KMD 78.2",
      },
    });

    // 2. Create sections and parts
    for (const sectionData of body.sections) {
      if (sectionData.parts.length === 0) continue;

      const section = await tx.section.create({
        data: { name: sectionData.code, toolId: newTool.id },
      });

      for (const partData of sectionData.parts) {
        const ops = OP_PRESETS[partData.opPreset] ?? [];

        await tx.part.create({
          data: {
            toolId: newTool.id,
            sectionId: section.id,
            name: partData.name,
            quantity: partData.qty,
            isStandard: partData.isStandard,
            conversionStatus:
              body.projectType === "Conversion"
                ? (partData.conversionStatus as ConversionStatus) ?? ConversionStatus.New
                : ConversionStatus.New,
            operations: {
              create: ops.map((op) => ({
                name: op.name,
                type: op.type,
                order: op.order,
                dependsOnPrevious: op.dependsOnPrevious ?? true,
                status: getInitialOpStatus(op.type),
              })),
            },
          },
        });
      }
    }

    return newTool;
  });

  await logActivity({
    entityType: "tool",
    entityId: tool.id,
    entityName: tool.projectName,
    action: "created",
    toolId: tool.id,
  });

  return NextResponse.json({ id: tool.id }, { status: 201 });
}
