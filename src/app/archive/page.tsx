import { prisma } from "@/lib/prisma";
import { ArchiveClient } from "./ArchiveClient";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const tools = await prisma.tool.findMany({
    where: { archived: true },
    orderBy: { archivedAt: "desc" },
    include: {
      sections: { select: { id: true, name: true } },
      _count: { select: { parts: true } },
    },
  });

  const data = tools.map((t) => ({
    id: t.id,
    projectName: t.projectName,
    projectType: t.projectType as string,
    status: t.status as string,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    sections: t.sections.map((s) => s.name),
    partsCount: t._count.parts,
  }));

  return <ArchiveClient tools={JSON.parse(JSON.stringify(data))} />;
}
