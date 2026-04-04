import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttachmentType } from "@/generated/prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim() || !body.type) {
    return NextResponse.json({ error: "name and type required" }, { status: 400 });
  }
  const attachment = await prisma.attachment.create({
    data: {
      name: body.name.trim(),
      type: body.type as AttachmentType,
      filePath: body.filePath ?? null,
      url: body.url ?? null,
      partId: body.partId ?? null,
      toolGroupId: body.toolGroupId ?? body.familyId ?? null,
    },
  });
  return NextResponse.json(attachment, { status: 201 });
}
