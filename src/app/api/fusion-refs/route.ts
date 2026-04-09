import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/fusion-refs?section=&q=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const section = searchParams.get("section") ?? undefined;
  const q = searchParams.get("q")?.toLowerCase() ?? undefined;

  const refs = await prisma.fusionRef.findMany({
    where: {
      ...(section ? { section } : {}),
      ...(q
        ? {
            OR: [
              { path: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
              { section: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(refs);
}

// POST /api/fusion-refs
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.section?.trim() || !body.date?.trim() || !body.path?.trim()) {
    return NextResponse.json(
      { error: "section, date and path are required" },
      { status: 400 }
    );
  }

  const ref = await prisma.fusionRef.create({
    data: {
      section: body.section.trim(),
      date: body.date.trim(),
      path: body.path.trim(),
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json(ref, { status: 201 });
}
