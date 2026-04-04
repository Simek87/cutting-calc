import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/todo/carryover
// Body: { prevWeekStart: string, currentWeekStart: string }
// Copies all incomplete items from prev week that don't already exist in current week.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prevWeekStart, currentWeekStart } = body;

  if (!prevWeekStart || !currentWeekStart) {
    return NextResponse.json({ error: "prevWeekStart and currentWeekStart required" }, { status: 400 });
  }

  const prev = new Date(prevWeekStart);
  const curr = new Date(currentWeekStart);
  const prevEnd = new Date(prev);
  prevEnd.setDate(prevEnd.getDate() + 7);

  // Check if current week already has any items (carryover already done)
  const existingCount = await prisma.todoItem.count({
    where: { weekStart: curr },
  });
  if (existingCount > 0) {
    return NextResponse.json({ skipped: true, reason: "Current week already has items" });
  }

  // Get incomplete items from previous week
  const incomplete = await prisma.todoItem.findMany({
    where: {
      weekStart: { gte: prev, lt: prevEnd },
      done: false,
    },
    orderBy: [{ column: "asc" }, { order: "asc" }],
  });

  if (incomplete.length === 0) {
    return NextResponse.json({ carried: 0 });
  }

  const created = await prisma.$transaction(
    incomplete.map((item) =>
      prisma.todoItem.create({
        data: {
          column: item.column,
          text: item.text,
          subtext: item.subtext,
          weekStart: curr,
          linkedPartId: item.linkedPartId,
          linkedOperationId: item.linkedOperationId,
          order: item.order,
        },
      })
    )
  );

  return NextResponse.json({ carried: created.length });
}
