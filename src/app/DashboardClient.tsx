"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  generateMaterialOrderMailto,
  generateExternalOpMailto,
  inferOutsourceEmailType,
  findSupplierByCategory,
} from "@/lib/email";

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  activeProjects: number;
  opsInProgress: number;
  awaitingMaterial: number;
  openIssues: number;
}

interface PartOp {
  id: string;
  name: string;
  order: number;
  status: string;
  type: string;
  estimatedTime: number | null;
}

interface PartAttachment {
  id: string;
  name: string;
  type: string;
  url: string | null;
}

interface DashboardPart {
  id: string;
  name: string;
  sectionName: string | null;
  material: string | null;
  materialType: string | null;
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  revModel: number;
  revProgram: number;
  revProgramNote: string | null;
  operations: PartOp[];
  attachments: PartAttachment[];
}

interface DashboardTool {
  id: string;
  projectName: string;
  status: string;
  projectType: string;
  dueDate: string | null;
  machineTarget: string | null;
  sections: string[];
  progress: number;
  currentOperation: string | null;
  currentOpType: string | null;
  partsCount: number;
  parts: DashboardPart[];
}

interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  detail: string | null;
  toolId: string | null;
  partId: string | null;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  category: string;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  surfaceHover: "#1c2024",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

// ── Section colours ────────────────────────────────────────────────────────

