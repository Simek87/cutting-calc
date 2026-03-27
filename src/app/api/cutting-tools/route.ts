import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CuttingToolMachine } from "@/generated/prisma/client";

export async function GET() {
  const tools = await prisma.cuttingTool.findMany({
    orderBy: [{ machine: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tool = await prisma.cuttingTool.create({
    data: {
      name: body.name,
      machine: body.machine as CuttingToolMachine,
      toolType: body.toolType || null,
      diameter: Number(body.diameter),
      cornerRadius: body.cornerRadius != null && body.cornerRadius !== "" ? Number(body.cornerRadius) : null,
      flutes: Number(body.flutes),
      notes: body.notes || null,
      vc:   body.vc   != null && body.vc   !== "" ? Number(body.vc)   : null,
      rpm:  body.rpm  != null && body.rpm  !== "" ? Number(body.rpm)  : null,
      feed: body.feed != null && body.feed !== "" ? Number(body.feed) : null,
      fz:   body.fz   != null && body.fz   !== "" ? Number(body.fz)   : null,
      ap:   body.ap   != null && body.ap   !== "" ? Number(body.ap)   : null,
      ae:   body.ae   != null && body.ae   !== "" ? Number(body.ae)   : null,
      mrr:  body.mrr  != null && body.mrr  !== "" ? Number(body.mrr)  : null,
    },
  });
  return NextResponse.json(tool, { status: 201 });
}
