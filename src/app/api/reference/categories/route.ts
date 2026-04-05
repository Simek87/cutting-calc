import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/reference/categories
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const maxOrder = await prisma.referenceCategory.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const category = await prisma.referenceCategory.create({
    data: {
      name: body.name.trim(),
      icon: body.icon?.trim() || null,
      order: nextOrder,
    },
    include: { entries: true },
  });
  return NextResponse.json(category, { status: 201 });
}
