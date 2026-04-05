"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { DxfViewer } from "./DxfViewer";
import { ImageAnnotator } from "./ImageAnnotator";
import {
  generateMaterialOrderMailto,
  generateExternalOpMailto,
  inferOutsourceEmailType,
  findSupplierByCategory,
} from "@/lib/email";

// ── Types ──────────────────────────────────────────────────────────────────

interface Operation {
  id: string;
  name: string;
  order: number;
  type: string;
  status: string;
  machine: string | null;
  estimatedTime: number | null;
  actualTime: number | null;
  changedBy: string | null;
  statusChangedAt: string | null;
  programRevision: number | null;
  programRevNote: string | null;
  toolList: string | null;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string | null;
  operationId: string | null;
}

interface Part {
  id: string;
  toolId: string;
  name: string;
  sectionId: string | null;
  section: { id: string; name: string } | null;
  conversionStatus: string;
  materialType: string | null;
  material: string | null;
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  revModel: number;
  revProgram: number;
  revProgramNote: string | null;
  notes: string | null;
  operations: Operation[];
  attachments: Attachment[];
}

interface ToolInfo {
  id: string;
  projectName: string;
  projectType: string;
  archived?: boolean;
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
  surface2: "#1a1d20",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
  green: "#22c55e",
  red: "#ef4444",
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

const SECTION_STYLE: Record<string, { bg: string; text: string }> = {
  MLD: { bg: "rgba(59,130,246,0.15)", text: "#93c5fd" },
  PLG: { bg: "rgba(168,85,247,0.15)", text: "#c4b5fd" },
  CUT: { bg: "rgba(239,68,68,0.15)", text: "#fca5a5" },
  AVL: { bg: "rgba(139,92,246,0.15)", text: "#ddd6fe" },
  PBX: { bg: "rgba(34,197,94,0.15)", text: "#86efac" },
};

function SectionChip({ name }: { name: string }) {
  const code = toSectionCode(name);
  const s = SECTION_STYLE[code] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.text, fontFamily: "var(--font-jetbrains-mono)" }}
    >
      {code}
    </span>
  );
}

const CONV_STYLE: Record<string, { bg: string; text: string }> = {
  New:    { bg: "rgba(59,130,246,0.15)", text: "#93c5fd" },
  Reuse:  { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  Rework: { bg: "rgba(232,160,32,0.15)", text: "#fbbf24" },
};

function ConvBadge({ status }: { status: string }) {
  const s = CONV_STYLE[status] ?? { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

const OP_STATUS_OPTIONS: Record<string, string[]> = {
  internal:    ["NotStarted", "InProgress", "Done", "Blocked"],
  procurement: ["NotOrdered", "Ordered", "Received"],
  outsource:   ["Pending", "Sent", "InProgress", "Done"],
  inspection:  ["NotStarted", "InProgress", "Done", "Blocked"],
  assembly:    ["NotStarted", "InProgress", "Done", "Blocked"],
};

const STATUS_DOT_COLOR: Record<string, string> = {
  Done: C.green, Received: C.green,
  InProgress: "#e8a020",
  Blocked: C.red,
  NotStarted: C.border, NotOrdered: C.border, Pending: C.border,
  Ready: "#3b82f6", Sent: "#818cf8", Ordered: "#a78bfa",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${status === "InProgress" ? "animate-pulse" : ""}`}
      style={{ backgroundColor: STATUS_DOT_COLOR[status] ?? C.border }}
    />
  );
}

const EXTERNAL_TYPES = new Set(["procurement", "outsource"]);

function isMillingOp(op: Operation): boolean {
  return !!op.machine;
}

function opNumber(order: number): string {
  return `OP${String(order * 10).padStart(2, "0")}`;
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

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${C.border}` }}
    >
      <div
        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
        style={{ backgroundColor: C.surface2, color: C.textDim, borderBottom: `1px solid ${C.border}` }}
      >
        {title}
      </div>
      <div style={{ backgroundColor: C.surface }}>{children}</div>
    </div>
  );
}

// ── Email helper ───────────────────────────────────────────────────────────

