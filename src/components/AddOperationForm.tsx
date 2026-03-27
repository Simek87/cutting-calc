"use client";

import { useState } from "react";
import { Operation, OperationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddOperationFormProps {
  partId: string;
  onAdded: (op: Operation) => void;
}

export function AddOperationForm({ partId, onAdded }: AddOperationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "internal" as OperationType,
    machine: "",
    supplier: "",
    estimatedTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/parts/${partId}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedTime: form.estimatedTime ? parseFloat(form.estimatedTime) : null,
        }),
      });
      const op = await res.json();
      onAdded(op);
      setForm({ name: "", type: "internal", machine: "", supplier: "", estimatedTime: "" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(true)}>
        + Add Operation
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-dashed border-blue-200 rounded p-2 bg-blue-50"
    >
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-gray-500 mb-1 block">Operation *</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Milling"
            autoFocus
            className="h-7 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as OperationType })}
            className="h-7 text-sm border rounded px-1.5"
          >
            <option value="internal">Internal</option>
            <option value="outsource">Outsource</option>
            <option value="inspection">Inspection</option>
            <option value="assembly">Assembly</option>
          </select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="text-xs text-gray-500 mb-1 block">Machine / Company</label>
          <Input
            value={form.type === "outsource" ? form.supplier : form.machine}
            onChange={(e) =>
              form.type === "outsource"
                ? setForm({ ...form, supplier: e.target.value })
                : setForm({ ...form, machine: e.target.value })
            }
            placeholder="optional"
            className="h-7 text-sm"
          />
        </div>
        <div className="w-16">
          <label className="text-xs text-gray-500 mb-1 block">Est. h</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={form.estimatedTime}
            onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
            placeholder="0"
            className="h-7 text-sm"
          />
        </div>
        <div className="flex gap-1">
          <Button type="submit" size="sm" className="h-7" disabled={loading}>
            {loading ? "..." : "Add"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
