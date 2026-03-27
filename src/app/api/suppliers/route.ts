import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }
  const supplier = await prisma.supplier.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim(),
      notes: body.notes?.trim() || null,
      emailSubjectTemplate: body.emailSubjectTemplate?.trim() || null,
      emailBodyTemplate: body.emailBodyTemplate?.trim() || null,
    },
  });
  return NextResponse.json(supplier, { status: 201 });
}
