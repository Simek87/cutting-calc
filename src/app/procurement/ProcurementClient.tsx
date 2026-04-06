"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Order, OrderItem, OrderPartContext, OrderStatus, ORDER_STATUS_COLORS, Supplier } from "@/lib/types";
import { isOrderOverdue, getEtaLabel } from "@/lib/blockers";
import { FilterBar } from "@/components/FilterBar";

const STATUSES: OrderStatus[] = ["Draft", "Sent", "Received", "Cancelled"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  Draft: "Not Ordered",
  Sent: "Ordered",
  Received: "Received",
  Cancelled: "Cancelled",
};

const STATUS_PILL: Record<OrderStatus, string> = {
  Draft:     "bg-yellow-900/20 text-yellow-400 border border-yellow-600/30",
  Sent:      "bg-blue-900/20 text-blue-400 border border-blue-600/30",
  Received:  "bg-green-900/20 text-green-400 border border-green-600/30",
  Cancelled: "bg-[#1a1c1f] text-[#4e5560] border border-[#2a2d30]",
};

interface OperationContext {
  id: string;
  part: {
    id: string; name: string;
    tool: { id: string; projectName: string } | null;
    section: { id: string; name: string } | null;
  };
}

interface OrderWithContext extends Order {
  part?: OrderPartContext | null;
  items?: (OrderItem & { part: OrderPartContext })[];
  operations?: OperationContext[];
}

interface FormState {
  supplierId: string;
  supplier: string;
  eta: string;
  notes: string;
  poNumber: string;
  supplierQuoteRef: string;
}

const EMPTY_FORM: FormState = { supplierId: "", supplier: "", eta: "", notes: "", poNumber: "", supplierQuoteRef: "" };

type ToolOption = { id: string; projectName: string };
type PartOption = { id: string; name: string; section: { id: string; name: string } | null };

