import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { ToolStatus } from "@/generated/prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      parts: {
        include: { operations: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tool);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const prev = await prisma.tool.findUnique({ where: { id }, select: { status: true, projectName: true } });
  const tool = await prisma.tool.update({
    where: { id },
    data: {
      ...(body.projectName && { projectName: body.projectName }),
      ...(body.status && { status: body.status as ToolStatus }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.toolGroupId !== undefined && { toolGroupId: body.toolGroupId }),
      ...(body.projectType !== undefined && { projectType: body.projectType }),
      ...(body.machineTarget !== undefined && { machineTarget: body.machineTarget ?? null }),
      ...(body.archived !== undefined && {
        archived: body.archived,
        archivedAt: body.archived ? new Date() : null,
      }),
    },
  });
  if (body.status && prev?.status !== body.status) {
    await logActivity({ entityType: "tool", entityId: id, entityName: tool.projectName, action: "status_changed", detail: `${prev?.status} → ${body.status}`, toolId: id });
  }
  return NextResponse.json(tool);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id }, select: { projectName: true } });
  await prisma.tool.delete({ where: { id } });
  if (tool) await logActivity({ entityType: "tool", entityId: id, entityName: tool.projectName, action: "deleted", toolId: id });
  return new NextResponse(null, { status: 204 });
}
