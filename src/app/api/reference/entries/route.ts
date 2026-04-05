import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/reference/entries
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.categoryId || !body.label?.trim() || !body.value?.trim()) {
    return NextResponse.json({ error: "categoryId, label and value required" }, { status: 400 });
  }

  const maxOrder = await prisma.referenceEntry.aggregate({
    where: { categoryId: body.categoryId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const entry = await prisma.referenceEntry.create({
    data: {
      categoryId: body.categoryId,
      label: body.label.trim(),
      value: body.value.trim(),
      unit: body.unit?.trim() || null,
      notes: body.notes?.trim() || null,
      order: nextOrder,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
