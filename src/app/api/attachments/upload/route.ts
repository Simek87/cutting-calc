import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { AttachmentType } from "@/generated/prisma/client";

function detectType(filename: string): AttachmentType {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "dxf") return "DXF";
  if (ext === "pdf") return "PDF";
  if (ext === "stp" || ext === "step") return "STEP";
  return "DXF";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const partId = formData.get("partId") as string | null;
  const familyId = formData.get("familyId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const type = detectType(file.name);

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const attachment = await prisma.attachment.create({
    data: {
      name: file.name,
      type,
      url: blob.url,
      partId: partId ?? null,
      familyId: familyId ?? null,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
