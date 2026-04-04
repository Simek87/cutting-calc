import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IssueStatus, IssuePriority } from "@/generated/prisma/client";

// GET /api/issues?toolId=...&status=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toolId = searchParams.get("toolId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (toolId) where.toolId = toolId;
  if (status) where.status = status as IssueStatus;

  const issues = await prisma.issue.findMany({
    where,
    include: {
      tool: { select: { id: true, projectName: true } },
      part: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(issues);
}

// POST /api/issues
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, toolId, partId, priority, status } = body;

  if (!title?.trim() || !toolId) {
    return NextResponse.json({ error: "title and toolId required" }, { status: 400 });
  }

  const issue = await prisma.issue.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      toolId,
      partId: partId || null,
      priority: (priority as IssuePriority) ?? "Medium",
      status: (status as IssueStatus) ?? "Open",
    },
    include: {
      tool: { select: { id: true, projectName: true } },
      part: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(issue, { status: 201 });
}
