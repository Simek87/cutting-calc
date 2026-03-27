import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const families = await prisma.family.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(families);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const family = await prisma.family.create({
    data: { name: body.name.trim(), notes: body.notes ?? null },
  });
  return NextResponse.json(family, { status: 201 });
}
