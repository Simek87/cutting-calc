import { prisma } from "@/lib/prisma";
import { IssuesClient } from "./IssuesClient";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; selected?: string }>;
}) {
  const { filter, selected } = await searchParams;

  const [issues, tools] = await Promise.all([
    prisma.issue.findMany({
      include: {
        tool: { select: { id: true, projectName: true } },
        part: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tool.findMany({
      where: { archived: false },
      select: {
        id: true,
        projectName: true,
        parts: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { projectName: "asc" },
    }),
  ]);

  return (
    <IssuesClient
      issues={JSON.parse(JSON.stringify(issues))}
      tools={JSON.parse(JSON.stringify(tools))}
      initialFilter={filter ?? ""}
      initialSelected={selected ?? ""}
    />
  );
}
