"use client";

import { useState, useRef, useEffect } from "react";
import { Part, OPERATION_STATUS_COLORS, OperationStatus, OperationType, OutsourceJob, OUTSOURCE_STATUS_COLORS, OutsourceStatus, Attachment, Section, Supplier, getEffectiveStatus, isOpEffectivelyComplete, OP_STATUS_LABELS, Order, Operation } from "@/lib/types";
import Link from "next/link";
import { getPartBlockReasons } from "@/lib/blockers";
import { AddOperationForm } from "@/components/AddOperationForm";

interface PartRowProps {
  part: Part;
  sections: Section[];
  suppliers?: Supplier[];
  allOrders?: Order[];
  onUpdated: (part: Part) => void;
  onDeleted: (id: string) => void;
  initialExpanded?: boolean;
  highlight?: boolean;
  /** When set, auto-expands the row and opens the specified order form */
  orderFormTrigger?: { opId: string; mode: "create-order" | "link-order" } | null;
  onOrderFormConsumed?: () => void;
}



type LinkFormState =
  | { opId: string; mode: "create-order"; supplier: string; supplierId: string; eta: string }
  | { opId: string; mode: "link-order"; selectedId: string }
  | { opId: string; mode: "create-job"; company: string; supplierId: string; eta: string }
  | { opId: string; mode: "link-job"; selectedId: string }
  | null;

const OUTSOURCE_STATUSES: OutsourceStatus[] = ["Pending", "Sent", "InProgress", "Done", "Cancelled"];

function LaserWarnings({ part, attachments }: { part: Part; attachments: Attachment[] }) {
  if (!part.requiresLaser) return null;
  const missing: string[] = [];
  if (!attachments.some((a) => a.type === "DXF")) missing.push("DXF");
  if (!part.material) missing.push("material");
  if (!part.thickness) missing.push("thickness");
  if (missing.length === 0) return null;
  return (
    <>
      {missing.map((m) => (
        <span key={m} className="text-xs px-1 py-0.5 rounded bg-red-100 text-red-600 font-medium">
          !{m}
        </span>
      ))}
    </>
  );
}

