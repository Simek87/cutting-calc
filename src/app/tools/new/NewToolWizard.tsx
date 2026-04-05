"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SECTION_TEMPLATES, OpPreset, QtyRule } from "@/lib/operation-templates";
import { TOOL_STATUSES, ToolStatus } from "@/lib/types";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#0d0f10",
  surface:      "#141618",
  surface2:     "#1a1d20",
  surface3:     "#1c2024",
  border:       "#2a2d30",
  accent:       "#e8a020",
  accentDim:    "rgba(232,160,32,0.10)",
  accentBorder: "rgba(232,160,32,0.3)",
  text:         "#e2e4e6",
  textDim:      "#8b9196",
  textMuted:    "#4e5560",
  green:        "#22c55e",
  red:          "#ef4444",
};

const input: React.CSSProperties = {
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

// ── Wizard state types ────────────────────────────────────────────────────────
type ProjectTypeChoice = "NewTool" | "Conversion" | "Blank";
type ConvStatus = "New" | "Reuse" | "Rework";

interface WizardPart {
  name: string;
  isStandard: boolean;
  opPreset: OpPreset;
  qtyRule: QtyRule;
  qty: number;
  include: boolean;
  conversionStatus: ConvStatus;
}

interface WizardSection {
  code: string;
  fullName: string;
  parts: WizardPart[];
  collapsed: boolean;
}

function buildSectionConfig(cavities: number): WizardSection[] {
  return SECTION_TEMPLATES.map((s) => ({
    code: s.code,
    fullName: s.fullName,
    collapsed: false,
    parts: s.parts.map((p) => ({
      name: p.name,
      isStandard: p.isStandard,
      opPreset: p.opPreset,
      qtyRule: p.qtyRule,
      qty: p.qtyRule === "cavities" ? cavities : 1,
      include: true,
      conversionStatus: "New" as ConvStatus,
    })),
  }));
}

function applyCavities(sections: WizardSection[], cavities: number): WizardSection[] {
  return sections.map((s) => ({
    ...s,
    parts: s.parts.map((p) =>
      p.qtyRule === "cavities" ? { ...p, qty: cavities } : p
    ),
  }));
}

// ── Main component ────────────────────────────────────────────────────────────
export function NewToolWizard() {
  const router = useRouter();

  const [step, setStep]                 = useState<1 | 2 | 3>(1);
  const [projectType, setProjectType]   = useState<ProjectTypeChoice>("NewTool");
  const [loading, setLoading]           = useState(false);
  const [form, setForm]                 = useState({
    projectName: "",
    cavities: 1,
    dueDate: "",
    machineTarget: "KMD 78.2",
    status: "Management" as ToolStatus,
  });
  const [sections, setSections] = useState<WizardSection[]>(buildSectionConfig(1));

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTypeSelect = (type: ProjectTypeChoice) => {
    setProjectType(type);
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!form.projectName.trim()) return;
    const updated = applyCavities(sections, form.cavities);
    setSections(updated);
    if (projectType === "Blank") {
      handleSubmit(updated);
    } else {
      setStep(3);
    }
  };

  const handleSubmit = useCallback(
    async (sectionsOverride?: WizardSection[]) => {
      if (loading) return;
      setLoading(true);

      const activeSections = (sectionsOverride ?? sections)
        .map((s) => ({
          code: s.code,
          parts: s.parts
            .filter((p) => p.include)
            .map((p) => ({
              name: p.name,
              isStandard: p.isStandard,
              opPreset: p.opPreset,
              qty: p.qty,
              conversionStatus: p.conversionStatus,
            })),
        }))
        .filter((s) => s.parts.length > 0);

      try {
        const res = await fetch("/api/tools/create-from-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName:  form.projectName.trim(),
            projectType:  projectType === "Blank" ? "NewTool" : projectType,
            cavities:     form.cavities,
            dueDate:      form.dueDate || null,
            machineTarget: form.machineTarget,
            status:       form.status,
            sections:     projectType === "Blank" ? [] : activeSections,
          }),
        });
        if (!res.ok) throw new Error("Failed to create tool");
        const { id } = await res.json();
        router.push(`/tools/${id}`);
      } catch {
        setLoading(false);
      }
    },
    [form, projectType, sections, loading, router]
  );

  const toggleSection = (sectionCode: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.code === sectionCode ? { ...s, collapsed: !s.collapsed } : s
      )
    );
  };

  const toggleAllPartsInSection = (sectionCode: string, include: boolean) => {
    setSections((prev) =>
      prev.map((s) =>
        s.code === sectionCode
          ? { ...s, parts: s.parts.map((p) => ({ ...p, include })) }
          : s
      )
    );
  };

  const togglePart = (sectionCode: string, partName: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.code === sectionCode
          ? {
              ...s,
              parts: s.parts.map((p) =>
                p.name === partName ? { ...p, include: !p.include } : p
              ),
            }
          : s
      )
    );
  };

  const setPartQty = (sectionCode: string, partName: string, qty: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.code === sectionCode
          ? {
              ...s,
              parts: s.parts.map((p) =>
                p.name === partName ? { ...p, qty: Math.max(1, qty) } : p
              ),
            }
          : s
      )
    );
  };

  const setPartConvStatus = (sectionCode: string, partName: string, val: ConvStatus) => {
    setSections((prev) =>
      prev.map((s) =>
        s.code === sectionCode
          ? {
              ...s,
              parts: s.parts.map((p) =>
                p.name === partName ? { ...p, conversionStatus: val } : p
              ),
            }
          : s
      )
    );
  };

  // ── Render steps ───────────────────────────────────────────────────────────

  const totalParts = sections.reduce(
    (acc, s) => acc + s.parts.filter((p) => p.include).length,
    0
  );

  return (
    <div
      style={{
        minHeight: "100%",
        backgroundColor: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px 80px",
      }}
    >
      {/* ── Step indicator ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36 }}>
        {([1, 2, 3] as const).map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-jetbrains-mono)",
                backgroundColor: step === n ? C.accent : step > n ? C.accentDim : C.surface2,
                color: step === n ? "#0d0f10" : step > n ? C.accent : C.textMuted,
                border: step > n ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`,
                transition: "all 0.2s",
              }}
            >
              {step > n ? "✓" : n}
            </div>
            {n < 3 && (
              <div
                style={{
                  width: 32,
                  height: 1,
                  backgroundColor: step > n ? C.accent : C.border,
                  transition: "background-color 0.2s",
                }}
              />
            )}
          </div>
        ))}
        <span
          style={{
            marginLeft: 12,
            fontSize: 11,
            color: C.textDim,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {step === 1 ? "PROJECT TYPE" : step === 2 ? "TOOL DETAILS" : "SECTIONS & PARTS"}
        </span>
      </div>

      {/* ── Step 1: Project type ────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ width: "100%", maxWidth: 640 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: C.text,
              marginBottom: 8,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Create New Tool
          </h1>
          <p style={{ fontSize: 13, color: C.textDim, marginBottom: 28 }}>
            Choose the project type to start with the right template.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TypeCard
              title="New Tool — KMD 78.2"
              description="Full template: all 5 sections with default parts and operations pre-populated."
              badge="TEMPLATE"
              badgeColor={C.accent}
              selected={projectType === "NewTool"}
              onClick={() => handleTypeSelect("NewTool")}
            />
            <TypeCard
              title="Conversion — KMD 78.2"
              description="Conversion workflow: same template with conversionStatus = New on all parts."
              badge="CONVERSION"
              badgeColor="#60a5fa"
              selected={projectType === "Conversion"}
              onClick={() => handleTypeSelect("Conversion")}
            />
            <TypeCard
              title="Blank Tool"
              description="Empty tool record — no sections or parts. Add everything manually."
              badge="BLANK"
              badgeColor={C.textDim}
              selected={projectType === "Blank"}
              onClick={() => handleTypeSelect("Blank")}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Tool details ─────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: C.text,
              marginBottom: 6,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Tool Details
          </h2>
          <p style={{ fontSize: 13, color: C.textDim, marginBottom: 24 }}>
            {projectType === "NewTool"
              ? "New Tool — KMD 78.2"
              : projectType === "Conversion"
              ? "Conversion — KMD 78.2"
              : "Blank Tool"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Tool Name *">
              <input
                type="text"
                style={input}
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="e.g. AFS700"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleStep2Next(); }}
              />
            </Field>

            {projectType !== "Blank" && (
              <Field label="Cavities">
                <input
                  type="number"
                  style={input}
                  min={1}
                  max={64}
                  value={form.cavities}
                  onChange={(e) =>
                    setForm({ ...form, cavities: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  Sets qty for CAVITY, PLUG, PLUG-SHAFT, BLADE, WEAR-PLATE, BASKET
                </p>
              </Field>
            )}

            <Field label="Due Date">
              <input
                type="date"
                style={input}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>

            <Field label="Machine Target">
              <input
                type="text"
                style={input}
                value={form.machineTarget}
                onChange={(e) => setForm({ ...form, machineTarget: e.target.value })}
              />
            </Field>

            <Field label="Initial Status">
              <select
                style={{ ...input, appearance: "none" }}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ToolStatus })}
              >
                {TOOL_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: C.bg }}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <NavButton variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </NavButton>
            <NavButton
              variant="primary"
              disabled={!form.projectName.trim()}
              onClick={handleStep2Next}
            >
              {projectType === "Blank" || loading
                ? loading
                  ? "Creating…"
                  : "Create Tool"
                : "Next →"}
            </NavButton>
          </div>
        </div>
      )}

      {/* ── Step 3: Sections & parts ──────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ width: "100%", maxWidth: 700 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: C.text,
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              Configure Sections & Parts
            </h2>
            <span style={{ fontSize: 12, color: C.textDim }}>
              {totalParts} parts selected
            </span>
          </div>
          <p style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>
            Uncheck parts you don't need. Adjust quantities for TBD items.
            {projectType === "Conversion" && (
              <span style={{ color: "#60a5fa" }}> Conversion status per part.</span>
            )}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sections.map((section) => {
              const allChecked = section.parts.every((p) => p.include);
              const someChecked = section.parts.some((p) => p.include);
              const includedCount = section.parts.filter((p) => p.include).length;

              return (
                <div
                  key={section.code}
                  style={{
                    backgroundColor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {/* Section header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      backgroundColor: C.surface2,
                      borderBottom: section.collapsed ? "none" : `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSection(section.code)}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleAllPartsInSection(section.code, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: C.accent, cursor: "pointer" }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.accent,
                        fontFamily: "var(--font-jetbrains-mono)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {section.code}
                    </span>
                    <span style={{ fontSize: 12, color: C.textDim }}>
                      {section.fullName}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>
                      {includedCount}/{section.parts.length} parts
                    </span>
                    <span style={{ fontSize: 10, color: C.textMuted }}>
                      {section.collapsed ? "▶" : "▼"}
                    </span>
                  </div>

                  {/* Parts list */}
                  {!section.collapsed && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={thStyle}></th>
                          <th style={{ ...thStyle, textAlign: "left" }}>Part</th>
                          <th style={{ ...thStyle, width: 64 }}>Qty</th>
                          <th style={{ ...thStyle, width: 80 }}>Type</th>
                          {projectType === "Conversion" && (
                            <th style={{ ...thStyle, width: 110 }}>Conv. Status</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {section.parts.map((part, idx) => (
                          <tr
                            key={part.name}
                            style={{
                              backgroundColor: idx % 2 === 0 ? "transparent" : C.surface3,
                              opacity: part.include ? 1 : 0.45,
                            }}
                          >
                            {/* Checkbox */}
                            <td style={tdStyle}>
                              <input
                                type="checkbox"
                                checked={part.include}
                                onChange={() => togglePart(section.code, part.name)}
                                style={{ accentColor: C.accent, cursor: "pointer" }}
                              />
                            </td>

                            {/* Part name */}
                            <td style={{ ...tdStyle, textAlign: "left" }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontFamily: "var(--font-jetbrains-mono)",
                                  color: part.isStandard ? C.textDim : C.text,
                                }}
                              >
                                {part.name}
                              </span>
                              {part.isStandard && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    color: C.textMuted,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 3,
                                    padding: "0 4px",
                                    fontFamily: "var(--font-jetbrains-mono)",
                                  }}
                                >
                                  STD
                                </span>
                              )}
                            </td>

                            {/* Qty */}
                            <td style={tdStyle}>
                              {part.qtyRule === "tbd" ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={part.qty}
                                  onChange={(e) =>
                                    setPartQty(
                                      section.code,
                                      part.name,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  disabled={!part.include}
                                  style={{
                                    width: 52,
                                    padding: "3px 6px",
                                    fontSize: 12,
                                    backgroundColor: C.bg,
                                    color: C.text,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 4,
                                    outline: "none",
                                    textAlign: "center",
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: part.qtyRule === "cavities" ? C.accent : C.textDim,
                                    fontFamily: "var(--font-jetbrains-mono)",
                                  }}
                                  title={part.qtyRule === "cavities" ? "= cavities" : "fixed"}
                                >
                                  {part.qty}
                                </span>
                              )}
                            </td>

                            {/* Op type badge */}
                            <td style={tdStyle}>
                              <OpBadge preset={part.opPreset} />
                            </td>

                            {/* Conversion status */}
                            {projectType === "Conversion" && (
                              <td style={tdStyle}>
                                <select
                                  value={part.conversionStatus}
                                  disabled={!part.include}
                                  onChange={(e) =>
                                    setPartConvStatus(
                                      section.code,
                                      part.name,
                                      e.target.value as ConvStatus
                                    )
                                  }
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 6px",
                                    backgroundColor: C.bg,
                                    color:
                                      part.conversionStatus === "New"
                                        ? C.accent
                                        : part.conversionStatus === "Rework"
                                        ? "#f97316"
                                        : C.green,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 4,
                                    outline: "none",
                                    cursor: "pointer",
                                    appearance: "none",
                                    paddingRight: 20,
                                  }}
                                >
                                  <option value="New" style={{ color: C.text, backgroundColor: C.bg }}>New</option>
                                  <option value="Reuse" style={{ color: C.text, backgroundColor: C.bg }}>Reuse</option>
                                  <option value="Rework" style={{ color: C.text, backgroundColor: C.bg }}>Rework</option>
                                </select>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <NavButton variant="ghost" onClick={() => setStep(2)}>
              ← Back
            </NavButton>
            <NavButton
              variant="primary"
              disabled={loading || totalParts === 0}
              onClick={() => handleSubmit()}
            >
              {loading ? "Creating…" : `Create Tool (${totalParts} parts)`}
            </NavButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeCard({
  title,
  description,
  badge,
  badgeColor,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 18px",
        border: `1px solid ${selected ? C.accent : C.border}`,
        borderRadius: 8,
        backgroundColor: selected ? C.accentDim : C.surface,
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: selected ? C.accent : C.text,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-jetbrains-mono)",
              color: badgeColor,
              border: `1px solid ${badgeColor}`,
              borderRadius: 3,
              padding: "1px 5px",
              opacity: 0.8,
            }}
          >
            {badge}
          </span>
        </div>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${selected ? C.accent : C.border}`,
          backgroundColor: selected ? C.accent : "transparent",
          flexShrink: 0,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.bg }} />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function NavButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: "primary" | "ghost";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        border: variant === "primary" ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`,
        backgroundColor: variant === "primary" ? C.accentDim : "transparent",
        color: variant === "primary" ? C.accent : C.textDim,
        fontFamily: "var(--font-jetbrains-mono)",
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

const PRESET_LABELS: Record<OpPreset, { label: string; color: string }> = {
  standard:    { label: "MILL",  color: "#8b9196" },
  gundrilled:  { label: "DRILL", color: "#a78bfa" },
  "pnp-frame": { label: "PNP",   color: "#60a5fa" },
  laser:       { label: "LASER", color: "#f97316" },
  none:        { label: "STD",   color: "#4e5560"  },
};

function OpBadge({ preset }: { preset: OpPreset }) {
  const { label, color } = PRESET_LABELS[preset];
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "var(--font-jetbrains-mono)",
        fontWeight: 700,
        color,
        border: `1px solid ${color}`,
        borderRadius: 3,
        padding: "1px 4px",
        opacity: 0.75,
      }}
    >
      {label}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: 10,
  color: C.textMuted,
  fontFamily: "var(--font-jetbrains-mono)",
  fontWeight: 600,
  textAlign: "center",
  borderBottom: `1px solid ${C.border}`,
  backgroundColor: C.surface2,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 10px",
  textAlign: "center",
  borderBottom: `1px solid rgba(42,45,48,0.5)`,
};
