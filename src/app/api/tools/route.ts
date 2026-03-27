import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { ToolStatus } from "@/generated/prisma/client";

export async function GET() {
  const tools = await prisma.tool.findMany({
    orderBy: { createdAt: "desc" },
    include: { parts: { include: { operations: true } } },
  });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tool = await prisma.tool.create({
    data: {
      projectName: body.projectName,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: (body.status as ToolStatus) ?? "Management",
    },
  });
  await logActivity({ entityType: "tool", entityId: tool.id, entityName: tool.projectName, action: "created", toolId: tool.id });
  return NextResponse.json(tool, { status: 201 });
}