export function PartRow({ part, sections, suppliers = [], allOrders = [], onUpdated, onDeleted, initialExpanded = false, highlight = false, orderFormTrigger = null, onOrderFormConsumed }: PartRowProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [current, setCurrent] = useState<Part>(part);
  const [drawingRefDraft, setDrawingRefDraft] = useState(part.drawingRef ?? "");
  const [materialDraft, setMaterialDraft] = useState(part.material ?? "");
  const [thicknessDraft, setThicknessDraft] = useState(part.thickness ?? "");
  const [sizeDraft, setSizeDraft] = useState(part.size ?? "");
  const [quantityDraft, setQuantityDraft] = useState(String(part.quantity ?? 1));
  const [supplierDraft, setSupplierDraft] = useState(part.supplier ?? "");
  const [outsourceJobs, setOutsourceJobs] = useState<OutsourceJob[]>(part.outsourceJobs ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(part.attachments ?? []);
  const [linkForm, setLinkForm] = useState<LinkFormState>(null);
  const [showOutsourceForm, setShowOutsourceForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outsourceForm, setOutsourceForm] = useState({ supplierId: "", company: "", eta: "", notes: "", externalJobRef: "" });
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editOpDraft, setEditOpDraft] = useState({ name: "", type: "internal" as OperationType });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand and open an order link form when triggered from the Blockers panel
  useEffect(() => {
    if (!orderFormTrigger) return;
    setExpanded(true);
    if (orderFormTrigger.mode === "create-order") {
      const op = current.operations.find((o) => o.id === orderFormTrigger.opId);
      setLinkForm({ opId: orderFormTrigger.opId, mode: "create-order", supplier: op?.supplier ?? "", supplierId: "", eta: "" });
    } else {
      setLinkForm({ opId: orderFormTrigger.opId, mode: "link-order", selectedId: "" });
    }
    onOrderFormConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderFormTrigger]);

  const isOpDone = isOpEffectivelyComplete;
  const sectionName = sections.find((s) => s.id === current.sectionId)?.name;

  const doneOps = current.operations.filter(isOpDone).length;
  const totalOps = current.operations.length;
  const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;
  const blockReasons = getPartBlockReasons({ ...current, outsourceJobs });
  const isBlocked = blockReasons.length > 0;

  // Find the procurement (Order Material) operation for this part
  const procurementOp = current.operations.find(
    (op) => op.type === "procurement" || op.name.toLowerCase() === "order material"
  );
  // True when Order Material exists but isn't received yet — blocks everything downstream
  const isProcurementBlocking = !!procurementOp && !isOpDone(procurementOp);

  // Next actionable op — uses type priority (procurement > outsource > internal) to match
  // the Next Actions panel in ToolDetailClient, avoiding divergent suggestions.
  const OP_NEXT_PRIORITY: Record<string, number> = { procurement: 1, outsource: 2, internal: 3, inspection: 3, assembly: 3 };
  const nextOp = (() => {
    if (isProcurementBlocking) return procurementOp;
    const candidates = current.operations.filter((op, idx) =>
      !isOpDone(op) &&
      (idx === 0 || !op.dependsOnPrevious || isOpDone(current.operations[idx - 1]))
    );
    if (candidates.length === 0) return undefined;
    return candidates.slice().sort((a, b) => (OP_NEXT_PRIORITY[a.type] ?? 9) - (OP_NEXT_PRIORITY[b.type] ?? 9))[0];
  })();

  const hasDxf = attachments.some((a) => a.type === "DXF");

  const patchPart = async (data: Partial<Part>) => {
    const updated = { ...current, ...data };
    setCurrent(updated);
    onUpdated(updated);
    await fetch(`/api/parts/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const updateOpStatus = async (opId: string, status: OperationStatus) => {
    const updated = {
      ...current,
      operations: current.operations.map((o) => o.id === opId ? { ...o, status } : o),
    };
    setCurrent(updated);
    onUpdated(updated);
    await fetch(`/api/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const updateOpDependency = async (opId: string, dependsOnPrevious: boolean) => {
    const updated = {
      ...current,
      operations: current.operations.map((o) => o.id === opId ? { ...o, dependsOnPrevious } : o),
    };
    setCurrent(updated);
    onUpdated(updated);
    await fetch(`/api/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOnPrevious }),
    });
  };

  const handleAddOutsource = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedCompany = outsourceForm.supplierId
      ? (suppliers.find((s) => s.id === outsourceForm.supplierId)?.name ?? "")
      : outsourceForm.company.trim();
    if (!resolvedCompany) return;
    const res = await fetch(`/api/parts/${current.id}/outsourcing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...outsourceForm, company: resolvedCompany }),
    });
    const job = await res.json();
    setOutsourceJobs((prev) => [...prev, job]);
    setOutsourceForm({ supplierId: "", company: "", eta: "", notes: "", externalJobRef: "" });
    setShowOutsourceForm(false);
  };

  const handleOutsourceStatus = async (jobId: string, status: OutsourceStatus) => {
    const updatedJobs = outsourceJobs.map((j) => (j.id === jobId ? { ...j, status } : j));
    setOutsourceJobs(updatedJobs);
    // Sync effective status on any operation linked to this job
    const updatedCurrent = {
      ...current,
      operations: current.operations.map((op) =>
        op.outsourceJobId === jobId && op.linkedJob
          ? { ...op, linkedJob: { ...op.linkedJob, status } }
          : op
      ),
    };
    setCurrent(updatedCurrent);
    // Notify parent so Blockers panel and tool summary update immediately
    onUpdated({ ...updatedCurrent, outsourceJobs: updatedJobs });
    await fetch(`/api/outsourcing/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const patchOperation = async (opId: string, data: object) => {
    const res = await fetch(`/api/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updatedOp = await res.json();
    setCurrent((prev) => ({
      ...prev,
      operations: prev.operations.map((o) => (o.id === opId ? { ...o, ...updatedOp } : o)),
    }));
    return updatedOp;
  };

  const handleCreateOrder = async () => {
    if (linkForm?.mode !== "create-order") return;
    const resolvedSupplier = linkForm.supplierId
      ? (suppliers.find((s) => s.id === linkForm.supplierId)?.name ?? linkForm.supplier)
      : linkForm.supplier.trim();
    if (!resolvedSupplier) return;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier: resolvedSupplier,
        supplierId: linkForm.supplierId || null,
        eta: linkForm.eta || null,
        partId: current.id,
      }),
    });
    const order = await res.json();
    await patchOperation(linkForm.opId, { orderId: order.id });
    setLinkForm(null);
  };

  const handleLinkOrder = async () => {
    if (linkForm?.mode !== "link-order" || !linkForm.selectedId) return;
    await patchOperation(linkForm.opId, { orderId: linkForm.selectedId });
    // Also add this part as an OrderItem (upserts by partId — safe to call if already exists)
    await fetch(`/api/orders/${linkForm.selectedId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: current.id, qty: 1 }),
    });
    setLinkForm(null);
  };

  const handleCreateJob = async () => {
    if (linkForm?.mode !== "create-job") return;
    const resolvedCompany = linkForm.supplierId
      ? (suppliers.find((s) => s.id === linkForm.supplierId)?.name ?? linkForm.company)
      : linkForm.company.trim();
    if (!resolvedCompany) return;
    const res = await fetch(`/api/parts/${current.id}/outsourcing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: resolvedCompany,
        supplierId: linkForm.supplierId || null,
        eta: linkForm.eta || null,
      }),
    });
    const job = await res.json();
    setOutsourceJobs((prev) => [...prev, job]);
    await patchOperation(linkForm.opId, { outsourceJobId: job.id });
    setLinkForm(null);
  };

  const handleLinkJob = async () => {
    if (linkForm?.mode !== "link-job" || !linkForm.selectedId) return;
    await patchOperation(linkForm.opId, { outsourceJobId: linkForm.selectedId });
    setLinkForm(null);
  };

  const handleUnlink = async (opId: string) => {
    const op = current.operations.find((o) => o.id === opId);
    if (!op) return;
    if (op.orderId) await patchOperation(opId, { orderId: null });
    else if (op.outsourceJobId) await patchOperation(opId, { outsourceJobId: null });
  };

  const saveQuantity = async () => {
    const val = parseInt(quantityDraft) || 1;
    if (val === current.quantity) return;
    await patchPart({ quantity: val });
  };

  const saveSupplier = async () => {
    const val = supplierDraft.trim() || null;
    if (val === (current.supplier ?? null)) return;
    await patchPart({ supplier: val });
  };

  const saveDrawingRef = async () => {
    const val = drawingRefDraft.trim() || null;
    if (val === (current.drawingRef ?? null)) return;
    await patchPart({ drawingRef: val });
  };

  const saveMaterial = async () => {
    const val = materialDraft.trim() || null;
    if (val === (current.material ?? null)) return;
    await patchPart({ material: val });
  };

  const saveThickness = async () => {
    const val = thicknessDraft.trim() || null;
    if (val === (current.thickness ?? null)) return;
    await patchPart({ thickness: val });
  };

  const saveSize = async () => {
    const val = sizeDraft.trim() || null;
    if (val === (current.size ?? null)) return;
    await patchPart({ size: val });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("partId", current.id);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
      const att = await res.json();
      setAttachments((prev) => [...prev, att]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    await fetch(`/api/attachments/${attId}`, { method: "DELETE" });
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleDeleteOp = async (opId: string, opName: string) => {
    if (!confirm(`Delete "${opName}"?`)) return;
    await fetch(`/api/operations/${opId}`, { method: "DELETE" });
    setCurrent((prev) => ({ ...prev, operations: prev.operations.filter((o) => o.id !== opId) }));
  };

  const handleSaveOpEdit = async (opId: string) => {
    if (!editOpDraft.name.trim()) return;
    await patchOperation(opId, { name: editOpDraft.name.trim(), type: editOpDraft.type });
    setEditingOpId(null);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete part "${current.name}"?`)) return;
    await fetch(`/api/parts/${current.id}`, { method: "DELETE" });
    onDeleted(current.id);
  };

  return (
    <div
      id={`part-${part.id}`}
      className={`border rounded bg-white transition-shadow ${highlight ? "ring-2 ring-blue-400 ring-offset-1" : ""} ${current.requiresLaser ? "border-orange-200" : "border-gray-200"}`}
    >
      {/* Part header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400 text-xs w-4 shrink-0">{expanded ? "▼" : "▶"}</span>

        <div className="flex-1 min-w-0">
          {/* Row 1: name + status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{current.name}</span>

            {current.requiresLaser && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white tracking-wide">
                LASER
              </span>
            )}

            {current.requiresLaser && (
              hasDxf
                ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">DXF ✓</span>
                : <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">NO DXF</span>
            )}

            <LaserWarnings part={current} attachments={attachments} />

            {isProcurementBlocking ? (
              /* Procurement is the real blocker — show actionable chip inline */
              <span className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-300 px-1.5 py-0.5 rounded shrink-0">
                  → Order Material · {OP_STATUS_LABELS[getEffectiveStatus(procurementOp!)]}
                </span>
                {procurementOp!.orderId && procurementOp!.linkedOrder?.status !== "Cancelled" ? (
                  <Link href="/procurement" className="text-xs text-blue-500 hover:text-blue-700 font-medium shrink-0">
                    Open Order ↗
                  </Link>
                ) : (
                  <>
                    {procurementOp!.linkedOrder?.status === "Cancelled" && (
                      <span className="text-xs text-red-500 font-medium shrink-0">Order cancelled —</span>
                    )}
                    <button
                      onClick={() => { setExpanded(true); setLinkForm({ opId: procurementOp!.id, mode: "create-order", supplier: procurementOp!.supplier ?? "", supplierId: "", eta: "" }); }}
                      className="text-xs border border-blue-300 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 font-medium shrink-0"
                    >
                      Create Order
                    </button>
                    <button
                      onClick={() => { setExpanded(true); setLinkForm({ opId: procurementOp!.id, mode: "link-order", selectedId: "" }); }}
                      className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                      title="Link to existing order"
                    >
                      Link
                    </button>
                  </>
                )}
              </span>
            ) : isBlocked ? (
              <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">⚠ blocked</span>
            ) : nextOp ? (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                → {nextOp.name}
                {(nextOp.type === "procurement" || nextOp.name.toLowerCase() === "order material") && (
                  <span className="ml-1 font-normal opacity-70">
                    · {OP_STATUS_LABELS[getEffectiveStatus(nextOp)]}
                  </span>
                )}
              </span>
            ) : null}
          </div>

          {/* Row 2: specs + progress */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">×{current.quantity}</span>

            {sectionName ? (
              <span className="text-xs text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">{sectionName}</span>
            ) : sections.length > 0 ? (
              <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-1.5 py-0.5 rounded">unassigned</span>
            ) : null}

            {current.material && (
              <span className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{current.material}</span>
            )}
            {current.size && (
              <span className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">{current.size}</span>
            )}
            {current.thickness && (
              <span className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">t={current.thickness}</span>
            )}
            {current.supplier && (
              <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">↗ {current.supplier}</span>
            )}
            {current.drawingRef && (
              <span className="text-xs font-mono text-gray-500 bg-white border border-dashed border-gray-300 px-1.5 py-0.5 rounded">{current.drawingRef}</span>
            )}

            {/* Attachment indicator */}
            {attachments.length > 0 && (() => {
              const dxf = attachments.filter((a) => a.type === "DXF").length;
              const other = attachments.length - dxf;
              if (dxf > 0 && other === 0) return (
                <span className="text-xs font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">DXF</span>
              );
              if (dxf > 0) return (
                <span className="text-xs font-mono text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">DXF +{other}</span>
              );
              return (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">📎 {attachments.length}</span>
              );
            })()}

            {totalOps > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 tabular-nums">{doneOps}/{totalOps}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={handleDelete} className="text-gray-300 hover:text-red-500 text-xs px-1">✕</button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Qty</span>
              <input
                type="number"
                min={1}
                value={quantityDraft}
                onChange={(e) => setQuantityDraft(e.target.value)}
                onBlur={saveQuantity}
                className="text-xs border rounded px-2 py-1 w-16"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Drawing Ref</span>
              <input
                value={drawingRefDraft}
                onChange={(e) => setDrawingRefDraft(e.target.value)}
                onBlur={saveDrawingRef}
                placeholder="DWG-001"
                className="text-xs border rounded px-2 py-1 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Material</span>
              <input
                value={materialDraft}
                onChange={(e) => setMaterialDraft(e.target.value)}
                onBlur={saveMaterial}
                placeholder="e.g. S355"
                className="text-xs border rounded px-2 py-1 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Size</span>
              <input
                value={sizeDraft}
                onChange={(e) => setSizeDraft(e.target.value)}
                onBlur={saveSize}
                placeholder="200×150"
                className="text-xs border rounded px-2 py-1 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Thickness</span>
              <input
                value={thicknessDraft}
                onChange={(e) => setThicknessDraft(e.target.value)}
                onBlur={saveThickness}
                placeholder="10 mm"
                className="text-xs border rounded px-2 py-1 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Supplier</span>
              <input
                value={supplierDraft}
                onChange={(e) => setSupplierDraft(e.target.value)}
                onBlur={saveSupplier}
                placeholder="Company name"
                className="text-xs border rounded px-2 py-1 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Section</span>
              <select
                value={current.sectionId ?? ""}
                onChange={(e) => patchPart({ sectionId: e.target.value || null })}
                className="text-xs border rounded px-2 py-1 flex-1"
              >
                <option value="">— none —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Laser fields */}
          <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={current.requiresLaser}
                onChange={(e) => patchPart({ requiresLaser: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-600">Requires Laser</span>
            </label>
          </div>

          {/* Operations */}
          <div className="px-4 py-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Operations {current.operations.length > 0 && `(${current.operations.length})`}
              </span>
            </div>

            {current.operations.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No operations yet.</p>
            )}

            <div className="space-y-1 mb-2">
              {current.operations.map((op, idx) => {
                const prevOp = current.operations[idx - 1];
                const isLocked = op.dependsOnPrevious && prevOp && !isOpDone(prevOp);
                const isProcurement = op.type === "procurement" || op.name.toLowerCase() === "order material";
                const isOutsourceOp = op.type === "outsource";
                // internal, inspection, assembly all behave identically: checkbox only
                const isInternal = !isProcurement && !isOutsourceOp;
                const isLinked = !!(op.orderId || op.outsourceJobId);
                const effStatus = getEffectiveStatus(op);
                const isFormOpen = linkForm?.opId === op.id;
                const isEditing = editingOpId === op.id;

                return (
                  <div key={op.id}>
                    {/* Operation row */}
                    <div className={`flex items-center gap-2 px-2 py-2 rounded border ${isLocked ? "opacity-50 bg-gray-50 border-gray-100" : "bg-white border-gray-100"}`}>
                      <span className="text-xs text-gray-300 w-4 shrink-0">{op.order}.</span>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            value={editOpDraft.name}
                            onChange={(e) => setEditOpDraft((d) => ({ ...d, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveOpEdit(op.id); if (e.key === "Escape") setEditingOpId(null); }}
                            className="text-xs border rounded px-2 py-1 flex-1 min-w-0"
                            autoFocus
                          />
                          <select
                            value={editOpDraft.type}
                            onChange={(e) => setEditOpDraft((d) => ({ ...d, type: e.target.value as OperationType }))}
                            className="text-xs border rounded px-1.5 py-1 shrink-0"
                          >
                            <option value="internal">internal</option>
                            <option value="procurement">procurement</option>
                            <option value="outsource">outsource</option>
                            <option value="inspection">inspection</option>
                            <option value="assembly">assembly</option>
                          </select>
                          <button onClick={() => handleSaveOpEdit(op.id)} className="text-xs text-green-600 hover:text-green-800 shrink-0">✓</button>
                          <button onClick={() => setEditingOpId(null)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm min-w-0 truncate">{op.name}</span>

                          {!op.dependsOnPrevious && idx > 0 && (
                            <span className="text-xs px-1 py-0.5 rounded bg-indigo-50 text-indigo-500 font-mono shrink-0" title="Independent">
                              free
                            </span>
                          )}

                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            op.type === "procurement" ? "bg-purple-100 text-purple-600" :
                            op.type === "inspection"  ? "bg-orange-100 text-orange-600" :
                            op.type === "assembly"    ? "bg-blue-100 text-blue-600" :
                            op.type === "outsource"   ? "bg-yellow-100 text-yellow-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {op.type}
                          </span>

                          {isLocked ? (
                            <span className="text-xs text-gray-400 shrink-0">🔒</span>
                          ) : isLinked ? (
                            /* Already linked — show derived status badge; call out cancelled orders explicitly */
                            op.linkedOrder?.status === "Cancelled" ? (
                              <span className="text-xs px-2 py-0.5 rounded font-medium border shrink-0 bg-red-50 text-red-600 border-red-200">
                                Order cancelled
                              </span>
                            ) : (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium border shrink-0 ${OPERATION_STATUS_COLORS[effStatus]}`}>
                                {OP_STATUS_LABELS[effStatus] ?? effStatus}
                              </span>
                            )
                          ) : isProcurement ? (
                            /* Procurement op — unlinked: show "Not Ordered" + Create/Link Order */
                            <>
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-50 text-yellow-800 border border-yellow-300 shrink-0">
                                Not Ordered
                              </span>
                              <button
                                onClick={() => setLinkForm({ opId: op.id, mode: "create-order", supplier: op.supplier ?? "", supplierId: "", eta: "" })}
                                className="text-xs border border-blue-300 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 font-medium shrink-0"
                              >
                                Create Order
                              </button>
                              <button
                                onClick={() => setLinkForm({ opId: op.id, mode: "link-order", selectedId: "" })}
                                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                                title="Link to existing order"
                              >
                                Link
                              </button>
                            </>
                          ) : isOutsourceOp ? (
                            /* Any outsource op — unlinked: show status badge + Create/Link Job */
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${OPERATION_STATUS_COLORS[effStatus]}`}>
                                {OP_STATUS_LABELS[effStatus] ?? effStatus}
                              </span>
                              <button
                                onClick={() => setLinkForm({ opId: op.id, mode: "create-job", company: op.supplier ?? "", supplierId: "", eta: "" })}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium shrink-0"
                              >
                                + Create Job
                              </button>
                              <button
                                onClick={() => setLinkForm({ opId: op.id, mode: "link-job", selectedId: "" })}
                                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                                title="Link to existing job"
                              >
                                🔗
                              </button>
                            </>
                          ) : isInternal ? (
                            /* Internal / inspection / assembly: checkbox only */
                            <input
                              type="checkbox"
                              checked={isOpDone(op)}
                              onChange={() => updateOpStatus(op.id, isOpDone(op) ? "NotStarted" : "Done")}
                              className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
                              title={isOpDone(op) ? "Done — click to undo" : "Mark done"}
                            />
                          ) : null}

                          {/* Linked info chip */}
                          {isLinked && !isLocked && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                              {op.linkedOrder && (
                                <>
                                  <span className="font-medium text-gray-700">{op.linkedOrder.supplier}</span>
                                  {op.linkedOrder.eta && (
                                    <span className="text-gray-400">{new Date(op.linkedOrder.eta).toLocaleDateString("pl-PL")}</span>
                                  )}
                                  {op.linkedOrder.poNumber && (
                                    <span className="text-gray-400">PO:{op.linkedOrder.poNumber}</span>
                                  )}
                                  <Link href="/procurement" className="text-blue-400 hover:text-blue-600" title="Procurement">↗</Link>
                                </>
                              )}
                              {op.linkedJob && (
                                <>
                                  <span className="font-medium text-gray-700">{op.linkedJob.company}</span>
                                  {op.linkedJob.eta && (
                                    <span className="text-gray-400">{new Date(op.linkedJob.eta).toLocaleDateString("pl-PL")}</span>
                                  )}
                                  <Link href="/outsourcing" className="text-blue-400 hover:text-blue-600" title="Outsourcing">↗</Link>
                                </>
                              )}
                              <button onClick={() => handleUnlink(op.id)} title="Unlink" className="text-gray-300 hover:text-red-400">✕</button>
                            </div>
                          )}

                          {idx > 0 && (
                            <button
                              onClick={() => updateOpDependency(op.id, !op.dependsOnPrevious)}
                              title={op.dependsOnPrevious ? "Sequential (click for free)" : "Independent (click for sequential)"}
                              className={`text-xs rounded px-1 py-0.5 shrink-0 ${
                                op.dependsOnPrevious ? "text-gray-300 hover:text-gray-500" : "text-indigo-400 hover:text-indigo-600"
                              }`}
                            >
                              ⊙
                            </button>
                          )}

                          <button
                            onClick={() => { setEditingOpId(op.id); setEditOpDraft({ name: op.name, type: op.type }); }}
                            className="text-gray-300 hover:text-gray-500 text-xs shrink-0"
                            title="Edit operation"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteOp(op.id, op.name)}
                            className="text-gray-300 hover:text-red-500 text-xs shrink-0"
                            title="Delete operation"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>

                    {/* Inline link / create form */}
                    {isFormOpen && (
                      <div className="mx-2 mb-1 p-3 bg-blue-50 border border-blue-100 rounded text-xs">
                        {linkForm!.mode === "create-order" && (
                          <div className="flex flex-wrap gap-2 items-end">
                            <span className="text-blue-700 font-semibold self-center">New Order:</span>
                            {suppliers.length > 0 ? (
                              <select
                                value={linkForm!.supplierId}
                                onChange={(e) => setLinkForm((f) => f ? { ...f, supplierId: e.target.value, supplier: "" } as typeof f : f)}
                                className="border rounded px-2 py-1 text-xs"
                              >
                                <option value="">— manual —</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            ) : null}
                            {!linkForm!.supplierId && (
                              <input
                                required
                                value={(linkForm as Extract<LinkFormState, { mode: "create-order" }>)!.supplier}
                                onChange={(e) => setLinkForm((f) => f ? { ...f, supplier: e.target.value } as typeof f : f)}
                                placeholder="Supplier *"
                                className="border rounded px-2 py-1 text-xs w-32"
                              />
                            )}
                            <input
                              type="date"
                              value={(linkForm as Extract<LinkFormState, { mode: "create-order" }>)!.eta}
                              onChange={(e) => setLinkForm((f) => f ? { ...f, eta: e.target.value } as typeof f : f)}
                              className="border rounded px-2 py-1 text-xs"
                            />
                            <button onClick={handleCreateOrder} className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Create &amp; Link</button>
                            <button onClick={() => setLinkForm(null)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        )}

                        {linkForm!.mode === "link-order" && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-blue-700 font-semibold">Link Order:</span>
                            <select
                              value={(linkForm as Extract<LinkFormState, { mode: "link-order" }>)!.selectedId}
                              onChange={(e) => setLinkForm((f) => f ? { ...f, selectedId: e.target.value } as typeof f : f)}
                              className="border rounded px-2 py-1 text-xs flex-1 min-w-[160px]"
                            >
                              <option value="">— select order —</option>
                              {allOrders
                                .filter((o) => !o.items?.length || o.items.some((i) => i.part?.tool?.id === current.toolId))
                                .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.supplier}{o.poNumber ? ` · PO: ${o.poNumber}` : ""} [{o.status}]
                                </option>
                              ))}
                            </select>
                            <button onClick={handleLinkOrder} className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Link</button>
                            <button onClick={() => setLinkForm(null)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        )}

                        {linkForm!.mode === "create-job" && (
                          <div className="flex flex-wrap gap-2 items-end">
                            <span className="text-blue-700 font-semibold self-center">New Job:</span>
                            {suppliers.length > 0 ? (
                              <select
                                value={linkForm!.supplierId}
                                onChange={(e) => setLinkForm((f) => f ? { ...f, supplierId: e.target.value, company: "" } as typeof f : f)}
                                className="border rounded px-2 py-1 text-xs"
                              >
                                <option value="">— manual —</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            ) : null}
                            {!linkForm!.supplierId && (
                              <input
                                required
                                value={(linkForm as Extract<LinkFormState, { mode: "create-job" }>)!.company}
                                onChange={(e) => setLinkForm((f) => f ? { ...f, company: e.target.value } as typeof f : f)}
                                placeholder="Company *"
                                className="border rounded px-2 py-1 text-xs w-32"
                              />
                            )}
                            <input
                              type="date"
                              value={(linkForm as Extract<LinkFormState, { mode: "create-job" }>)!.eta}
                              onChange={(e) => setLinkForm((f) => f ? { ...f, eta: e.target.value } as typeof f : f)}
                              className="border rounded px-2 py-1 text-xs"
                            />
                            <button onClick={handleCreateJob} className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Create &amp; Link</button>
                            <button onClick={() => setLinkForm(null)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        )}

                        {linkForm!.mode === "link-job" && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-blue-700 font-semibold">Link Job:</span>
                            <select
                              value={(linkForm as Extract<LinkFormState, { mode: "link-job" }>)!.selectedId}
                              onChange={(e) => setLinkForm((f) => f ? { ...f, selectedId: e.target.value } as typeof f : f)}
                              className="border rounded px-2 py-1 text-xs flex-1 min-w-[160px]"
                            >
                              <option value="">— select job —</option>
                              {outsourceJobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.company} [{j.status}]
                                </option>
                              ))}
                            </select>
                            <button onClick={handleLinkJob} className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Link</button>
                            <button onClick={() => setLinkForm(null)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <AddOperationForm
              partId={current.id}
              onAdded={(op) => setCurrent((prev) => ({ ...prev, operations: [...prev.operations, op] }))}
            />
          </div>

          {/* Attachments */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add File"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.pdf,.stp,.step"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>

            {attachments.length === 0 && !uploading && (
              <p className="text-xs text-gray-400">No attachments.</p>
            )}

            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 py-1">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  att.type === "DXF" ? "bg-orange-100 text-orange-600" :
                  att.type === "PDF" ? "bg-red-100 text-red-600" :
                  "bg-blue-100 text-blue-600"
                }`}>
                  {att.type}
                </span>
                {att.url ? (
                  <a href={att.url} className="text-xs text-blue-500 hover:underline flex-1 truncate" target="_blank" rel="noreferrer">
                    {att.name}
                  </a>
                ) : att.filePath ? (
                  <a href={att.filePath} className="text-xs text-blue-500 hover:underline flex-1 truncate" target="_blank" rel="noreferrer">
                    {att.name}
                  </a>
                ) : (
                  <span className="text-xs flex-1 text-gray-600">{att.name}</span>
                )}
                <button onClick={() => handleDeleteAttachment(att.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>

          {/* Outsource jobs */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outsourcing {outsourceJobs.length > 0 && `(${outsourceJobs.length})`}
              </span>
              <button onClick={() => setShowOutsourceForm((v) => !v)} className="text-xs text-blue-500 hover:text-blue-700">+ Add</button>
            </div>

            {showOutsourceForm && (
              <form onSubmit={handleAddOutsource} className="mb-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {suppliers.length > 0 ? (
                    <div className="flex gap-1 col-span-1">
                      <select
                        value={outsourceForm.supplierId}
                        onChange={(e) => setOutsourceForm((f) => ({ ...f, supplierId: e.target.value, company: "" }))}
                        className="border rounded px-2 py-1 text-xs flex-1"
                      >
                        <option value="">— manual —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {!outsourceForm.supplierId && (
                        <input
                          required
                          value={outsourceForm.company}
                          onChange={(e) => setOutsourceForm((f) => ({ ...f, company: e.target.value }))}
                          placeholder="Company *"
                          className="border rounded px-2 py-1 text-xs flex-1"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      required
                      value={outsourceForm.company}
                      onChange={(e) => setOutsourceForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Company *"
                      className="border rounded px-2 py-1 text-xs"
                    />
                  )}
                  <input
                    type="date"
                    value={outsourceForm.eta}
                    onChange={(e) => setOutsourceForm((f) => ({ ...f, eta: e.target.value }))}
                    className="border rounded px-2 py-1 text-xs"
                  />
                </div>
                <input
                  value={outsourceForm.externalJobRef}
                  onChange={(e) => setOutsourceForm((f) => ({ ...f, externalJobRef: e.target.value }))}
                  placeholder="External Job Ref"
                  className="border rounded px-2 py-1 text-xs w-full"
                />
                <input
                  value={outsourceForm.notes}
                  onChange={(e) => setOutsourceForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  className="w-full border rounded px-2 py-1 text-xs"
                />
                <div className="flex gap-2">
                  <button type="submit" className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Save</button>
                  <button type="button" onClick={() => setShowOutsourceForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              </form>
            )}

            {outsourceJobs.length === 0 && !showOutsourceForm && (
              <p className="text-xs text-gray-400">No outsource jobs.</p>
            )}

            {outsourceJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-2 py-1">
                <span className="text-xs flex-1">{job.company}</span>
                {job.eta && (
                  <span className="text-xs text-gray-400">ETA: {new Date(job.eta).toLocaleDateString("pl-PL")}</span>
                )}
                <select
                  value={job.status}
                  onChange={(e) => handleOutsourceStatus(job.id, e.target.value as OutsourceStatus)}
                  className={`text-xs border rounded px-1.5 py-0.5 ${OUTSOURCE_STATUS_COLORS[job.status as OutsourceStatus]}`}
                >
                  {OUTSOURCE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
