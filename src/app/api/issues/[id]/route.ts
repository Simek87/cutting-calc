import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IssueStatus, IssuePriority } from "@/generated/prisma/client";

// PATCH /api/issues/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, partId } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (priority !== undefined) data.priority = priority as IssuePriority;
  if (partId !== undefined) data.partId = partId || null;

  if (status !== undefined) {
    data.status = status as IssueStatus;
    if (status === "Closed") {
      data.closedAt = new Date();
    } else {
      data.closedAt = null;
    }
  }

  const issue = await prisma.issue.update({
    where: { id },
    data,
    include: {
      tool: { select: { id: true, projectName: true } },
      part: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(issue);
}

// DELETE /api/issues/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.issue.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
