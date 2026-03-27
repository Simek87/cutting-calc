import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim() || !body.toolId) {
    return NextResponse.json({ error: "name and toolId required" }, { status: 400 });
  }
  const section = await prisma.section.create({
    data: { name: body.name.trim(), toolId: body.toolId },
  });
  return NextResponse.json(section, { status: 201 });
}
