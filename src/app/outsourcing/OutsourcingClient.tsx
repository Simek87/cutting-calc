"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { OutsourceStatus, OUTSOURCE_STATUS_COLORS, Supplier } from "@/lib/types";
import { isOutsourceJobOverdue, getEtaLabel } from "@/lib/blockers";
import { FilterBar } from "@/components/FilterBar";

interface Job {
  id: string;
  partId: string;
  partName: string;
  toolName: string;
  toolId: string;
  company: string;
  supplierId: string | null;
  status: OutsourceStatus;
  sentDate: string | null;
  eta: string | null;
  notes: string | null;
  externalJobRef: string | null;
}

const STATUSES: OutsourceStatus[] = ["Pending", "Sent", "InProgress", "Done", "Cancelled"];

function EtaBadge({ eta, status }: { eta: string | null; status: OutsourceStatus }) {
  if (status === "Done" || status === "Cancelled") return null;
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

const inputCls = "bg-[#0d0f10] border border-[#2a2d30] text-[#e2e4e6] placeholder-[#4e5560] rounded px-2 py-1 text-xs outline-none focus:border-[#4e5560] w-full";
const labelCls = "block text-xs text-[#4e5560] mb-0.5";

export function OutsourcingClient({ jobs: initial, suppliers }: { jobs: Job[]; suppliers: Supplier[] }) {
  const [jobs, setJobs] = useState<Job[]>(initial);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ supplierId: "", company: "", externalJobRef: "", sentDate: "", eta: "", notes: "" });

  const startEdit = (job: Job) => {
    setEditingId(job.id);
    setEditForm({
      supplierId: job.supplierId ?? "",
      company: job.company,
      externalJobRef: job.externalJobRef ?? "",
      sentDate: job.sentDate ? job.sentDate.slice(0, 10) : "",
      eta: job.eta ? job.eta.slice(0, 10) : "",
      notes: job.notes ?? "",
    });
  };

  const handleEdit = async (id: string) => {
    setUpdatingId(id);
    const resolvedCompany = editForm.supplierId
      ? (suppliers.find((s) => s.id === editForm.supplierId)?.name ?? editForm.company)
      : editForm.company;
    const payload = { ...editForm, company: resolvedCompany };
    const res = await fetch(`/api/outsourcing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updated, company: resolvedCompany, supplierId: editForm.supplierId || null, eta: updated.eta ?? null, sentDate: updated.sentDate ?? null } : j)));
    setEditingId(null);
    setUpdatingId(null);
  };

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OutsourceStatus | "">("");
  const [filterCompany, setFilterCompany] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const companyOptions = useMemo(() => [...new Set(jobs.map((j) => j.company))].sort(), [jobs]);
  const isFiltered = !!(search || filterStatus || filterCompany || overdueOnly);
  const resetFilters = () => { setSearch(""); setFilterStatus(""); setFilterCompany(""); setOverdueOnly(false); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter((j) => {
      if (filterStatus && j.status !== filterStatus) return false;
      if (filterCompany && j.company !== filterCompany) return false;
      if (overdueOnly && !isOutsourceJobOverdue(j)) return false;
      if (q &&
          !j.partName.toLowerCase().includes(q) &&
          !j.company.toLowerCase().includes(q) &&
          !j.toolName.toLowerCase().includes(q) &&
          !(j.notes ?? "").toLowerCase().includes(q) &&
          !(j.externalJobRef ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, search, filterStatus, filterCompany, overdueOnly]);

  const handleStatus = async (id: string, status: OutsourceStatus) => {
    setUpdatingId(id);
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    await fetch(`/api/outsourcing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await fetch(`/api/outsourcing/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#e2e4e6]">Outsourcing</h1>
        <span className="text-sm text-[#4e5560]">{filtered.length} / {jobs.length} jobs</span>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search part, company, tool, ref..."
        status={filterStatus}
        onStatus={(v) => setFilterStatus(v as OutsourceStatus | "")}
        statusOptions={STATUSES.map((s) => ({ value: s, label: s }))}
        supplier={filterCompany}
        onSupplier={setFilterCompany}
        supplierOptions={companyOptions}
        supplierLabel="All companies"
        overdueOnly={overdueOnly}
        onOverdueOnly={setOverdueOnly}
        onReset={resetFilters}
        isFiltered={isFiltered}
      />

      {filtered.length === 0 && (
        <p className="text-sm text-[#4e5560] text-center py-12 border border-dashed border-[#2a2d30] rounded-lg">
          {jobs.length === 0 ? "No outsource jobs yet. Add them from the tool detail page." : "No results match filters."}
        </p>
      )}

      <div className="border border-[#2a2d30] rounded-lg divide-y divide-[#2a2d30] bg-[#141618]">
        {filtered.map((job) => (
          <div key={job.id}>
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#e2e4e6]">{job.partName}</span>
                  <span className="text-xs text-[#2a2d30]">·</span>
                  <Link href={`/tools/${job.toolId}`} className="text-xs text-blue-400 hover:underline truncate">
                    {job.toolName}
                  </Link>
                  <EtaBadge eta={job.eta} status={job.status} />
                </div>
                <div className="text-xs text-[#8b9196] mt-0.5 flex flex-wrap gap-x-3">
                  <span className="font-medium text-[#8b9196]">{job.company}</span>
                  {job.supplierId && (() => {
                    const s = suppliers.find((s) => s.id === job.supplierId);
                    return s ? (
                      <a href={`mailto:${s.email}`} className="text-blue-400 hover:text-blue-300" title={s.email}>✉</a>
                    ) : null;
                  })()}
                  {job.externalJobRef && <span>Ref: {job.externalJobRef}</span>}
                  {job.sentDate && <span>Sent: {new Date(job.sentDate).toLocaleDateString("pl-PL")}</span>}
                  {job.eta && <span>ETA: {new Date(job.eta).toLocaleDateString("pl-PL")}</span>}
                </div>
                {job.notes && <div className="text-xs text-[#4e5560] mt-0.5 truncate">{job.notes}</div>}
              </div>

              {/* Quick actions */}
              <div className={`flex items-center gap-1 shrink-0 flex-wrap justify-end transition-opacity ${updatingId === job.id ? "opacity-50 pointer-events-none" : ""}`}>
                {job.status === "Pending" && (
                  <button onClick={() => handleStatus(job.id, "Sent")} className="text-xs border border-blue-600/40 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/20">
                    Mark Sent
                  </button>
                )}
                {job.status === "Sent" && (
                  <button onClick={() => handleStatus(job.id, "InProgress")} className="text-xs border border-amber-600/40 text-amber-400 px-2 py-1 rounded hover:bg-amber-900/20">
                    In Progress
                  </button>
                )}
                {(job.status === "Sent" || job.status === "InProgress") && (
                  <button onClick={() => handleStatus(job.id, "Done")} className="text-xs border border-green-600/40 text-green-400 px-2 py-1 rounded hover:bg-green-900/20">
                    Done
                  </button>
                )}
                <select
                  value={job.status}
                  onChange={(e) => handleStatus(job.id, e.target.value as OutsourceStatus)}
                  className={`text-xs border rounded px-2 py-1 bg-[#0d0f10] outline-none ${OUTSOURCE_STATUS_COLORS[job.status]}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => editingId === job.id ? setEditingId(null) : startEdit(job)}
                  className={`text-xs px-1.5 py-1 rounded ${editingId === job.id ? "text-blue-400" : "text-[#2a2d30] hover:text-[#8b9196]"}`}
                  title="Edit details"
                >✎</button>
                <button onClick={() => handleDelete(job.id)} className="text-[#2a2d30] hover:text-red-400 text-xs">✕</button>
              </div>
            </div>

            {editingId === job.id && (
              <div className="px-4 pb-3 pt-2 border-t border-[#2a2d30] bg-[#0d0f10]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className={labelCls}>Company / Supplier</label>
                    {suppliers.length > 0 ? (
                      <div className="flex gap-1">
                        <select
                          value={editForm.supplierId}
                          onChange={(e) => setEditForm((f) => ({ ...f, supplierId: e.target.value, company: e.target.value ? (suppliers.find((s) => s.id === e.target.value)?.name ?? f.company) : f.company }))}
                          className={inputCls + " flex-1"}
                        >
                          <option value="">— manual —</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {!editForm.supplierId && (
                          <input value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company" className={inputCls + " flex-1"} />
                        )}
                      </div>
                    ) : (
                      <input value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company" className={inputCls} />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>External Ref</label>
                    <input value={editForm.externalJobRef} onChange={(e) => setEditForm((f) => ({ ...f, externalJobRef: e.target.value }))} placeholder="REF-001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sent Date</label>
                    <input type="date" value={editForm.sentDate} onChange={(e) => setEditForm((f) => ({ ...f, sentDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ETA</label>
                    <input type="date" value={editForm.eta} onChange={(e) => setEditForm((f) => ({ ...f, eta: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Notes</label>
                    <input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(job.id)} disabled={updatingId === job.id}
                    className="text-xs bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-[#4e5560] hover:text-[#8b9196]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
