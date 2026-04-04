import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/notes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, content, category, tags, pinned } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (category !== undefined) data.category = category?.trim() || null;
  if (tags !== undefined) data.tags = tags?.trim() || null;
  if (pinned !== undefined) data.pinned = pinned;

  const note = await prisma.note.update({ where: { id }, data });
  return NextResponse.json(note);
}

// DELETE /api/notes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
