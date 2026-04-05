import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reference — all categories with entries, ordered
export async function GET() {
  const categories = await prisma.referenceCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      entries: { orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(categories);
}
