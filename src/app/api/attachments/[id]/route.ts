import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (attachment?.url) {
    try { await del(attachment.url); } catch { /* blob may already be gone */ }
  }
  await prisma.attachment.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
