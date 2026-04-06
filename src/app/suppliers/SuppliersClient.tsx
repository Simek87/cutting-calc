"use client";

import { useState } from "react";
import { Supplier } from "@/lib/types";

interface Props {
  initialSuppliers: Supplier[];
}

const EMPTY_FORM = {
  name: "",
  email: "",
  notes: "",
  emailSubjectTemplate: "",
  emailBodyTemplate: "",
};

const inputCls = "bg-[#0d0f10] border border-[#2a2d30] text-[#e2e4e6] placeholder-[#4e5560] rounded px-2 py-1.5 text-sm outline-none focus:border-[#4e5560] w-full";
const labelCls = "block text-xs text-[#4e5560] mb-1";

export function SuppliersClient({ initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      email: s.email,
      notes: s.notes ?? "",
      emailSubjectTemplate: s.emailSubjectTemplate ?? "",
      emailBodyTemplate: s.emailBodyTemplate ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    try {
      if (editId) {
        const res = await fetch(`/api/suppliers/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const updated = await res.json();
        setSuppliers((prev) => prev.map((s) => (s.id === editId ? updated : s)));
      } else {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowForm(false);
      setEditId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#e2e4e6]">Suppliers</h1>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-[#1a1c1f] border border-[#2a2d30] text-[#e2e4e6] text-sm rounded hover:bg-[#22262b]"
        >
          + Add Supplier
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 border border-[#2a2d30] rounded-lg p-4 bg-[#141618] space-y-3">
          <h2 className="text-sm font-semibold text-[#e2e4e6]">{editId ? "Edit Supplier" : "New Supplier"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Default Email Subject Template</label>
            <input
              value={form.emailSubjectTemplate}
              onChange={(e) => setForm({ ...form, emailSubjectTemplate: e.target.value })}
              placeholder="e.g. Laser parts request – {toolName}"
              className={inputCls + " font-mono"}
            />
          </div>
          <div>
            <label className={labelCls}>Default Email Body Template</label>
            <textarea
              value={form.emailBodyTemplate}
              onChange={(e) => setForm({ ...form, emailBodyTemplate: e.target.value })}
              placeholder={"e.g. Hi,\n\nPlease quote the following parts:\n{partList}\n\nRegards"}
              rows={5}
              className={inputCls + " font-mono resize-none"}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "..." : editId ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-3 py-1.5 text-sm border border-[#2a2d30] text-[#8b9196] rounded hover:bg-[#1a1c1f]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {suppliers.length === 0 ? (
        <p className="text-sm text-[#4e5560] text-center py-12 border border-dashed border-[#2a2d30] rounded-lg">
          No suppliers yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="border border-[#2a2d30] rounded-lg bg-[#141618] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-sm text-[#e2e4e6]">{s.name}</span>
                    <a
                      href={`mailto:${s.email}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {s.email}
                    </a>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-[#8b9196] mt-1">{s.notes}</p>
                  )}
                  {s.emailSubjectTemplate && (
                    <p className="text-xs text-[#4e5560] mt-1 font-mono truncate">
                      Subject: {s.emailSubjectTemplate}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-[#8b9196] hover:text-[#e2e4e6] border border-[#2a2d30] rounded px-2 py-1 hover:bg-[#1a1c1f]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-xs text-[#4e5560] hover:text-red-400 border border-[#2a2d30] rounded px-2 py-1 hover:bg-[#1a1c1f]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
