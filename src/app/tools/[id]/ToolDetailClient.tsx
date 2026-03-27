"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tool, ALL_TOOL_STATUSES, ToolStatus, OUTSOURCE_STATUS_COLORS, OutsourceStatus, Order, OrderStatus, ORDER_STATUS_COLORS, Section, Family, Supplier, FIXED_SECTIONS, isOpEffectivelyComplete, getEffectiveStatus, OP_STATUS_LABELS } from "@/lib/types";
import { PartRow } from "@/components/PartRow";
import { AddPartForm } from "@/components/AddPartForm";
import { LaserEmailModal } from "@/components/LaserEmailModal";
import { getPartBlockReasons, getEtaLabel, isOrderOverdue } from "@/lib/blockers";
import { ActivityFeed } from "@/components/ActivityFeed";
import type { ActivityEntry } from "@/lib/activity-types";

interface ToolDetailClientProps {
  tool: Tool;
  orders: Order[];
  families: Family[];
  suppliers: Supplier[];
}

const OP_TYPE_COLORS: Record<string, string> = {
  internal:    "bg-gray-100 text-gray-600",
  procurement: "bg-purple-100 text-purple-700",
  outsource:   "bg-yellow-100 text-yellow-700",
  inspection:  "bg-orange-100 text-orange-700",
  assembly:    "bg-blue-100 text-blue-700",
};

// Priority for next-action sorting: procurement first, then outsource, then internal work
const OP_TYPE_PRIORITY: Record<string, number> = {
  procurement: 1,
  outsource:   2,
  internal:    3,
  inspection:  3,
  assembly:    3,
};

function getBlockerDetail(reason: string, part: Tool["parts"][0]): string {
  const ops = part.operations;
  if (reason === "procurement_pending") {
    const procOp = ops.find(
      (o) => o.type === "procurement" || o.name.toLowerCase() === "order material"
    );
    const eff = procOp ? getEffectiveStatus(procOp) : null;
    if (eff === "Ordered") return "Ordered — waiting for delivery";
    return "Needs to be ordered";
  }
  if (reason === "outsource_overdue") {
    const overdueOp = ops.find(
      (o) => o.type === "outsource" && o.linkedJob?.eta && new Date(o.linkedJob.eta) < new Date() && getEffectiveStatus(o) !== "Done"
    );
    return overdueOp?.linkedJob ? `Outsourcing overdue — ${overdueOp.linkedJob.company}` : "Outsourcing overdue";
  }
  if (reason === "outsource_pending") {
    const pendingOp = ops.find((o) => o.type === "outsource" && getEffectiveStatus(o) !== "Done");
    return pendingOp?.linkedJob ? `Outsourcing in progress — ${pendingOp.linkedJob.company}` : "Outsourcing in progress";
  }
  if (reason === "operation_blocked") {
    for (let i = 1; i < ops.length; i++) {
      const cur = ops[i];
      const prev = ops[i - 1];
      const effCur = getEffectiveStatus(cur);
      const notYetStarted = effCur === "NotStarted" || effCur === "NotOrdered" || effCur === "Pending";
      if (cur.dependsOnPrevious && !isOpEffectivelyComplete(prev) && !notYetStarted) {
        return `${cur.name} waiting on ${prev.name}`;
      }
    }
    return "Operation blocked";
  }
  return reason;
}

