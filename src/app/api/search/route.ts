import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface SearchResult {
  key: string;
  type: "project" | "part" | "operation" | "file" | "issue" | "archive";
  title: string;
  subtitle: string;
  label: string;
  url: string;
  openInNewTab: boolean;
}

export interface SearchGroup {
  label: string;
  results: SearchResult[];
}

// GET /api/search?q=query
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const mode = "insensitive" as const;
  const take = 5;

  const [tools, archivedTools, parts, operations, attachments, issues] =
    await Promise.all([
      // Active projects
      prisma.tool.findMany({
        where: { archived: false, projectName: { contains: q, mode } },
        select: { id: true, projectName: true, status: true },
        take,
      }),
      // Archived projects
      prisma.tool.findMany({
        where: { archived: true, projectName: { contains: q, mode } },
        select: { id: true, projectName: true, status: true },
        take,
      }),
      // Parts
      prisma.part.findMany({
        where: { name: { contains: q, mode } },
        select: {
          id: true,
          name: true,
          toolId: true,
          tool: { select: { projectName: true } },
          section: { select: { name: true } },
        },
        take,
      }),
      // Operations
      prisma.operation.findMany({
        where: { name: { contains: q, mode } },
        select: {
          id: true,
          name: true,
          status: true,
          partId: true,
          part: {
            select: {
              id: true,
              toolId: true,
              tool: { select: { projectName: true } },
            },
          },
        },
        take,
      }),
      // Files
      prisma.attachment.findMany({
        where: { name: { contains: q, mode } },
        select: {
          id: true,
          name: true,
          type: true,
          url: true,
          partId: true,
          part: { select: { toolId: true } },
        },
        take,
      }),
      // Issues
      prisma.issue.findMany({
        where: {
          OR: [
            { title: { contains: q, mode } },
            { description: { contains: q, mode } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          tool: { select: { projectName: true } },
        },
        take,
      }),
    ]);

  const groups: SearchGroup[] = [];

  if (tools.length > 0) {
    groups.push({
      label: "Projects",
      results: tools.map((t) => ({
        key: `project-${t.id}`,
        type: "project",
        title: t.projectName,
        subtitle: t.status,
        label: "PROJECT",
        url: `/tools/${t.id}`,
        openInNewTab: false,
      })),
    });
  }

  if (parts.length > 0) {
    groups.push({
      label: "Parts",
      results: parts.map((p) => ({
        key: `part-${p.id}`,
        type: "part",
        title: p.name,
        subtitle: p.tool.projectName + (p.section ? ` · ${p.section.name}` : ""),
        label: "PART",
        url: `/tools/${p.toolId}/parts/${p.id}`,
        openInNewTab: false,
      })),
    });
  }

  if (operations.length > 0) {
    groups.push({
      label: "Operations",
      results: operations.map((op) => ({
        key: `op-${op.id}`,
        type: "operation",
        title: op.name,
        subtitle: op.part.tool.projectName + " · " + op.status,
        label: "OPERATION",
        url: `/tools/${op.part.toolId}/parts/${op.part.id}#operations`,
        openInNewTab: false,
      })),
    });
  }

  if (attachments.length > 0) {
    groups.push({
      label: "Files",
      results: attachments.map((a) => ({
        key: `file-${a.id}`,
        type: "file",
        title: a.name,
        subtitle: a.type + (a.part?.toolId ? "" : ""),
        label: "FILE",
        url: a.url ?? "#",
        openInNewTab: true,
      })),
    });
  }

  if (issues.length > 0) {
    groups.push({
      label: "Issues",
      results: issues.map((i) => ({
        key: `issue-${i.id}`,
        type: "issue",
        title: i.title,
        subtitle: i.tool.projectName + " · " + i.priority,
        label: "ISSUE",
        url: `/issues?selected=${i.id}`,
        openInNewTab: false,
      })),
    });
  }

  if (archivedTools.length > 0) {
    groups.push({
      label: "Archive",
      results: archivedTools.map((t) => ({
        key: `archive-${t.id}`,
        type: "archive",
        title: t.projectName,
        subtitle: "Archived · " + t.status,
        label: "ARCHIVED",
        url: `/tools/${t.id}`,
        openInNewTab: false,
      })),
    });
  }

  return NextResponse.json({ groups });
}