function buildOpMailto(
  op: Operation,
  partName: string,
  projectName: string,
  suppliers: Supplier[]
): string {
  if (op.type === "outsource") {
    const emailType = inferOutsourceEmailType(op.name);
    const catMap: Record<string, string> = { gundrilling: "Gundrilling", laser: "Laser", waterjet: "Waterjet" };
    const supplier = findSupplierByCategory(suppliers, catMap[emailType] ?? "");
    return generateExternalOpMailto(emailType, {
      partId: partName,
      toolName: projectName,
      supplierEmail: supplier?.email ?? "",
    });
  }
  // procurement — single-part material order
  const supplier = findSupplierByCategory(suppliers, "Material");
  return generateMaterialOrderMailto(
    [{ partId: partName, toolName: projectName, material: null, dimX: null, dimY: null, dimZ: null, materialType: null }],
    supplier?.email ?? ""
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function PartDetailClient({
  part: initialPart,
  tool,
  suppliers = [],
}: {
  part: Part;
  tool: ToolInfo;
  suppliers?: Supplier[];
}) {
  const [part, setPart] = useState(initialPart);
  const [toast, setToast] = useState<string | null>(null);
  const [dxfViewer, setDxfViewer] = useState<{ url: string; name: string } | null>(null);
  const [annotator, setAnnotator] = useState<{ url: string; name: string } | null>(null);
  const isReadOnly = tool.archived ?? false;

  // ── Add / delete operation state ──────────────────────────────────────────
  const [addingOp, setAddingOp] = useState(false);
  const [newOpName, setNewOpName] = useState("");
  const [newOpType, setNewOpType] = useState("internal");

  // Material form
  const [matForm, setMatForm] = useState({
    materialType: part.materialType ?? "",
    material: part.material ?? "",
    dimX: part.dimX?.toString() ?? "",
    dimY: part.dimY?.toString() ?? "",
    dimZ: part.dimZ?.toString() ?? "",
  });
  const [savingMat, setSavingMat] = useState(false);

  // Notes
  const [notes, setNotes] = useState(part.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Rev program bump
  const [revNoteInput, setRevNoteInput] = useState("");
  const [showRevNote, setShowRevNote] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Operation status change ──

  const handleOpStatusChange = useCallback(
    async (opId: string, newStatus: string) => {
      setPart((p) => ({
        ...p,
        operations: p.operations.map((op) =>
          op.id === opId
            ? {
                ...op,
                status: newStatus,
                statusChangedAt: new Date().toISOString(),
              }
            : op
        ),
      }));
      await fetch(`/api/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    },
    []
  );

  // ── Op field updates (machine, estimatedTime, program fields) ──

  const patchOp = useCallback(async (opId: string, data: Record<string, unknown>) => {
    setPart((p) => ({
      ...p,
      operations: p.operations.map((op) =>
        op.id === opId ? { ...op, ...data } : op
      ),
    }));
    await fetch(`/api/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }, []);

  const handleDeleteOp = useCallback(async (opId: string) => {
    if (!confirm("Delete this operation?")) return;
    await fetch(`/api/operations/${opId}`, { method: "DELETE" });
    setPart((p) => ({ ...p, operations: p.operations.filter((op) => op.id !== opId) }));
  }, []);

  const handleAddOp = useCallback(async () => {
    if (!newOpName.trim()) return;
    const nextOrder = part.operations.length > 0
      ? Math.max(...part.operations.map((o) => o.order)) + 1
      : 1;
    const res = await fetch(`/api/parts/${part.id}/operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOpName.trim(), type: newOpType, order: nextOrder }),
    });
    const op = await res.json();
    setPart((p) => ({
      ...p,
      operations: [...p.operations, {
        ...op,
        machine: op.machine ?? null,
        estimatedTime: op.estimatedTime ?? null,
        actualTime: op.actualTime ?? null,
        changedBy: null,
        statusChangedAt: null,
        programRevision: null,
        programRevNote: null,
        toolList: null,
      }],
    }));
    setNewOpName("");
    setAddingOp(false);
  }, [newOpName, newOpType, part.id, part.operations]);

  // ── Material save ──

  const handleMatSave = async () => {
    setSavingMat(true);
    const payload = {
      materialType: matForm.materialType || null,
      material: matForm.material || null,
      dimX: matForm.dimX ? parseFloat(matForm.dimX) : null,
      dimY: matForm.dimY ? parseFloat(matForm.dimY) : null,
      dimZ: matForm.dimZ ? parseFloat(matForm.dimZ) : null,
    };
    await fetch(`/api/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPart((p) => ({ ...p, ...payload }));
    setSavingMat(false);
  };

  // Calculated order dimensions
  const orderDims = (() => {
    const isRaw = matForm.materialType === "RawStock";
    const x = matForm.dimX ? +(parseFloat(matForm.dimX) + 2.5).toFixed(1) : null;
    const y = matForm.dimY ? +(parseFloat(matForm.dimY) + 2.5).toFixed(1) : null;
    const z = matForm.dimZ
      ? isRaw
        ? +(parseFloat(matForm.dimZ) + 2.5).toFixed(1)
        : parseFloat(matForm.dimZ)
      : null;
    return { x, y, z };
  })();

  // ── Notes auto-save ──

  const handleNotesBlur = async () => {
    if (notes === (part.notes ?? "")) return;
    setSavingNotes(true);
    await fetch(`/api/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes || null }),
    });
    setPart((p) => ({ ...p, notes: notes || null }));
    setSavingNotes(false);
  };

  // ── Revisions ──

  const handleRevModelIncrement = async () => {
    const newRev = part.revModel + 1;
    await fetch(`/api/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revModel: newRev }),
    });
    setPart((p) => ({ ...p, revModel: newRev }));
  };

  const handleRevProgramIncrement = async () => {
    const newRev = part.revProgram + 1;
    await fetch(`/api/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revProgram: newRev, revProgramNote: revNoteInput || null }),
    });
    setPart((p) => ({ ...p, revProgram: newRev, revProgramNote: revNoteInput || null }));
    setRevNoteInput("");
    setShowRevNote(false);
  };

  // ── File upload ──

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("partId", part.id);
    const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
    if (res.ok) {
      const att = await res.json();
      setPart((p) => ({ ...p, attachments: [...p.attachments, att] }));
    }
    setUploading(false);
  };

  const handleDeleteAttachment = async (attId: string) => {
    await fetch(`/api/attachments/${attId}`, { method: "DELETE" });
    setPart((p) => ({ ...p, attachments: p.attachments.filter((a) => a.id !== attId) }));
  };

  const handleAttachmentOpLink = async (attId: string, operationId: string | null) => {
    await fetch(`/api/attachments/${attId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationId }),
    });
    setPart((p) => ({
      ...p,
      attachments: p.attachments.map((a) =>
        a.id === attId ? { ...a, operationId } : a
      ),
    }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldStyle = {
    backgroundColor: C.bg,
    color: C.text,
    border: `1px solid ${C.border}`,
  };

  const inputCls = "w-full px-3 py-1.5 text-sm rounded outline-none";

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: C.bg, color: C.text }}>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      {dxfViewer && (
        <DxfViewer
          url={dxfViewer.url}
          name={dxfViewer.name}
          onClose={() => setDxfViewer(null)}
        />
      )}
      {annotator && (
        <ImageAnnotator
          imageUrl={annotator.url}
          imageName={annotator.name}
          partId={part.id}
          onSave={(att) => {
            setPart((p) => ({ ...p, attachments: [...p.attachments, att] }));
            setAnnotator(null);
            setToast("Annotated image saved");
          }}
          onClose={() => setAnnotator(null)}
        />
      )}
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs" style={{ color: C.textMuted }}>
          <Link href="/" style={{ color: C.textDim }} className="hover:opacity-80">Dashboard</Link>
          <span>›</span>
          <Link
            href={`/tools/${tool.id}`}
            style={{ color: C.textDim, fontFamily: "var(--font-jetbrains-mono)" }}
            className="hover:opacity-80"
          >
            {tool.projectName}
          </Link>
          <span>›</span>
          <span style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}>
            {part.name}
          </span>
        </div>

        {/* Archived banner */}
        {isReadOnly && (
          <div
            className="rounded-lg px-4 py-3 flex items-center gap-3 text-sm"
            style={{ backgroundColor: "rgba(232,160,32,0.08)", border: `1px solid ${C.accentBorder}`, color: C.accent }}
          >
            <span>This project is archived. Restore to make changes.</span>
            <Link
              href={`/tools/${tool.id}`}
              className="ml-auto text-xs px-3 py-1 rounded hover:opacity-80"
              style={{ border: `1px solid ${C.accentBorder}`, backgroundColor: C.accentDim, color: C.accent }}
            >
              Go to project →
            </Link>
          </div>
        )}

        {/* Part header */}
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">

              <h1
                className="text-lg font-bold mb-2"
                style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {part.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {part.section && <SectionChip name={part.section.name} />}
                {tool.projectType === "Conversion" && (
                  <ConvBadge status={part.conversionStatus} />
                )}
                <span className="text-xs" style={{ color: C.textMuted }}>
                  Model Rev{" "}
                  <span style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}>
                    {String(part.revModel).padStart(2, "0")}
                  </span>
                </span>
                <span className="text-xs" style={{ color: C.textMuted }}>
                  Prog{" "}
                  <span style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}>
                    R{String(part.revProgram).padStart(2, "0")}
                  </span>
                </span>
              </div>
            </div>

            {/* Print Process Card button */}
            <a
              href={`/api/process-card/${part.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded flex-shrink-0 hover:opacity-80"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}
            >
              Print Process Card
            </a>
          </div>
        </div>

        {/* ── Operations ── */}
        <Section title="Operations">
          {part.operations.length === 0 && !addingOp && (
            <p className="px-4 py-4 text-sm" style={{ color: C.textMuted }}>No operations.</p>
          )}
          {part.operations.length > 0 && part.operations.map((op, idx) => {
              const isMilling = isMillingOp(op);
              const statusOptions = OP_STATUS_OPTIONS[op.type] ?? ["NotStarted", "Done"];
              return (
                <div
                  key={op.id}
                  className="px-4 py-4"
                  style={{ borderBottom: idx < part.operations.length - 1 ? `1px solid ${C.border}` : "none" }}
                >
                  {/* Row 1: op number, name, status, email icon */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{ color: C.textMuted, fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      {opNumber(op.order)}
                    </span>
                    <StatusDot status={op.status} />
                    <span className="text-sm font-medium flex-1" style={{ color: C.text }}>
                      {op.name}
                    </span>
                    {EXTERNAL_TYPES.has(op.type) && (
                      <a
                        href={buildOpMailto(op, part.name, tool.projectName, suppliers)}
                        onClick={() => setToast("Email opened in Outlook")}
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0 hover:opacity-70"
                        style={{ color: C.accent, border: `1px solid ${C.accentBorder}` }}
                        title="Send email"
                      >
                        ✉
                      </a>
                    )}
                    {/* Status dropdown */}
                    <select
                      value={op.status}
                      onChange={(e) => handleOpStatusChange(op.id, e.target.value)}
                      disabled={isReadOnly}
                      className="text-xs rounded px-2 py-1 outline-none flex-shrink-0 disabled:opacity-50"
                      style={fieldStyle}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleDeleteOp(op.id)}
                        className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 hover:opacity-80"
                        style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}
                        title="Delete operation"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Row 2: machine, estimated time */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs" style={{ color: C.textMuted }}>Machine</label>
                      <input
                        type="text"
                        defaultValue={op.machine ?? ""}
                        placeholder="Hurco / Danusys"
                        disabled={isReadOnly}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== op.machine) patchOp(op.id, { machine: val });
                        }}
                        className="text-xs rounded px-2 py-1 outline-none w-28 disabled:opacity-50"
                        style={fieldStyle}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs" style={{ color: C.textMuted }}>Est. h</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={op.estimatedTime?.toString() ?? ""}
                        placeholder="—"
                        disabled={isReadOnly}
                        onBlur={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null;
                          if (val !== op.estimatedTime) patchOp(op.id, { estimatedTime: val });
                        }}
                        className="text-xs rounded px-2 py-1 outline-none w-16 disabled:opacity-50"
                        style={fieldStyle}
                      />
                    </div>
                    {op.changedBy && (
                      <span className="text-xs" style={{ color: C.textMuted }}>
                        by{" "}
                        <span style={{ color: C.textDim, fontFamily: "var(--font-jetbrains-mono)" }}>
                          {op.changedBy}
                        </span>
                      </span>
                    )}
                    {op.statusChangedAt && (
                      <span className="text-xs" style={{ color: C.textMuted }}>
                        {new Date(op.statusChangedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Milling extra fields */}
                  {isMilling && (
                    <div className="flex items-start gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs" style={{ color: C.textMuted }}>Prog Rev</label>
                        <input
                          type="number"
                          min="1"
                          defaultValue={op.programRevision?.toString() ?? ""}
                          placeholder="—"
                          disabled={isReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            if (val !== op.programRevision) patchOp(op.id, { programRevision: val });
                          }}
                          className="text-xs rounded px-2 py-1 outline-none w-14 disabled:opacity-50"
                          style={fieldStyle}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-xs" style={{ color: C.textMuted }}>Rev note</label>
                        <input
                          type="text"
                          defaultValue={op.programRevNote ?? ""}
                          placeholder="What changed…"
                          disabled={isReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value.trim() || null;
                            if (val !== op.programRevNote) patchOp(op.id, { programRevNote: val });
                          }}
                          className="text-xs rounded px-2 py-1 outline-none flex-1 min-w-0 disabled:opacity-50"
                          style={fieldStyle}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-xs" style={{ color: C.textMuted }}>Tool list</label>
                        <input
                          type="text"
                          defaultValue={op.toolList ?? ""}
                          placeholder="T01, T02, T03…"
                          disabled={isReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value.trim() || null;
                            if (val !== op.toolList) patchOp(op.id, { toolList: val });
                          }}
                          className="text-xs rounded px-2 py-1 outline-none flex-1 min-w-0 disabled:opacity-50"
                          style={fieldStyle}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Inline new-operation form */}
          {addingOp && (
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddOp(); if (e.key === "Escape") { setAddingOp(false); setNewOpName(""); } }}
                  placeholder="Operation name (e.g. Milling)"
                  autoFocus
                  className="text-xs rounded px-2 py-1 outline-none"
                  style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.accentBorder}`, width: 200 }}
                />
                <select
                  value={newOpType}
                  onChange={(e) => setNewOpType(e.target.value)}
                  className="text-xs rounded px-2 py-1 outline-none"
                  style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, appearance: "none", paddingRight: 24 }}
                >
                  <option value="internal">Internal</option>
                  <option value="procurement">Procurement</option>
                  <option value="outsource">Outsource</option>
                  <option value="inspection">Inspection</option>
                  <option value="assembly">Assembly</option>
                </select>
                <button onClick={handleAddOp} disabled={!newOpName.trim()}
                  className="text-xs px-3 py-1 rounded disabled:opacity-50"
                  style={{ backgroundColor: C.accentDim, color: C.accent, border: `1px solid ${C.accentBorder}` }}>
                  Add
                </button>
                <button onClick={() => { setAddingOp(false); setNewOpName(""); }}
                  className="text-xs px-3 py-1 rounded"
                  style={{ color: C.textDim, border: `1px solid ${C.border}` }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add operation button */}
          {!isReadOnly && !addingOp && (
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => setAddingOp(true)}
                className="text-xs px-3 py-1.5 rounded hover:opacity-80"
                style={{ color: C.accent, border: `1px solid ${C.accentBorder}`, backgroundColor: C.accentDim }}
              >
                + Add Operation
              </button>
            </div>
          )}
        </Section>

        {/* ── Material ── */}
        <Section title="Material">
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: C.textMuted }}>
                  Material Type
                </label>
                <select
                  value={matForm.materialType}
                  onChange={(e) => setMatForm({ ...matForm, materialType: e.target.value })}
                  disabled={isReadOnly}
                  className={`${inputCls} disabled:opacity-50`}
                  style={fieldStyle}
                >
                  <option value="">— none —</option>
                  <option value="ToolingPlate">Tooling Plate</option>
                  <option value="RawStock">Raw Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.textMuted }}>
                  Grade
                </label>
                <input
                  type="text"
                  value={matForm.material}
                  onChange={(e) => setMatForm({ ...matForm, material: e.target.value })}
                  placeholder="e.g. Al 5083"
                  disabled={isReadOnly}
                  className={`${inputCls} disabled:opacity-50`}
                  style={fieldStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: C.textMuted }}>
                Finished Dimensions (mm)
              </label>
              <div className="flex items-center gap-2">
                {(["dimX", "dimY", "dimZ"] as const).map((dim) => (
                  <input
                    key={dim}
                    type="number"
                    step="0.1"
                    value={matForm[dim]}
                    onChange={(e) => setMatForm({ ...matForm, [dim]: e.target.value })}
                    placeholder={dim.replace("dim", "")}
                    disabled={isReadOnly}
                    className="text-sm rounded px-2 py-1.5 outline-none w-20 disabled:opacity-50"
                    style={fieldStyle}
                  />
                ))}
                <span className="text-xs" style={{ color: C.textMuted }}>mm</span>
              </div>
            </div>

            {/* Order dimensions preview */}
            {(matForm.dimX || matForm.dimY || matForm.dimZ) && matForm.materialType && (
              <div className="rounded p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <p className="text-xs mb-1" style={{ color: C.textMuted }}>Order size</p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: C.accent, fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  {orderDims.x ?? "—"} × {orderDims.y ?? "—"} × {orderDims.z ?? "—"} mm
                </p>
                <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                  {matForm.materialType === "RawStock"
                    ? "+2.5mm on X / Y / Z"
                    : "+2.5mm on X / Y only (ToolingPlate)"}
                </p>
              </div>
            )}

            <button
              onClick={handleMatSave}
              disabled={savingMat || isReadOnly}
              className="text-xs px-4 py-1.5 rounded disabled:opacity-50"
              style={{ backgroundColor: C.accent, color: "#000", fontWeight: 600 }}
            >
              {savingMat ? "Saving…" : "Save Material"}
            </button>
          </div>
        </Section>

        {/* ── Revisions ── */}
        <Section title="Revisions">
          <div className="px-4 py-4 grid grid-cols-2 gap-6">
            {/* Model revision */}
            <div>
              <p className="text-xs mb-2" style={{ color: C.textMuted }}>Model Revision</p>
              <div className="flex items-center gap-3">
                <span
                  className="text-2xl font-bold"
                  style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  M{String(part.revModel).padStart(2, "0")}
                </span>
                <button
                  onClick={handleRevModelIncrement}
                  disabled={isReadOnly}
                  className="text-xs px-2.5 py-1 rounded disabled:opacity-50"
                  style={{ color: C.accent, border: `1px solid ${C.accentBorder}`, backgroundColor: C.accentDim }}
                >
                  +1
                </button>
              </div>
            </div>

            {/* Program revision */}
            <div>
              <p className="text-xs mb-2" style={{ color: C.textMuted }}>Program Revision</p>
              <div className="flex items-center gap-3">
                <span
                  className="text-2xl font-bold"
                  style={{ color: C.text, fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  R{String(part.revProgram).padStart(2, "0")}
                </span>
                <button
                  onClick={() => setShowRevNote((v) => !v)}
                  disabled={isReadOnly}
                  className="text-xs px-2.5 py-1 rounded disabled:opacity-50"
                  style={{ color: C.accent, border: `1px solid ${C.accentBorder}`, backgroundColor: C.accentDim }}
                >
                  +1
                </button>
              </div>
              {part.revProgramNote && (
                <p className="text-xs mt-1" style={{ color: C.textDim }}>
                  Last: {part.revProgramNote}
                </p>
              )}
              {showRevNote && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={revNoteInput}
                    onChange={(e) => setRevNoteInput(e.target.value)}
                    placeholder="What changed in this revision?"
                    className="w-full text-xs rounded px-2 py-1.5 outline-none"
                    style={fieldStyle}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRevProgramIncrement}
                      className="text-xs px-3 py-1 rounded"
                      style={{ backgroundColor: C.accent, color: "#000", fontWeight: 600 }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setShowRevNote(false); setRevNoteInput(""); }}
                      className="text-xs px-3 py-1 rounded"
                      style={{ color: C.textDim, border: `1px solid ${C.border}` }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Notes ── */}
        <Section title="Notes">
          <div className="px-4 py-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={4}
              placeholder="Free text notes…"
              disabled={isReadOnly}
              className="w-full text-sm rounded px-3 py-2 outline-none resize-none disabled:opacity-50"
              style={{ ...fieldStyle, fontFamily: "inherit" }}
            />
            {savingNotes && (
              <p className="text-xs mt-1" style={{ color: C.textMuted }}>Saving…</p>
            )}
          </div>
        </Section>

        {/* ── Attachments ── */}
        <Section title="Attachments">
          <div className="px-4 py-4">
            {/* Upload button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isReadOnly}
                className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                style={{
                  color: C.accent,
                  border: `1px solid ${C.accentBorder}`,
                  backgroundColor: C.accentDim,
                }}
              >
                {uploading ? "Uploading…" : "Upload File"}
              </button>
              <span className="text-xs" style={{ color: C.textMuted }}>
                PDF, DXF, NC (.hnc/.h), IMAGE
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.dxf,.hnc,.h,.nc,.tap,.cnc,.jpg,.jpeg,.png,.gif,.webp,.step,.stp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Attachment list */}
            {part.attachments.length === 0 ? (
              <p className="text-sm" style={{ color: C.textMuted }}>No files attached.</p>
            ) : (
              <div className="space-y-2">
                {part.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded px-3 py-2"
                    style={{ backgroundColor: C.surface2, border: `1px solid ${C.border}` }}
                  >
                    {/* Type badge */}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        backgroundColor: C.accentDim,
                        color: C.accent,
                        border: `1px solid ${C.accentBorder}`,
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {att.type}
                    </span>

                    {/* Filename */}
                    <div className="flex-1 min-w-0">
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs truncate block"
                          style={{ color: C.accent }}
                        >
                          {att.name}
                        </a>
                      ) : (
                        <span className="text-xs truncate block" style={{ color: C.text }}>
                          {att.name}
                        </span>
                      )}
                    </div>

                    {/* DXF viewer */}
                    {att.type === "DXF" && att.url && (
                      <button
                        onClick={() => setDxfViewer({ url: att.url!, name: att.name })}
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0 hover:opacity-80"
                        style={{ color: C.textDim, border: `1px solid ${C.border}` }}
                      >
                        View
                      </button>
                    )}

                    {/* Image annotator */}
                    {att.type === "IMAGE" && att.url && !isReadOnly && (
                      <button
                        onClick={() => setAnnotator({ url: att.url!, name: att.name })}
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0 hover:opacity-80"
                        style={{ color: C.textDim, border: `1px solid ${C.border}` }}
                      >
                        Annotate
                      </button>
                    )}

                    {/* Link to operation */}
                    <select
                      value={att.operationId ?? ""}
                      onChange={(e) => handleAttachmentOpLink(att.id, e.target.value || null)}
                      disabled={isReadOnly}
                      className="text-xs rounded px-1.5 py-0.5 outline-none flex-shrink-0 disabled:opacity-50"
                      style={{ ...fieldStyle, maxWidth: 120 }}
                      title="Link to operation"
                    >
                      <option value="">No op link</option>
                      {part.operations.map((op) => (
                        <option key={op.id} value={op.id}>
                          {opNumber(op.order)} {op.name}
                        </option>
                      ))}
                    </select>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${att.name}?`)) handleDeleteAttachment(att.id);
                      }}
                      disabled={isReadOnly}
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 disabled:opacity-50"
                      style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
