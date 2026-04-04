"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface ArchivedTool {
  id: string;
  projectName: string;
  projectType: string;
  status: string;
  archivedAt: string | null;
  sections: string[];
  partsCount: number;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  surface2: "#1a1d20",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function toSectionCode(name: string): string {
  const MAP: Record<string, string> = {
    MLD: "MLD", MOULDING: "MLD", MOULD: "MLD",
    PLG: "PLG", "PLUG ASSIST": "PLG", PLUG: "PLG",
    CUT: "CUT", CUTTING: "CUT", CUTTER: "CUT",
    AVL: "AVL", ANVIL: "AVL",
    PBX: "PBX", "PRESSURE BOX": "PBX", PNP: "PBX", PUSHER: "PBX",
  };
  return MAP[name.trim().toUpperCase()] ?? name.toUpperCase().slice(0, 3);
}

const SECTION_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  MLD: { bg: "rgba(59,130,246,0.15)",  text: "#93c5fd", border: "rgba(59,130,246,0.35)" },
  PLG: { bg: "rgba(168,85,247,0.15)", text: "#c4b5fd", border: "rgba(168,85,247,0.35)" },
  CUT: { bg: "rgba(239,68,68,0.15)",  text: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  AVL: { bg: "rgba(139,92,246,0.15)", text: "#ddd6fe", border: "rgba(139,92,246,0.35)" },
  PBX: { bg: "rgba(34,197,94,0.15)",  text: "#86efac", border: "rgba(34,197,94,0.35)" },
};

function SectionChip({ name }: { name: string }) {
  const code = toSectionCode(name);
  const s = SECTION_STYLE[code] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" };
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-medium leading-none"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: "var(--font-jetbrains-mono)" }}
    >
      {code}
    </span>
  );
}

const PROJECT_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  NewTool:    { bg: "rgba(34,197,94,0.15)",  text: "#86efac" },
  Conversion: { bg: "rgba(232,160,32,0.15)", text: "#fbbf24" },
  RnD:        { bg: "rgba(59,130,246,0.15)", text: "#93c5fd" },
  Custom:     { bg: "rgba(168,85,247,0.15)", text: "#c4b5fd" },
};

function ProjectTypeBadge({ type }: { type: string }) {
  const s = PROJECT_TYPE_STYLE[type] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
      {type}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Main component ─────────────────────────────────────────────────────────

export function ArchiveClient({ tools: initialTools }: { tools: ArchivedTool[] }) {
  const router = useRouter();
  const [tools, setTools] = useState(initialTools);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = useCallback(async (tool: ArchivedTool) => {
    if (!confirm(`Restore "${tool.projectName}" to active projects?`)) return;
    setRestoringId(tool.id);
    await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    setTools((prev) => prev.filter((t) => t.id !== tool.id));
    setRestoringId(null);
    router.push("/");
  }, [router]);

  const filtered = tools.filter((t) => {
    if (!search.trim()) return true;
    return t.projectName.toLowerCase().includes(search.toLowerCase());
  });

  const sectionCodes = (names: string[]) => [...new Set(names.map(toSectionCode))];

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: C.bg, color: C.text }}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}
      >
        <h1 className="text-sm font-semibold" style={{ color: C.text }}>Archive</h1>

        <span
          className="text-xs px-2 py-0.5 rounded tabular-nums"
          style={{ backgroundColor: C.surface2, color: C.textMuted, border: `1px solid ${C.border}` }}
        >
          {tools.length} archived
        </span>

        <div className="flex-1" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived projects…"
          className="text-xs px-3 py-1.5 rounded outline-none w-52"
          style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-center py-16" style={{ color: C.textMuted }}>
            {tools.length === 0 ? "No archived projects." : "No projects match your search."}
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: C.bg }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["PROJECT", "TYPE", "SECTIONS", "PARTS", "ARCHIVED", ""].map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-2 text-xs font-medium whitespace-nowrap"
                    style={{ color: C.textMuted }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr
                  key={tool.id}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Project name — clickable */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/tools/${tool.id}`}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, fontWeight: 600 }}
                    >
                      {tool.projectName}
                    </Link>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <ProjectTypeBadge type={tool.projectType} />
                  </td>

                  {/* Sections */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {sectionCodes(tool.sections).length > 0 ? (
                        sectionCodes(tool.sections).map((c) => (
                          <SectionChip key={c} name={c} />
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: C.textMuted }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Parts count */}
                  <td className="px-4 py-3">
                    <span className="text-xs tabular-nums" style={{ color: C.textDim }}>
                      {tool.partsCount}
                    </span>
                  </td>

                  {/* Archived date */}
                  <td className="px-4 py-3">
                    <span className="text-xs tabular-nums" style={{ color: C.textDim }}>
                      {fmtDate(tool.archivedAt)}
                    </span>
                  </td>

                  {/* Restore */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(tool)}
                      disabled={restoringId === tool.id}
                      className="text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:opacity-80"
                      style={{ color: C.accent, border: `1px solid ${C.accentBorder}`, backgroundColor: C.accentDim }}
                    >
                      {restoringId === tool.id ? "Restoring…" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
