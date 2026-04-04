import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const toolGroups = await prisma.toolGroup.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(toolGroups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const toolGroup = await prisma.toolGroup.create({
    data: { name: body.name.trim(), notes: body.notes ?? null },
  });
  return NextResponse.json(toolGroup, { status: 201 });
}
