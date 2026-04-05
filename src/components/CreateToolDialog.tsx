"use client";

import { useState } from "react";
import { Tool, TOOL_STATUSES, ToolStatus } from "@/lib/types";

interface CreateToolDialogProps {
  onCreated: (tool: Tool) => void;
}

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  surface2: "#1c2024",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
  backgroundColor: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 5,
  outline: "none",
  boxSizing: "border-box",
};

export function CreateToolDialog({ onCreated }: CreateToolDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    dueDate: "",
    status: "Management" as ToolStatus,
  });

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
      onCreated({ ...tool, parts: [] });
      setOpen(false);
      setForm({ projectName: "", dueDate: "", status: "Management" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 600,
          backgroundColor: C.accentDim,
          color: C.accent,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 5,
          cursor: "pointer",
        }}
      >
        + New Tool
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: "100%",
              maxWidth: 360,
              padding: "24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 18 }}>
              Create New Tool
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5 }}>
                  Tool Name *
                </label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  placeholder="e.g. AFS700"
                  style={fieldStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5 }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5 }}>
                  Initial Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ToolStatus })}
                  style={{ ...fieldStyle, appearance: "none" }}
                >
                  {TOOL_STATUSES.map((s) => (
                    <option key={s} value={s} style={{ backgroundColor: C.bg }}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "7px 16px",
                    fontSize: 13,
                    backgroundColor: "transparent",
                    color: C.textDim,
                    border: `1px solid ${C.border}`,
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: C.accentDim,
                    color: C.accent,
                    border: `1px solid ${C.accentBorder}`,
                    borderRadius: 5,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
