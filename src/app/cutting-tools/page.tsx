import { prisma } from "@/lib/prisma";
import { CuttingToolsClient } from "./CuttingToolsClient";
import { CuttingToolMachine } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// ── Starter tools ────────────────────────────────────────────────────────────
// Functionally equivalent to upsert: findFirst by name → create or full-update.
// (Prisma native upsert requires @unique on name; we avoid a schema migration.)

interface StarterTool {
  name:         string;
  machine:      CuttingToolMachine;
  toolType:     string;
  diameter:     number;
  cornerRadius: number;
  flutes:       number;
  vc?:          number;
  rpm?:         number;
  fz?:          number;
  ap?:          number | null;
  ae?:          number | null;
}

const STARTER_TOOLS: StarterTool[] = [
  { name: "50R2",   machine: "Hurco",   toolType: "FACE_MILL", diameter: 50, cornerRadius: 2,   flutes: 3, vc: 600, rpm: 6000, fz: 0.15, ap: 2.0,  ae: 25.0 },
  { name: "32R0.8", machine: "Danusys", toolType: "FACE_MILL", diameter: 32, cornerRadius: 0.8, flutes: 3, vc: 424, rpm: 4250, fz: 0.15, ap: null, ae: null },
];

async function seedStarterTools() {
  // One-time cleanup of legacy records — deleteMany on missing names is a no-op
  await prisma.cuttingTool.deleteMany({
    where: { name: { in: ["50r2", "Face Mill D32 R0.8 Z4", "Face Mill D50 R2 Z3"] } },
  });

  for (const tool of STARTER_TOOLS) {
    const existing = await prisma.cuttingTool.findFirst({ where: { name: tool.name } });
    if (!existing) {
      await prisma.cuttingTool.create({ data: tool });
    } else {
      // Always sync all fields so stale data (e.g. wrong cornerRadius) is corrected
      await prisma.cuttingTool.update({
        where: { id: existing.id },
        data: {
          machine:      tool.machine,
          toolType:     tool.toolType,
          diameter:     tool.diameter,
          cornerRadius: tool.cornerRadius,
          flutes:       tool.flutes,
          vc:           tool.vc  ?? null,
          rpm:          tool.rpm ?? null,
          fz:           tool.fz  ?? null,
          ap:           tool.ap  ?? null,
          ae:           tool.ae  ?? null,
        },
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
