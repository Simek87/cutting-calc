"use client";

import { useState } from "react";
import { Part, PartType, Section } from "@/lib/types";
import { OPERATION_TEMPLATES } from "@/lib/operation-templates";

interface AddPartFormProps {
  toolId: string;
  sections?: Section[];
  onAdded: (part: Part) => void;
}

export function AddPartForm({ toolId, sections = [], onAdded }: AddPartFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default to the first non-N/A section if one exists, otherwise first section, otherwise ""
  const defaultSectionId = (() => {
    if (sections.length === 0) return "";
    const preferred = sections.find((s) => s.name !== "N/A");
    return preferred?.id ?? sections[0].id;
  })();

  const [form, setForm] = useState({
    name: "",
    type: "standard" as PartType,
    quantity: 1,
    material: "",
    size: "",
    thickness: "",
    drawingRef: "",
    template: "milled",
    sectionId: defaultSectionId,
  });

  const selectedTemplate = OPERATION_TEMPLATES.find((t) => t.id === form.template);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${toolId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const part = await res.json();
      onAdded(part);
      setForm({ name: "", type: "standard", quantity: 1, material: "", size: "", thickness: "", drawingRef: "", template: "milled", sectionId: defaultSectionId });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 text-sm border border-dashed border-gray-300 rounded w-full text-gray-500 hover:border-blue-400 hover:text-blue-500"
      >
        + Add Part
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Part Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Punch plate"
            className="w-full border rounded px-2 py-1.5 text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as PartType })}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="standard">Standard</option>
            <option value="custom">Custom</option>
            <option value="outsource">Outsource</option>
          </select>
        </div>
        <div className="w-16">
          <label className="block text-xs text-gray-500 mb-1">Qty</label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        {sections.length > 0 && (
          <div className="min-w-[110px]">
            <label className="block text-xs text-gray-500 mb-1">Section</label>
            <select
              value={form.sectionId}
              onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">— none —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-[90px]">
          <label className="block text-xs text-gray-500 mb-1">Material</label>
          <input
            type="text"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            placeholder="e.g. S355"
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="min-w-[110px]">
          <label className="block text-xs text-gray-500 mb-1">Size</label>
          <input
            type="text"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            placeholder="200×150"
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="w-20">
          <label className="block text-xs text-gray-500 mb-1">Thickness</label>
          <input
            type="text"
            value={form.thickness}
            onChange={(e) => setForm({ ...form, thickness: e.target.value })}
            placeholder="10 mm"
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="min-w-[100px]">
          <label className="block text-xs text-gray-500 mb-1">Drawing Ref</label>
          <input
            type="text"
            value={form.drawingRef}
            onChange={(e) => setForm({ ...form, drawingRef: e.target.value })}
            placeholder="DWG-001"
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Template selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Operations template</label>
        <div className="flex flex-wrap gap-1.5">
          {OPERATION_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm({ ...form, template: t.id })}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                form.template === t.id
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {selectedTemplate && selectedTemplate.operations.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {selectedTemplate.operations.map((op) => (
              <span key={op.order} className="text-xs text-gray-400">
                {op.order}. {op.name}
                {op.order < selectedTemplate.operations.length ? " ·" : ""}
              </span>
            ))}
          </div>
        )}
        {selectedTemplate && selectedTemplate.operations.length === 0 && (
          <p className="mt-1 text-xs text-gray-400">Part will be created without operations. You can add them manually.</p>
        )}
      </div>

      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
