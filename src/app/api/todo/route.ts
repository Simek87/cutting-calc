import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TodoColumn } from "@/generated/prisma/client";

// GET /api/todo?weekStart=2026-04-07
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStartParam = searchParams.get("weekStart");

  if (!weekStartParam) {
    return NextResponse.json({ error: "weekStart required" }, { status: 400 });
  }

  const weekStart = new Date(weekStartParam);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const items = await prisma.todoItem.findMany({
    where: { weekStart: { gte: weekStart, lt: weekEnd } },
    orderBy: [{ column: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
}

// POST /api/todo
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { column, text, subtext, weekStart, linkedPartId, linkedOperationId, order } = body;

  if (!column || !text || !weekStart) {
    return NextResponse.json({ error: "column, text, weekStart required" }, { status: 400 });
  }

  const item = await prisma.todoItem.create({
    data: {
      column: column as TodoColumn,
      text,
      subtext: subtext ?? null,
      weekStart: new Date(weekStart),
      linkedPartId: linkedPartId ?? null,
      linkedOperationId: linkedOperationId ?? null,
      order: order ?? 0,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