function EtaBadge({ eta }: { eta: string | null }) {
  const label = getEtaLabel(eta);
  if (!label) return null;
  const map = {
    overdue: "bg-red-100 text-red-700",
    today: "bg-orange-100 text-orange-700",
    this_week: "bg-yellow-100 text-yellow-700",
  };
  const text = { overdue: "Overdue", today: "Due Today", this_week: "This Week" };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[label]}`}>
      {text[label]}
    </span>
  );
}

export function ToolDetailClient({ tool: initialTool, orders, families, suppliers }: ToolDetailClientProps) {
  const [tool, setTool] = useState<Tool>(initialTool);
  const [sections, setSections] = useState<Section[]>(initialTool.sections ?? []);
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);
  const [highlightPartId, setHighlightPartId] = useState<string | null>(null);
  const [showLaserModal, setShowLaserModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState<string>(FIXED_SECTIONS[0]);
  const [showSectionForm, setShowSectionForm] = useState(false);
  // Triggers the PartRow to expand and open an order form (set from the Blockers panel)
  const [pendingOrderTrigger, setPendingOrderTrigger] = useState<{ partId: string; opId: string; mode: "create-order" | "link-order" } | null>(null);

  const triggerOrderFormForPart = (partId: string, opId: string, mode: "create-order" | "link-order") => {
    setHighlightPartId(partId);
    setPendingOrderTrigger({ partId, opId, mode });
    setTimeout(() => {
      const el = document.getElementById(`part-${partId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  useEffect(() => {
    fetch(`/api/activity?toolId=${initialTool.id}&limit=10`)
      .then((r) => r.json())
      .then(setActivityLogs)
      .catch(() => {});
  }, [initialTool.id]);

  // Scroll to and highlight a part when navigated via activity link (#part-[id])
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#part-")) return;
    const partId = hash.slice("#part-".length);
    setHighlightPartId(partId);
    // Wait for expand + render, then scroll
    const t = setTimeout(() => {
      const el = document.getElementById(`part-${partId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    // Remove highlight after 2.5s
    const t2 = setTimeout(() => setHighlightPartId(null), 2500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const handleStatusChange = async (status: ToolStatus) => {
    setTool((t) => ({ ...t, status }));
    await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const handleFamilyChange = async (familyId: string) => {
    const fid = familyId || null;
    setTool((t) => ({ ...t, familyId: fid, family: families.find((f) => f.id === fid) ?? null }));
    await fetch(`/api/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: fid }),
    });
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSectionName.trim(), toolId: tool.id }),
    });
    const section = await res.json();
    setSections((prev) => [...prev, section]);
    setNewSectionName("");
    setShowSectionForm(false);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section? Parts will become unassigned.")) return;
    await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const handlePartAdded = (part: Tool["parts"][0]) => {
    setTool((t) => ({ ...t, parts: [...t.parts, part] }));
  };

  const handlePartUpdated = (updated: Tool["parts"][0]) => {
    setTool((t) => ({
      ...t,
      parts: t.parts.map((p) => (p.id === updated.id ? updated : p)),
    }));
  };

  const handlePartDeleted = (partId: string) => {
    setTool((t) => ({ ...t, parts: t.parts.filter((p) => p.id !== partId) }));
  };

  const totalOps = tool.parts.reduce((a, p) => a + p.operations.length, 0);
  const doneOps = tool.parts.reduce(
    (a, p) => a + p.operations.filter(isOpEffectivelyComplete).length, 0
  );
  const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;

  const blockedParts = tool.parts.filter((p) => getPartBlockReasons(p).length > 0);
  const laserParts = tool.parts.filter((p) => p.requiresLaser);

  const openOrders = orders.filter((o) => o.status !== "Received" && o.status !== "Cancelled");

  const allJobs = tool.parts.flatMap((p) =>
    (p.outsourceJobs ?? []).map((j) => ({ ...j, partName: p.name }))
  );
  const openJobs = allJobs.filter((j) => j.status !== "Done" && j.status !== "Cancelled");

  const nextActions = tool.parts
    .map((p) => {
      const ops = p.operations;
      // Collect all candidates: incomplete and either first or predecessor satisfied
      const candidates = ops
        .map((op, i) => {
          const canStart = i === 0 || !op.dependsOnPrevious || isOpEffectivelyComplete(ops[i - 1]);
          if (!canStart || isOpEffectivelyComplete(op)) return null;
          return { partId: p.id, partName: p.name, opName: op.name, opStatus: getEffectiveStatus(op), opType: op.type };
        })
        .filter(Boolean) as { partId: string; partName: string; opName: string; opStatus: string; opType: string }[];
      if (candidates.length === 0) return null;
      // Pick the highest-priority type (procurement first, outsource second, internal last)
      candidates.sort((a, b) => (OP_TYPE_PRIORITY[a.opType] ?? 9) - (OP_TYPE_PRIORITY[b.opType] ?? 9));
      return candidates[0];
    })
    .filter(Boolean) as { partId: string; partName: string; opName: string; opStatus: string; opType: string }[];

  // Laser parts missing required info before they can be sent to cut
  const laserWarnings = tool.parts
    .filter((p) => p.requiresLaser)
    .map((p) => {
      const missing: string[] = [];
      if (!(p.attachments ?? []).some((a) => a.type === "DXF")) missing.push("DXF");
      if (!p.material) missing.push("material");
      if (!p.thickness) missing.push("thickness");
      return { part: p, missing };
    })
    .filter((w) => w.missing.length > 0);

  // Group next actions by operation name for compact display
  const nextActionGroups = Object.entries(
    nextActions.reduce<Record<string, { partId: string; partName: string; sectionName: string | null; opStatus: string; opType: string }[]>>(
      (acc, a) => {
        const sec = sections.find((s) => s.id === tool.parts.find((p) => p.id === a.partId)?.sectionId);
        (acc[a.opName] ??= []).push({
          partId: a.partId,
          partName: a.partName,
          sectionName: sec?.name ?? null,
          opStatus: a.opStatus,
          opType: a.opType,
        });
        return acc;
      },
      {}
    )
  ).map(([opName, items]) => ({ opName, opType: items[0]?.opType ?? "internal", items }))
    .sort((a, b) => (OP_TYPE_PRIORITY[a.opType] ?? 9) - (OP_TYPE_PRIORITY[b.opType] ?? 9));

  const [laserOnly, setLaserOnly] = useState(false);

  const SECTION_ORDER: string[] = [...FIXED_SECTIONS];

  const sortedSections = [...sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.name);
    const bi = SECTION_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const visibleParts = laserOnly ? tool.parts.filter((p) => p.requiresLaser) : tool.parts;

  // Group parts by section
  const partsBySection: { sectionId: string | null; sectionName: string; parts: Tool["parts"] }[] = [];
  const assignedIds = new Set<string>();

  sortedSections.forEach((sec) => {
    const sp = visibleParts.filter((p) => p.sectionId === sec.id);
    sp.forEach((p) => assignedIds.add(p.id));
    partsBySection.push({ sectionId: sec.id, sectionName: sec.name, parts: sp });
  });

  const unassigned = visibleParts.filter((p) => !assignedIds.has(p.id));
  if (unassigned.length > 0 || sections.length === 0) {
    partsBySection.push({ sectionId: null, sectionName: sections.length > 0 ? "Unassigned" : "", parts: unassigned });
  }

  const getLaserSummary = (parts: Tool["parts"]) => {
    const laser = parts.filter((p) => p.requiresLaser);
    const missingDxf = laser.filter((p) => !(p.attachments ?? []).some((a) => a.type === "DXF"));
    return { laserCount: laser.length, missingDxf: missingDxf.length };
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Tool header */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{tool.projectName}</h1>
            <div className="flex gap-4 mt-1 text-sm text-gray-500 flex-wrap">
              {tool.dueDate && (
                <span className="flex items-center gap-1.5">
                  Due: <strong>{new Date(tool.dueDate).toLocaleDateString("pl-PL")}</strong>
                  <EtaBadge eta={tool.dueDate} />
                </span>
              )}
              <span>Created: {new Date(tool.createdAt).toLocaleDateString("pl-PL")}</span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Family</label>
              <select
                value={tool.familyId ?? ""}
                onChange={(e) => handleFamilyChange(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="">— none —</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={tool.status}
                onChange={(e) => handleStatusChange(e.target.value as ToolStatus)}
                className={`border rounded px-3 py-1.5 text-sm ${tool.status === "Cancelled" ? "border-red-300 text-red-600" : ""}`}
              >
                {ALL_TOOL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Overall progress</span>
            <span>{doneOps}/{totalOps} operations ({progress}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-3 mt-2.5 text-xs flex-wrap">
            <span className="text-gray-400">{tool.parts.length} {tool.parts.length === 1 ? "part" : "parts"}</span>
            {blockedParts.length > 0 && (
              <span className="text-red-500 font-medium">⚠ {blockedParts.length} blocked</span>
            )}
            {laserParts.length > 0 && (
              <span className="text-orange-500">⚡ {laserParts.length} laser</span>
            )}
            {orders.length > 0 && (
              <span className="text-gray-400">{orders.length} open {orders.length === 1 ? "order" : "orders"}</span>
            )}
            {openJobs.length > 0 && (
              <span className="text-gray-400">{openJobs.length} outsourcing</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Blockers ─────────────────────────────────────── */}
      {blockedParts.length > 0 && (
        <div className="mb-4 border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase tracking-wider">⚠ Blockers</span>
            <span className="text-xs text-red-200 font-normal">{blockedParts.length} {blockedParts.length === 1 ? "part" : "parts"}</span>
          </div>
          <div className="divide-y divide-red-100">
            {blockedParts.map((p) => {
              const reasons = getPartBlockReasons(p);
              const sec = sections.find((s) => s.id === p.sectionId);
              const procOp = p.operations.find(
                (o) => o.type === "procurement" || o.name.toLowerCase() === "order material"
              );
              return (
                <div key={p.id} className="flex items-start gap-3 px-4 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                      {sec && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{sec.name}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {reasons.map((r) => (
                        <span key={r} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium">
                          {getBlockerDetail(r, p)}
                        </span>
                      ))}
                      {/* Procurement actions — shown directly in the Blockers panel */}
                      {reasons.includes("procurement_pending") && procOp && (
                        <>
                          {procOp.orderId && procOp.linkedOrder?.status !== "Cancelled" ? (
                            <Link
                              href="/procurement"
                              className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-medium hover:bg-blue-100"
                            >
                              Open Order ↗
                            </Link>
                          ) : (
                            <>
                              <button
                                onClick={() => triggerOrderFormForPart(p.id, procOp.id, "create-order")}
                                className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-medium hover:bg-blue-700"
                              >
                                Create Order
                              </button>
                              <button
                                onClick={() => triggerOrderFormForPart(p.id, procOp.id, "link-order")}
                                className="text-xs bg-white text-blue-600 border border-blue-300 px-2 py-0.5 rounded font-medium hover:bg-blue-50"
                              >
                                Link Order
                              </button>
                            </>
                          )}
                          <Link
                            href="/procurement"
                            className="text-xs text-gray-400 hover:text-gray-600 px-1 py-0.5"
                          >
                            Open Procurement ↗
                          </Link>
                        </>
                      )}
                      {/* Outsource actions — shown directly in the Blockers panel */}
                      {(reasons.includes("outsource_pending") || reasons.includes("outsource_overdue")) && (
                        <Link
                          href="/outsourcing"
                          className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-medium hover:bg-blue-100"
                        >
                          Open Outsourcing ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Laser warnings ────────────────────────────────── */}
      {laserWarnings.length > 0 && (
        <div className="mb-4 border border-orange-200 rounded-lg overflow-hidden">
          <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase tracking-wider">⚡ Laser — incomplete</span>
            <span className="text-xs text-orange-100 font-normal">{laserWarnings.length} {laserWarnings.length === 1 ? "part" : "parts"}</span>
          </div>
          <div className="divide-y divide-orange-100">
            {laserWarnings.map(({ part: p, missing }) => {
              const sec = sections.find((s) => s.id === p.sectionId);
              const actionLabels: Record<string, string> = {
                DXF: "Upload DXF",
                material: "Add material",
                thickness: "Add thickness",
              };
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-white flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                  {sec && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{sec.name}</span>}
                  <div className="flex gap-1.5 flex-wrap">
                    {missing.map((m) => (
                      <span key={m} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-medium">
                        {actionLabels[m] ?? `!${m}`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Next actions ──────────────────────────────────── */}
      {nextActionGroups.length > 0 && (
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2.5">
            <span className="text-sm font-bold text-white uppercase tracking-wider">Next Actions</span>
            <span className="text-xs text-gray-400 ml-2 font-normal">{nextActionGroups.length} {nextActionGroups.length === 1 ? "task" : "tasks"}</span>
          </div>
          <div className="divide-y divide-gray-100 bg-white">
            {nextActionGroups.map(({ opName, opType, items }) => {
              const inProgressItems = items.filter((i) =>
                i.opStatus === "InProgress" || i.opStatus === "Sent" || i.opStatus === "Ordered"
              );
              return (
                <div key={opName} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex items-center gap-2 w-40 shrink-0 pt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${OP_TYPE_COLORS[opType] ?? "bg-gray-100 text-gray-600"}`}>
                      {opType}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{opName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {items.map((a) => (
                        <span key={a.partId} className="text-sm text-gray-700">
                          {a.partName}
                          {a.sectionName && (
                            <span className="text-xs text-gray-400 ml-1">({a.sectionName})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inProgressItems.length > 0 && (
                      <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">
                        {inProgressItems.length}/{items.length} active
                      </span>
                    )}
                    {inProgressItems.length === 0 && items.length > 1 && (
                      <span className="text-xs text-gray-400">{items.length} parts</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Open outsourcing ──────────────────────────────── */}
      {openJobs.length > 0 && (
        <div className="mb-4 bg-white border rounded-lg px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Outsourcing <span className="font-normal text-gray-400">({openJobs.length} open)</span>
          </h2>
          <div className="divide-y divide-gray-100">
            {openJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{job.company}</span>
                    <span className="text-xs text-gray-400">→ {job.partName}</span>
                  </div>
                  {job.eta && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(job.eta).toLocaleDateString("pl-PL")}
                      </span>
                      <EtaBadge eta={job.eta} />
                    </div>
                  )}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${OUTSOURCE_STATUS_COLORS[job.status as OutsourceStatus]}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Open orders ───────────────────────────────────── */}
      {openOrders.length > 0 && (
        <div className="mb-4 bg-white border rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Procurement <span className="font-normal text-gray-400">({openOrders.length} open)</span>
            </h2>
            <Link href="/procurement" className="text-xs text-blue-500 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {openOrders.map((order) => {
              const overdue = isOrderOverdue(order.eta, order.status);
              return (
                <div key={order.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{order.supplier}</span>
                      {order.poNumber && <span className="text-xs text-gray-400">PO: {order.poNumber}</span>}
                      {order.supplierQuoteRef && <span className="text-xs text-gray-400">QR: {order.supplierQuoteRef}</span>}
                    </div>
                    {order.eta && (
                      <div className={`flex items-center gap-1.5 mt-0.5 ${overdue ? "text-red-500" : "text-gray-400"}`}>
                        <span className="text-xs">{new Date(order.eta).toLocaleDateString("pl-PL")}</span>
                        {overdue
                          ? <span className="text-xs font-medium">overdue</span>
                          : <EtaBadge eta={order.eta} />
                        }
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                    {order.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parts (BOM) */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-gray-700">
          Parts (BOM) <span className="text-gray-400 font-normal text-sm">{tool.parts.length}</span>
        </h2>
        <div className="flex gap-2 items-center flex-wrap">
          {laserParts.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs border rounded px-2 py-1 select-none hover:bg-gray-50">
              <input
                type="checkbox"
                checked={laserOnly}
                onChange={(e) => setLaserOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-orange-600 font-medium">Laser only ({laserParts.length})</span>
            </label>
          )}
          {laserParts.length > 0 && (
            <button
              onClick={() => setShowLaserModal(true)}
              className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              ⚡ Laser Email
            </button>
          )}
          <button
            onClick={() => setShowSectionForm((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 border rounded px-2 py-1"
          >
            + Section
          </button>
        </div>
      </div>

      {/* Section management */}
      {showSectionForm && (
        <form onSubmit={handleAddSection} className="mb-3 flex gap-2">
          <select
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm flex-1"
            autoFocus
          >
            {FIXED_SECTIONS.filter((name) => !sections.some((s) => s.name === name)).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button type="submit" className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-900">
            Add
          </button>
          <button type="button" onClick={() => setShowSectionForm(false)} className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50">
            Cancel
          </button>
        </form>
      )}

      {sections.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sortedSections.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {s.name}
              <button
                onClick={() => handleDeleteSection(s.id)}
                className="text-gray-300 hover:text-red-500 ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Parts grouped by section */}
      <div className="space-y-5 mb-4">
        {tool.parts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-lg">
            No parts yet.
          </p>
        )}

        {laserOnly && laserParts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-lg">
            No laser parts found.
          </p>
        )}

        {partsBySection.map(({ sectionId, sectionName, parts }) => {
          if (parts.length === 0 && (!sectionId || laserOnly)) return null;
          const { laserCount, missingDxf } = getLaserSummary(parts);
          const secTotalOps = parts.reduce((a, p) => a + p.operations.length, 0);
          const secDoneOps = parts.reduce((a, p) => a + p.operations.filter(isOpEffectivelyComplete).length, 0);
          const secProgress = secTotalOps > 0 ? Math.round((secDoneOps / secTotalOps) * 100) : null;
          return (
            <div key={sectionId ?? "__unassigned"} className={sectionId ? "border border-gray-200 rounded-lg overflow-hidden shadow-sm" : ""}>
              {sectionName && (
                sectionId ? (
                  <div className="bg-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-white uppercase tracking-widest">{sectionName}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">{parts.length} {parts.length === 1 ? "part" : "parts"}</span>
                        {secProgress !== null && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${secProgress === 100 ? "bg-green-400" : "bg-blue-400"}`}
                                style={{ width: `${secProgress}%` }}
                              />
                            </div>
                            <span className="text-gray-400 tabular-nums">{secDoneOps}/{secTotalOps}</span>
                          </div>
                        )}
                        {laserCount > 0 && <span className="text-orange-300 font-medium">⚡ {laserCount}</span>}
                        {missingDxf > 0 && <span className="text-red-300 font-medium">!DXF {missingDxf}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{sectionName}</span>
                    {laserCount > 0 && <span className="text-xs text-orange-500">⚡ {laserCount}</span>}
                  </div>
                )
              )}
              <div className={`space-y-2 ${sectionId ? "p-3" : ""}`}>
                {parts.length === 0 && sectionId && !laserOnly && (
                  <p className="text-xs text-gray-400 px-2 py-1.5">No parts in this section.</p>
                )}
                {parts.map((part) => (
                  <PartRow
                    key={part.id}
                    part={part}
                    sections={sections}
                    suppliers={suppliers}
                    allOrders={orders}
                    onUpdated={handlePartUpdated}
                    onDeleted={handlePartDeleted}
                    initialExpanded={highlightPartId === part.id}
                    highlight={highlightPartId === part.id}
                    orderFormTrigger={pendingOrderTrigger?.partId === part.id ? { opId: pendingOrderTrigger.opId, mode: pendingOrderTrigger.mode } : null}
                    onOrderFormConsumed={() => setPendingOrderTrigger(null)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddPartForm toolId={tool.id} sections={sections} onAdded={handlePartAdded} />

      {/* Activity log */}
      <div className="mt-8">
        <ActivityFeed entries={activityLogs} title="Activity" />
      </div>

      {/* Laser email modal */}
      {showLaserModal && (
        <LaserEmailModal
          toolName={tool.projectName}
          parts={tool.parts}
          sections={sections}
          onClose={() => setShowLaserModal(false)}
        />
      )}
    </div>
  );
}
