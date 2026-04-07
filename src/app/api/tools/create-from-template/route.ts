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

  const activeSections = body.sections.filter((s) => s.parts.length > 0);

  const tool = await prisma.$transaction(async (tx) => {
    // ── Q1: Create tool ────────────────────────────────────────────────────
    const newTool = await tx.tool.create({
      data: {
        projectName: body.projectName.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: (body.status as ToolStatus) ?? ToolStatus.Management,
        projectType: body.projectType === "Conversion" ? ProjectType.Conversion : ProjectType.NewTool,
        machineTarget: body.machineTarget || "KMD 78.2",
      },
    });

    if (activeSections.length === 0) return newTool;

    // ── Q2: Create all sections in one insert ──────────────────────────────
    await tx.section.createMany({
      data: activeSections.map((s) => ({ name: s.code, toolId: newTool.id })),
    });

    // ── Q3: Fetch section IDs ──────────────────────────────────────────────
    const createdSections = await tx.section.findMany({
      where: { toolId: newTool.id },
      select: { id: true, name: true },
    });
    const sectionMap = new Map(createdSections.map((s) => [s.name, s.id]));

    // ── Q4: Create all parts in one insert ────────────────────────────────
    await tx.part.createMany({
      data: activeSections.flatMap((s) =>
        s.parts.map((p) => ({
          toolId: newTool.id,
          sectionId: sectionMap.get(s.code)!,
          name: p.name,
          quantity: p.qty,
          isStandard: p.isStandard,
          conversionStatus:
            body.projectType === "Conversion"
              ? (p.conversionStatus as ConversionStatus) ?? ConversionStatus.New
              : ConversionStatus.New,
        }))
      ),
    });

    // ── Q5: Fetch part IDs ─────────────────────────────────────────────────
    const createdParts = await tx.part.findMany({
      where: { toolId: newTool.id },
      select: { id: true, name: true, sectionId: true },
    });
    // Key: "sectionId:partName" — unique within a tool
    const partMap = new Map(
      createdParts.map((p) => [`${p.sectionId}:${p.name}`, p.id])
    );

    // ── Q6: Create all operations in one insert ────────────────────────────
    const allOps = activeSections.flatMap((s) => {
      const sectionId = sectionMap.get(s.code)!;
      return s.parts.flatMap((partData) => {
        const ops = OP_PRESETS[partData.opPreset] ?? [];
        const partId = partMap.get(`${sectionId}:${partData.name}`)!;
        return ops.map((op) => ({
          partId,
          name: op.name,
          type: op.type,
          order: op.order,
          dependsOnPrevious: op.dependsOnPrevious ?? true,
          status: getInitialOpStatus(op.type),
        }));
      });
    });

    if (allOps.length > 0) {
      await tx.operation.createMany({ data: allOps });
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