function EtaBadge({ eta, status }: { eta: string | null; status: string }) {
  if (status === "Received" || status === "Cancelled") return null;
  const label = getEtaLabel(eta);
  if (!label) return null;
  const map = {
    overdue:   "bg-red-900/20 text-red-400",
    today:     "bg-orange-900/20 text-orange-400",
    this_week: "bg-yellow-900/20 text-yellow-400",
  };
  const text = { overdue: "Overdue", today: "Due Today", this_week: "This Week" };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[label]}`}>{text[label]}</span>;
}

type ContextLine = { toolId: string; toolName: string; section: string | null; part: string };

function getContextLines(order: OrderWithContext): ContextLine[] {
  if (order.items && order.items.length > 0) {
    const seen = new Set<string>();
    return order.items.filter((item) => {
      const key = item.part.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item) => ({
      toolId: item.part.tool?.id ?? "",
      toolName: item.part.tool?.projectName ?? "Unknown tool",
      section: item.part.section?.name ?? null,
      part: item.part.name,
    }));
  }
  if (order.part) {
    return [{ toolId: order.part.tool?.id ?? "", toolName: order.part.tool?.projectName ?? "Unknown tool", section: order.part.section?.name ?? null, part: order.part.name }];
  }
  const seen = new Set<string>();
  return (order.operations ?? []).filter((op) => {
    const key = op.part.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((op) => ({
    toolId: op.part.tool?.id ?? "",
    toolName: op.part.tool?.projectName ?? "Unknown tool",
    section: op.part.section?.name ?? null,
    part: op.part.name,
  }));
}

const inputCls = "bg-[#0d0f10] border border-[#2a2d30] text-[#e2e4e6] placeholder-[#4e5560] rounded px-2 py-1.5 text-sm outline-none focus:border-[#4e5560] w-full";
const labelCls = "block text-xs text-[#4e5560] mb-1";

export function ProcurementClient({ orders: initial, suppliers }: { orders: OrderWithContext[]; suppliers: Supplier[] }) {
  const [orders, setOrders] = useState<OrderWithContext[]>(initial);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ poNumber: "", supplierQuoteRef: "", eta: "", notes: "" });
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const [formTools, setFormTools] = useState<ToolOption[]>([]);
  const [formToolId, setFormToolId] = useState("");
  const [formParts, setFormParts] = useState<PartOption[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ partId: string; qty: number }[]>([]);

  useEffect(() => {
    if (!adding) return;
    fetch("/api/tools")
      .then((r) => r.json())
      .then((tools: { id: string; projectName: string }[]) =>
        setFormTools(tools.map((t) => ({ id: t.id, projectName: t.projectName })))
      );
  }, [adding]);

  useEffect(() => {
    if (!formToolId) { setFormParts([]); setSelectedParts([]); return; }
    fetch(`/api/tools/${formToolId}/parts`)
      .then((r) => r.json())
      .then((parts: PartOption[]) => {
        setFormParts(parts);
        setSelectedParts([]);
      });
  }, [formToolId]);

  const toggleExpand = (id: string) =>
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePartSelect = (partId: string) => {
    setSelectedParts((prev) => {
      const exists = prev.find((p) => p.partId === partId);
      if (exists) return prev.filter((p) => p.partId !== partId);
      return [...prev, { partId, qty: 1 }];
    });
  };

  const setPartQty = (partId: string, qty: number) =>
    setSelectedParts((prev) => prev.map((p) => p.partId === partId ? { ...p, qty } : p));

  const startEdit = (order: OrderWithContext) => {
    setEditingId(order.id);
    setEditForm({
      poNumber: order.poNumber ?? "",
      supplierQuoteRef: order.supplierQuoteRef ?? "",
      eta: order.eta ? order.eta.slice(0, 10) : "",
      notes: order.notes ?? "",
    });
  };

  const handleEdit = async (id: string) => {
    setUpdatingId(id);
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated, eta: updated.eta ?? null } : o)));
    setEditingId(null);
    setUpdatingId(null);
  };

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "">("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const supplierOptions = useMemo(() => [...new Set(orders.map((o) => o.supplier))].sort(), [orders]);
  const isFiltered = !!(search || filterStatus || filterSupplier || overdueOnly);
  const resetFilters = () => { setSearch(""); setFilterStatus(""); setFilterSupplier(""); setOverdueOnly(false); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterSupplier && o.supplier !== filterSupplier) return false;
      if (overdueOnly && !isOrderOverdue(o.eta, o.status)) return false;
      if (q) {
        const ctxStr = getContextLines(o).map((c) => `${c.toolName} ${c.section ?? ""} ${c.part}`).join(" ").toLowerCase();
        if (
          !o.supplier.toLowerCase().includes(q) &&
          !(o.notes ?? "").toLowerCase().includes(q) &&
          !(o.poNumber ?? "").toLowerCase().includes(q) &&
          !(o.supplierQuoteRef ?? "").toLowerCase().includes(q) &&
          !ctxStr.includes(q)
        ) return false;
      }
      return true;
    });
  }, [orders, search, filterStatus, filterSupplier, overdueOnly]);

  const grouped = useMemo(() =>
    filtered.reduce<Record<string, OrderWithContext[]>>((acc, o) => {
      (acc[o.supplier] ??= []).push(o);
      return acc;
    }, {}),
  [filtered]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedName = form.supplierId
      ? (suppliers.find((s) => s.id === form.supplierId)?.name ?? "")
      : form.supplier.trim();
    if (!resolvedName) return;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        supplier: resolvedName,
        items: selectedParts.length ? selectedParts : undefined,
      }),
    });
    const order = await res.json();
    setOrders((prev) => [order, ...prev]);
    setForm(EMPTY_FORM);
    setFormToolId("");
    setFormParts([]);
    setSelectedParts([]);
    setAdding(false);
  };

  const handleStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#e2e4e6]">Procurement</h1>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm bg-[#1a1c1f] border border-[#2a2d30] text-[#e2e4e6] px-3 py-1.5 rounded hover:bg-[#22262b]"
        >
          + New Order
        </button>
      </div>

      <FilterBar
        search={search} onSearch={setSearch}
        searchPlaceholder="Search supplier, tool, part, PO..."
        status={filterStatus} onStatus={(v) => setFilterStatus(v as OrderStatus | "")}
        statusOptions={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        supplier={filterSupplier} onSupplier={setFilterSupplier}
        supplierOptions={supplierOptions}
        overdueOnly={overdueOnly} onOverdueOnly={setOverdueOnly}
        onReset={resetFilters} isFiltered={isFiltered}
      />

      {/* New Order form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-[#141618] border border-[#2a2d30] rounded-lg p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Supplier *</label>
              {suppliers.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value, supplier: "" }))}
                    className={inputCls}
                  >
                    <option value="">— type manually —</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {!form.supplierId && (
                    <input required value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                      className={inputCls} placeholder="Supplier name" />
                  )}
                </div>
              ) : (
                <input required value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className={inputCls} placeholder="e.g. Hasco" />
              )}
            </div>
            <div>
              <label className={labelCls}>ETA</label>
              <input type="date" value={form.eta} onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>PO Number</label>
              <input value={form.poNumber} onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))}
                className={inputCls} placeholder="PO-2026-001" />
            </div>
            <div>
              <label className={labelCls}>Quote Ref</label>
              <input value={form.supplierQuoteRef} onChange={(e) => setForm((f) => ({ ...f, supplierQuoteRef: e.target.value }))}
                className={inputCls} placeholder="QR-123" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputCls + " resize-none"} rows={2} />
          </div>

          {/* Part picker */}
          <div>
            <div className="text-xs font-semibold text-[#4e5560] mb-2 uppercase tracking-wide">Parts (optional)</div>
            <div className="mb-2">
              <select value={formToolId} onChange={(e) => setFormToolId(e.target.value)} className={inputCls}>
                <option value="">— select tool —</option>
                {formTools.map((t) => <option key={t.id} value={t.id}>{t.projectName}</option>)}
              </select>
            </div>
            {formParts.length > 0 && (
              <div className="border border-[#2a2d30] rounded divide-y divide-[#2a2d30] text-sm max-h-48 overflow-y-auto">
                {formParts.map((p) => {
                  const sel = selectedParts.find((s) => s.partId === p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#1a1c1f] ${sel ? "bg-blue-900/20" : ""}`}>
                      <input type="checkbox" checked={!!sel} onChange={() => togglePartSelect(p.id)} className="shrink-0" />
                      <span className="flex-1 min-w-0 text-[#e2e4e6]">
                        {p.section && <span className="text-[#4e5560] mr-1">{p.section.name} →</span>}
                        <span>{p.name}</span>
                      </span>
                      {sel && (
                        <input
                          type="number" min={1} value={sel.qty}
                          onChange={(e) => setPartQty(p.id, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.preventDefault()}
                          className="w-14 bg-[#0d0f10] border border-[#2a2d30] text-[#e2e4e6] rounded px-1.5 py-0.5 text-xs text-center"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {selectedParts.length > 0 && (
              <div className="text-xs text-blue-400 mt-1">{selectedParts.length} part{selectedParts.length > 1 ? "s" : ""} selected</div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-600">Add Order</button>
            <button type="button" onClick={() => { setAdding(false); setFormToolId(""); setSelectedParts([]); }}
              className="text-sm text-[#4e5560] hover:text-[#8b9196]">Cancel</button>
          </div>
        </form>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-[#4e5560] text-center py-12 border border-dashed border-[#2a2d30] rounded-lg">
          {orders.length === 0 ? "No orders yet." : "No results match filters."}
        </p>
      )}

      {Object.entries(grouped).map(([supplier, items]) => {
        const linkedSupplier = suppliers.find((s) => items.some((o) => o.supplierId === s.id));
        return (
          <div key={supplier} className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#4e5560] mb-2 flex items-center gap-2">
              <span>{supplier} <span className="font-normal">({items.length})</span></span>
              {linkedSupplier && (
                <a href={`mailto:${linkedSupplier.email}`}
                  className="text-blue-400 hover:text-blue-300 normal-case font-normal tracking-normal"
                  title={linkedSupplier.email}>
                  ✉ {linkedSupplier.email}
                </a>
              )}
            </div>
            <div className="border border-[#2a2d30] rounded-lg divide-y divide-[#2a2d30] bg-[#141618]">
              {items.map((order) => {
                const contexts = getContextLines(order);
                const hasItems = (order.items?.length ?? 0) > 0;
                const itemCount = order.items?.length ?? 0;
                const toolName = contexts[0]?.toolName;
                const toolId = contexts[0]?.toolId;
                const isOverdue = isOrderOverdue(order.eta, order.status);
                const blockingCount = order.status !== "Received" && order.status !== "Cancelled"
                  ? (hasItems ? itemCount : contexts.length)
                  : 0;
                const isExpanded = expandedOrders.has(order.id);
                const rowHighlight = isOverdue
                  ? "border-l-2 border-l-red-500"
                  : order.status === "Draft"
                  ? "border-l-2 border-l-yellow-500"
                  : "";

                return (
                  <div key={order.id}>
                    <div className={`px-4 py-3 space-y-1.5 ${rowHighlight}`}>

                      {/* PRIMARY: tool name + item count + status pill */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {toolName ? (
                            <>
                              <span className="font-bold text-[#e2e4e6]">{toolName}</span>
                              {itemCount > 0 && (
                                <button
                                  onClick={() => toggleExpand(order.id)}
                                  className="text-xs text-[#4e5560] hover:text-[#8b9196] flex items-center gap-0.5"
                                >
                                  <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                                  <span>{isExpanded ? " ▲" : " ▼"}</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-[#4e5560] italic">
                              {order.notes || order.poNumber || order.supplier}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_PILL[order.status]}`}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>

                      {/* Expanded items list */}
                      {isExpanded && hasItems && (
                        <div className="pl-3 border-l-2 border-[#2a2d30] space-y-0.5">
                          {order.items!.map((item) => (
                            <div key={item.id} className="text-xs text-[#8b9196]">
                              {item.part.section?.name && (
                                <span className="text-[#4e5560]">{item.part.section.name} → </span>
                              )}
                              <span>{item.part.name}</span>
                              <span className="text-[#4e5560]"> ×{item.qty}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Blocking + Open Tool */}
                      {(blockingCount > 0 || toolId) && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {blockingCount > 0 && (
                            <span className="text-xs font-semibold text-red-400 bg-red-900/20 border border-red-600/30 px-2 py-0.5 rounded-full">
                              ⚠ {blockingCount === 1 ? `Blocking: ${contexts[0].part}` : `Blocking ${blockingCount} parts`}
                            </span>
                          )}
                          {toolId && (
                            <Link href={`/tools/${toolId}`} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                              Open Tool →
                            </Link>
                          )}
                        </div>
                      )}

                      {/* SECONDARY: metadata + actions */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 text-xs text-[#4e5560]">
                          {order.eta && <span>ETA {new Date(order.eta).toLocaleDateString("pl-PL")}</span>}
                          <EtaBadge eta={order.eta} status={order.status} />
                          {order.poNumber && <><span className="text-[#2a2d30]">·</span><span>PO {order.poNumber}</span></>}
                          {order.supplierQuoteRef && <><span className="text-[#2a2d30]">·</span><span>QR {order.supplierQuoteRef}</span></>}
                          {order.notes && <><span className="text-[#2a2d30]">·</span><span className="truncate max-w-xs">{order.notes}</span></>}
                        </div>
                        <div className={`flex items-center gap-1 shrink-0 transition-opacity ${updatingId === order.id ? "opacity-50 pointer-events-none" : ""}`}>
                          {order.status === "Draft" && (
                            <button onClick={() => handleStatus(order.id, "Sent")} className="text-xs border border-blue-600/40 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/20">
                              Mark Ordered
                            </button>
                          )}
                          {order.status === "Sent" && (
                            <button onClick={() => handleStatus(order.id, "Received")} className="text-xs border border-green-600/40 text-green-400 px-2 py-1 rounded hover:bg-green-900/20">
                              Mark Received
                            </button>
                          )}
                          <select
                            value={order.status}
                            onChange={(e) => handleStatus(order.id, e.target.value as OrderStatus)}
                            className={`text-xs border rounded px-2 py-1 bg-[#0d0f10] outline-none ${ORDER_STATUS_COLORS[order.status]}`}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </select>
                          <button
                            onClick={() => editingId === order.id ? setEditingId(null) : startEdit(order)}
                            className={`text-xs px-1.5 py-1 rounded ${editingId === order.id ? "text-blue-400" : "text-[#2a2d30] hover:text-[#8b9196]"}`}
                            title="Edit details"
                          >✎</button>
                          <button onClick={() => handleDelete(order.id)} className="text-[#2a2d30] hover:text-red-400 text-xs">✕</button>
                        </div>
                      </div>
                    </div>

                    {/* Edit form */}
                    {editingId === order.id && (
                      <div className="px-4 pb-3 pt-2 border-t border-[#2a2d30] bg-[#0d0f10]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}>PO Number</label>
                            <input value={editForm.poNumber} onChange={(e) => setEditForm((f) => ({ ...f, poNumber: e.target.value }))}
                              placeholder="PO-2026-001" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Quote Ref</label>
                            <input value={editForm.supplierQuoteRef} onChange={(e) => setEditForm((f) => ({ ...f, supplierQuoteRef: e.target.value }))}
                              placeholder="QR-123" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>ETA</label>
                            <input type="date" value={editForm.eta} onChange={(e) => setEditForm((f) => ({ ...f, eta: e.target.value }))}
                              className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Notes</label>
                            <input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                              placeholder="Notes" className={inputCls} />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEdit(order.id)} disabled={updatingId === order.id}
                            className="text-xs bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-[#4e5560] hover:text-[#8b9196]">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