const SECTION_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  MLD: { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", border: "rgba(59,130,246,0.35)" },
  PLG: { bg: "rgba(168,85,247,0.15)", text: "#c4b5fd", border: "rgba(168,85,247,0.35)" },
  CUT: { bg: "rgba(239,68,68,0.15)", text: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  AVL: { bg: "rgba(139,92,246,0.15)", text: "#ddd6fe", border: "rgba(139,92,246,0.35)" },
  PBX: { bg: "rgba(34,197,94,0.15)", text: "#86efac", border: "rgba(34,197,94,0.35)" },
};

const SECTION_CODES = ["MLD", "PLG", "CUT", "AVL", "PBX"] as const;
type SectionCode = (typeof SECTION_CODES)[number];

/** Normalise a stored section name to a short code for matching the filter chips. */
function toSectionCode(name: string): string {
  const n = name.trim().toUpperCase();
  const MAP: Record<string, string> = {
    MLD: "MLD", MOULDING: "MLD", MOULD: "MLD",
    PLG: "PLG", "PLUG ASSIST": "PLG", PLUG: "PLG",
    CUT: "CUT", CUTTING: "CUT", CUTTER: "CUT",
    AVL: "AVL", ANVIL: "AVL",
    PBX: "PBX", "PRESSURE BOX": "PBX", PNP: "PBX", PUSHER: "PBX",
  };
  return MAP[n] ?? n.slice(0, 3);
}

// ── Tool status colours ────────────────────────────────────────────────────

const TOOL_STATUS_STYLE: Record<string, { text: string; border: string }> = {
  Management: { text: "#9ca3af", border: "#374151" },
  CAD:        { text: "#93c5fd", border: "#1d4ed8" },
  CAM:        { text: "#c4b5fd", border: "#7c3aed" },
  Manufacturing: { text: "#fcd34d", border: "#b45309" },
  Toolmaking: { text: "#fdba74", border: "#c2410c" },
  Done:       { text: "#86efac", border: "#15803d" },
  Cancelled:  { text: "#6b7280", border: "#374151" },
};

const EXTERNAL_TYPES = new Set(["procurement", "outsource"]);

// ── Small components ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  warn = false,
  href,
}: {
  label: string;
  value: number;
  warn?: boolean;
  href?: string;
}) {
  const isWarn = warn && value > 0;
  const cardStyle = {
    backgroundColor: C.surface,
    border: `1px solid ${isWarn ? C.accent : C.border}`,
  };
  const inner = (
    <>
      <span
        className="text-2xl font-bold tabular-nums leading-none"
        style={{ color: isWarn ? C.accent : C.text, fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {value}
      </span>
      <span className="text-xs mt-1" style={{ color: C.textDim }}>
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-lg p-4 flex flex-col gap-1 select-none hover:opacity-80 transition-opacity"
        style={cardStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1 select-none" style={cardStyle}>
      {inner}
    </div>
  );
}

function SectionChip({ code }: { code: string }) {
  const s = SECTION_STYLE[code] ?? {
    bg: "rgba(107,114,128,0.15)",
    text: "#9ca3af",
    border: "rgba(107,114,128,0.3)",
  };
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-medium leading-none"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        fontFamily: "var(--font-jetbrains-mono)",
      }}
    >
      {code}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = TOOL_STATUS_STYLE[status] ?? { text: C.textDim, border: C.border };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
      style={{ color: s.text, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-14 h-1.5 rounded-full overflow-hidden flex-shrink-0"
        style={{ backgroundColor: C.border }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: value === 100 ? "#22c55e" : C.accent,
          }}
        />
      </div>
      <span
        className="text-xs tabular-nums w-8"
        style={{ color: C.textDim, fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {value}%
      </span>
    </div>
  );
}

function OpDot({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    Done: "#22c55e",
    Received: "#22c55e",
    InProgress: C.accent,
    Blocked: "#ef4444",
    NotStarted: C.border,
    Ready: "#3b82f6",
    Sent: "#818cf8",
    Ordered: "#a78bfa",
    NotOrdered: C.textMuted,
    Pending: C.textMuted,
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${status === "InProgress" ? "animate-pulse" : ""}`}
      style={{ backgroundColor: COLORS[status] ?? C.border }}
    />
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl"
      style={{ backgroundColor: "#22c55e", color: "#000" }}
    >
      {message}
    </div>
  );
}

// ── Material Order Modal ───────────────────────────────────────────────────

type MaterialPart = {
  partId: string;
  toolName: string;
  material: string | null;
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  materialType: string | null;
};

function MaterialOrderModal({
  suppliers,
  parts,
  onClose,
  onSent,
}: {
  suppliers: Supplier[];
  parts: MaterialPart[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");

  const handleSend = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    window.location.href = generateMaterialOrderMailto(parts, supplier?.email ?? "");
    onSent();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg w-full max-w-sm p-6"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: C.text }}>
          Material Order
        </h2>
        <p className="text-xs mb-4" style={{ color: C.textMuted }}>
          {parts.length} part{parts.length !== 1 ? "s" : ""} across{" "}
          {[...new Set(parts.map((p) => p.toolName))].length} project
          {[...new Set(parts.map((p) => p.toolName))].length !== 1 ? "s" : ""}
        </p>
        <div className="mb-4">
          <label className="block text-xs mb-1" style={{ color: C.textDim }}>
            Supplier
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded outline-none"
            style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded"
            style={{ color: C.textDim, border: `1px solid ${C.border}` }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 text-xs rounded font-medium"
            style={{ backgroundColor: C.accent, color: "#000" }}
          >
            Open in Outlook
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Project Modal ──────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ projectName: "", dueDate: "", status: "Management" });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const tool = await res.json();
      onCreated(tool.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg w-full max-w-sm p-6"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: C.text }}>
          New Project{" "}
          <span className="text-xs font-normal" style={{ color: C.textMuted }}>
            Ctrl+N
          </span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: C.textDim }}>
              Project Name *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="e.g. AFS700"
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{
                backgroundColor: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.textDim }}>
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{
                backgroundColor: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                colorScheme: "dark",
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs rounded font-medium disabled:opacity-50"
              style={{ backgroundColor: C.accent, color: "#000" }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Email helpers ──────────────────────────────────────────────────────────

function buildOpMailtoHref(
  op: { name: string; type: string; partName: string },
  projectName: string,
  suppliers: Supplier[]
): string {
  if (op.type === "outsource") {
    const emailType = inferOutsourceEmailType(op.name);
    const catMap: Record<string, string> = { gundrilling: "Gundrilling", laser: "Laser", waterjet: "Waterjet" };
    const supplier = findSupplierByCategory(suppliers, catMap[emailType] ?? "");
    return generateExternalOpMailto(emailType, {
      partId: op.partName,
      toolName: projectName,
      supplierEmail: supplier?.email ?? "",
    });
  }
  // procurement
  const supplier = findSupplierByCategory(suppliers, "Material");
  return generateMaterialOrderMailto(
    [{ partId: op.partName, toolName: projectName, material: null, dimX: null, dimY: null, dimZ: null, materialType: null }],
    supplier?.email ?? ""
  );
}

// ── Right Panel ────────────────────────────────────────────────────────────

type PanelTab = "OPS" | "MATERIAL" | "FILES" | "LOG";

function RightPanel({
  tool,
  activityLogs,
  suppliers,
  onClose,
  onEmailClick,
}: {
  tool: DashboardTool;
  activityLogs: ActivityLog[];
  suppliers: Supplier[];
  onClose: () => void;
  onEmailClick: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("OPS");

  const toolLogs = activityLogs.filter((l) => l.toolId === tool.id);
  const allOps = tool.parts.flatMap((p) =>
    p.operations.map((op) => ({ ...op, partName: p.name }))
  );
  const allFiles = tool.parts.flatMap((p) =>
    p.attachments.map((a) => ({ ...a, partName: p.name }))
  );
  const partsWithMaterial = tool.parts.filter(
    (p) => p.dimX || p.dimY || p.dimZ || p.material || p.materialType
  );

  function orderDims(p: DashboardPart) {
    const isRaw = p.materialType === "RawStock";
    return {
      x: p.dimX != null ? +(p.dimX + 2.5).toFixed(1) : null,
      y: p.dimY != null ? +(p.dimY + 2.5).toFixed(1) : null,
      z: p.dimZ != null ? (isRaw ? +(p.dimZ + 2.5).toFixed(1) : p.dimZ) : null,
    };
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: C.surface, borderLeft: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className="text-sm font-bold truncate"
              style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {tool.projectName}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={tool.status} />
              <span className="text-xs" style={{ color: C.textMuted }}>
                {tool.projectType}
              </span>
            </div>
            {tool.machineTarget && (
              <div className="text-xs mt-1" style={{ color: C.textDim }}>
                {tool.machineTarget}
              </div>
            )}
            {tool.dueDate && (
              <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                Due:{" "}
                {new Date(tool.dueDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                })}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:opacity-70"
            style={{ color: C.textDim }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        {(["OPS", "MATERIAL", "FILES", "LOG"] as PanelTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={{
              color: tab === t ? C.accent : C.textDim,
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              backgroundColor: "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* OPS */}
        {tab === "OPS" && (
          <div>
            {allOps.length === 0 ? (
              <p className="p-4 text-xs" style={{ color: C.textMuted }}>
                No operations yet.
              </p>
            ) : (
              allOps.map((op) => (
                <div
                  key={op.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <OpDot status={op.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs" style={{ color: C.text }}>
                      {op.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                      {op.partName}
                      {op.estimatedTime ? ` · ${op.estimatedTime}h` : ""}
                    </div>
                  </div>
                  {EXTERNAL_TYPES.has(op.type) && (
                    <a
                      href={buildOpMailtoHref(op, tool.projectName, suppliers)}
                      onClick={onEmailClick}
                      className="text-xs flex-shrink-0 hover:opacity-70"
                      style={{ color: C.textDim }}
                      title="Send email"
                    >
                      ✉
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* MATERIAL */}
        {tab === "MATERIAL" && (
          <div className="p-4 space-y-3">
            {partsWithMaterial.length === 0 ? (
              <p className="text-xs" style={{ color: C.textMuted }}>
                No material data set.
              </p>
            ) : (
              partsWithMaterial.map((part) => {
                const od = orderDims(part);
                const hasDims = part.dimX || part.dimY || part.dimZ;
                return (
                  <div
                    key={part.id}
                    className="rounded p-3 space-y-2"
                    style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                  >
                    <div
                      className="text-xs font-semibold"
                      style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      {part.name}
                    </div>
                    {part.materialType && (
                      <div className="text-xs" style={{ color: C.textDim }}>
                        Type:{" "}
                        <span style={{ color: C.text }}>{part.materialType}</span>
                      </div>
                    )}
                    {part.material && (
                      <div className="text-xs" style={{ color: C.textDim }}>
                        Grade:{" "}
                        <span style={{ color: C.text }}>{part.material}</span>
                      </div>
                    )}
                    {hasDims && (
                      <>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: C.textMuted }}>
                            Finished
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            {part.dimX ?? "—"} × {part.dimY ?? "—"} × {part.dimZ ?? "—"} mm
                          </div>
                        </div>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: C.textMuted }}>
                            Order size
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            {od.x ?? "—"} × {od.y ?? "—"} × {od.z ?? "—"} mm
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                            {part.materialType === "RawStock"
                              ? "+2.5mm X / Y / Z"
                              : "+2.5mm X / Y only"}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="text-xs" style={{ color: C.textMuted }}>
                      Rev model M{part.revModel} · Program R{String(part.revProgram).padStart(2, "0")}
                      {part.revProgramNote ? ` — ${part.revProgramNote}` : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* FILES */}
        {tab === "FILES" && (
          <div>
            {allFiles.length === 0 ? (
              <p className="p-4 text-xs" style={{ color: C.textMuted }}>
                No files attached.
              </p>
            ) : (
              allFiles.map((f) => (
                <div
                  key={f.id}
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: C.accentDim,
                      color: C.accent,
                      border: `1px solid ${C.accentBorder}`,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {f.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    {f.url ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs truncate block"
                        style={{ color: C.accent }}
                      >
                        {f.name}
                      </a>
                    ) : (
                      <span className="text-xs truncate block" style={{ color: C.text }}>
                        {f.name}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {f.partName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LOG */}
        {tab === "LOG" && (
          <div>
            {toolLogs.length === 0 ? (
              <p className="p-4 text-xs" style={{ color: C.textMuted }}>
                No activity recorded.
              </p>
            ) : (
              toolLogs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <div className="text-xs" style={{ color: C.text }}>
                    <span className="font-medium">{log.entityName}</span>{" "}
                    {log.action.replace(/_/g, " ")}
                    {log.detail ? `: ${log.detail}` : ""}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
        <Link
          href={`/tools/${tool.id}`}
          className="block text-center text-xs py-1.5 rounded transition-opacity hover:opacity-80"
          style={{
            color: C.accent,
            backgroundColor: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
          }}
        >
          Open full detail →
        </Link>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

const FILTERS = ["ALL", ...SECTION_CODES] as const;
type Filter = (typeof FILTERS)[number];

export function DashboardClient({
  tools,
  stats,
  activityLogs,
  suppliers = [],
}: {
  tools: DashboardTool[];
  stats: DashboardStats;
  activityLogs: ActivityLog[];
  suppliers?: Supplier[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showMatOrder, setShowMatOrder] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedTool = tools.find((t) => t.id === selectedId) ?? null;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowNewModal(true);
      }
      if (e.key === "Escape") {
        if (showNewModal) { setShowNewModal(false); return; }
        if (selectedId) { setSelectedId(null); return; }
        searchRef.current?.blur();
        setSearch("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showNewModal, selectedId]);

  const handleCreated = useCallback(
    (id: string) => {
      router.push(`/tools/${id}`);
    },
    [router]
  );

  // Filter & search
  const filtered = tools.filter((tool) => {
    if (filter !== "ALL") {
      const codes = tool.sections.map(toSectionCode);
      if (!codes.includes(filter)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!tool.projectName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const materialSuppliers = suppliers.filter((s) => s.category === "Material");
  const materialParts: MaterialPart[] = filtered.flatMap((tool) =>
    tool.parts
      .filter((p) => !!p.materialType)
      .map((p) => ({
        partId: p.name,
        toolName: tool.projectName,
        material: p.material,
        dimX: p.dimX,
        dimY: p.dimY,
        dimZ: p.dimZ,
        materialType: p.materialType,
      }))
  );

  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ backgroundColor: C.bg, color: C.text }}
    >
      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Stats */}
        <div
          className="grid grid-cols-4 gap-3 p-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <StatCard label="Active Projects" value={stats.activeProjects} />
          <StatCard label="Operations In Progress" value={stats.opsInProgress} warn />
          <StatCard label="Awaiting Material" value={stats.awaitingMaterial} />
          <StatCard label="Open Issues" value={stats.openIssues} warn href="/issues?filter=open" />
        </div>

        {/* Filter bar */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          {/* Section chips */}
          <div className="flex items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={{
                  backgroundColor: filter === f ? C.accent : C.surface,
                  color: filter === f ? "#000" : C.textDim,
                  border: `1px solid ${filter === f ? C.accent : C.border}`,
                  fontFamily:
                    f !== "ALL" ? "var(--font-jetbrains-mono)" : undefined,
                  fontWeight: filter === f ? 600 : 400,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Material order button */}
          <button
            onClick={() => {
              if (materialParts.length === 0) return;
              if (materialSuppliers.length <= 1) {
                window.location.href = generateMaterialOrderMailto(
                  materialParts,
                  materialSuppliers[0]?.email ?? ""
                );
                setToast("Email opened in Outlook");
              } else {
                setShowMatOrder(true);
              }
            }}
            disabled={materialParts.length === 0}
            className="text-xs px-3 py-1.5 rounded disabled:opacity-40"
            style={{ color: C.textDim, border: `1px solid ${C.border}` }}
            title={materialParts.length === 0 ? "No parts with material set" : `Order material for ${materialParts.length} part${materialParts.length !== 1 ? "s" : ""}`}
          >
            ✉ Material Order
          </button>

          {/* New project button */}
          <button
            onClick={() => setShowNewModal(true)}
            className="text-xs px-3 py-1.5 rounded"
            style={{
              backgroundColor: C.accentDim,
              color: C.accent,
              border: `1px solid ${C.accentBorder}`,
            }}
          >
            + New{" "}
            <span style={{ color: C.textMuted, fontSize: "10px" }}>Ctrl+N</span>
          </button>

          {/* Search */}
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search… Ctrl+F"
            className="text-xs px-3 py-1.5 rounded outline-none w-48"
            style={{
              backgroundColor: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
            }}
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: C.bg }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["PROJECT ID", "SECTIONS", "STATUS", "PROGRESS", "CURRENT OP", "DEADLINE", ""].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-2 text-xs font-medium whitespace-nowrap"
                      style={{ color: C.textMuted }}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-xs"
                    style={{ color: C.textMuted }}
                  >
                    No projects found.
                  </td>
                </tr>
              ) : (
                filtered.map((tool) => {
                  const isSelected = tool.id === selectedId;
                  const isHovered = tool.id === hoveredId;
                  const isExternal = tool.currentOpType
                    ? EXTERNAL_TYPES.has(tool.currentOpType)
                    : false;
                  const sectionCodes = [
                    ...new Set(tool.sections.map(toSectionCode)),
                  ];
                  const rowBg = isSelected
                    ? C.accentDim
                    : isHovered
                    ? C.surfaceHover
                    : "transparent";

                  return (
                    <tr
                      key={tool.id}
                      onClick={() =>
                        setSelectedId(isSelected ? null : tool.id)
                      }
                      onMouseEnter={() => setHoveredId(tool.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: rowBg,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {/* Project ID */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: C.accent,
                            fontFamily: "var(--font-jetbrains-mono)",
                          }}
                        >
                          {tool.projectName}
                        </span>
                      </td>

                      {/* Sections */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {sectionCodes.length > 0 ? (
                            sectionCodes.map((c) => (
                              <SectionChip key={c} code={c} />
                            ))
                          ) : (
                            <span className="text-xs" style={{ color: C.textMuted }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={tool.status} />
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <ProgressBar value={tool.progress} />
                      </td>

                      {/* Current op */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tool.currentOperation ? (
                            <span
                              className="text-xs truncate max-w-36"
                              style={{ color: C.textDim }}
                            >
                              {tool.currentOperation}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: C.textMuted }}>
                              —
                            </span>
                          )}
                          {isExternal && (
                            <span
                              className="text-xs flex-shrink-0"
                              style={{ color: C.textMuted }}
                              title="External operation — email required"
                            >
                              ✉
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3">
                        {tool.dueDate ? (
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: C.textDim }}
                          >
                            {new Date(tool.dueDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: C.textMuted }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className="text-base leading-none"
                          style={{ color: isSelected ? C.accent : C.textMuted }}
                        >
                          {isSelected ? "‹" : "›"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right panel ── */}
      {selectedTool && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: 280 }}
        >
          <RightPanel
            tool={selectedTool}
            activityLogs={activityLogs}
            suppliers={suppliers}
            onClose={() => setSelectedId(null)}
            onEmailClick={() => setToast("Email opened in Outlook")}
          />
        </div>
      )}

      {/* ── New project modal ── */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Material order modal ── */}
      {showMatOrder && (
        <MaterialOrderModal
          suppliers={materialSuppliers}
          parts={materialParts}
          onClose={() => setShowMatOrder(false)}
          onSent={() => setToast("Email opened in Outlook")}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
