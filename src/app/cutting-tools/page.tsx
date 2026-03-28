import { prisma } from "@/lib/prisma";
import { CuttingToolsClient } from "./CuttingToolsClient";
import { CuttingToolMachine } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// ── Starter tools — created once if absent, corrected if data is wrong ───────

const STARTER_TOOLS = [
  {
    name:         "Face Mill D50 R2 Z3",
    machine:      "Both" as CuttingToolMachine,
    toolType:     "FACE_MILL",
    diameter:     50,
    cornerRadius: 2,
    flutes:       3,
  },
  {
    name:         "Face Mill D32 R0.8 Z4",
    machine:      "Both" as CuttingToolMachine,
    toolType:     "FACE_MILL",
    diameter:     32,
    cornerRadius: 0.8,
    flutes:       4,
  },
] as const;

async function seedStarterTools() {
  for (const t of STARTER_TOOLS) {
    const existing = await prisma.cuttingTool.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.cuttingTool.create({ data: t });
    } else if (
      existing.cornerRadius !== t.cornerRadius ||
      existing.diameter     !== t.diameter
    ) {
      // Fix stale / incorrectly-entered data (e.g. cornerRadius stored as D/2)
      await prisma.cuttingTool.update({
        where: { id: existing.id },
        data:  { cornerRadius: t.cornerRadius, diameter: t.diameter },
      });
    }
  }
}

export default async function CuttingToolsPage() {
  await seedStarterTools();

  const tools = await prisma.cuttingTool.findMany({
    orderBy: [{ machine: "asc" }, { name: "asc" }],
  });

  const serialized = tools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return <CuttingToolsClient initialTools={JSON.parse(JSON.stringify(serialized))} />;
}
