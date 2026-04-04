import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TodoColumn } from "@/generated/prisma/client";

// PATCH /api/todo/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { text, subtext, done, order, column } = body;

  const data: Record<string, unknown> = {};
  if (text !== undefined) data.text = text;
  if (subtext !== undefined) data.subtext = subtext;
  if (done !== undefined) {
    data.done = done;
    data.doneAt = done ? new Date() : null;
  }
  if (order !== undefined) data.order = order;
  if (column !== undefined) data.column = column as TodoColumn;

  const item = await prisma.todoItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

// DELETE /api/todo/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.todoItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
