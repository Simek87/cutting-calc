"use client";

import { useState, useEffect, useRef } from "react";

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
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.35)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  redBorder: "rgba(239,68,68,0.35)",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface SpecRow {
  id: string;
  label: string;
  value: string;
  flag: boolean;
}

interface Section {
  id: string;
  title: string;
  weight?: string;
  height?: string;
  rows: SpecRow[];
}

// ── Default data ───────────────────────────────────────────────────────────

function makeRow(label: string, value: string, flag = false): SpecRow {
  return { id: `${label}-${Math.random().toString(36).slice(2, 7)}`, label, value, flag };
}

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "moulding",
    title: "1. Moulding Tool",
    weight: "400 kg max",
    height: "290 mm",
    rows: [
      makeRow("Weight / lifting", "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes"),
      makeRow("Fixings", "Stainless steel runners for table connection"),
      makeRow("Water fittings", "Hasco Z811/13/G 3/8 — 5 inlets and 5 outlets across entire moulding tool including frame (reserve 1 in / 1 out for frame). Fittings on operator's side."),
      makeRow("Moulds — venting", "0.6 mm venting on 10 mm pitch, 3 vents per denest. 0.4 mm vent holes in presentation faces pitched 15 mm apart. Slot vent job-specific.", true),
      makeRow("Moulds — vent levels", "1 level: 30–45 mm deep | 2 levels: 46–90 mm deep | 3 levels: 91 mm+"),
      makeRow("Moulds — finish", "Light blast, unless presentation face or specified by Enviropax", true),
      makeRow("Clips (if applicable)", "Brass inserts", true),
      makeRow("Tool frame", "Water cooled steel with fixed profiled aluminium, down holders machined into frame for sealed products. Flowed matrix cooling. Hard anodised."),
      makeRow("Gas springs", "4× Nitro Springs NG1-010. Hard insert in frame area and below spring body."),
      makeRow("Flat seal area", "12 mm external frame flat seal area — 0.5 mm clearance from frame to mould"),
      makeRow("Vacuum block", "O-ring sealed to table connection plate. Minimal air leaks."),
      makeRow("Mould model", "Approved model with added shrinkage, supplied with engraving detail, approved material and gauge. Shrinkage approved via email before commencement.", true),
      makeRow("O-rings", "All O-ring types and sizes to be stated on Inspection List copied to Enviropax."),
    ],
  },
  {
    id: "pressure-box",
    title: "2. Pressure Box",
    weight: "400 kg max",
    height: "Product specific",
    rows: [
      makeRow("Weight / lifting", "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes"),
      makeRow("Tool height", "Product specific — as minimal as possible", true),
      makeRow("Fixings", "Stainless steel runners for table connection"),
      makeRow("Water fittings", "Hasco Z811/13/G 3/8 — 1 inlet, 1 outlet"),
      makeRow("Plugs — material", "Optiform SLX or Hytac equivalent", true),
      makeRow("Plugs — bearings", "Plain Pacific type with seals, linear shafting, captive screws. No ball bearings."),
      makeRow("Plugs — access", "Removable from bottom, encapsulated/captive screws, or access holes in back, or individual shafts", true),
      makeRow("Tool frame", "Profiled aluminium with fixed down holders for sealed products. Flowed water matrix cooling. Individual cooled flange clamps if required.", true),
      makeRow("Pressure box frame", "O-ring seal to film face — continuous dovetail slot to grip O-ring. Central to tool frame. 4 mm dia. O-ring chord."),
      makeRow("Air inlet", "O-ring sealed vacuum block to table connection plate."),
      makeRow("Legs", "Aluminium 80×40 mm machine build. Alternatives permitted if advantageous."),
      makeRow("Future proofing", "Design to accept plugs at later date even if not required initially.", true),
    ],
  },
  {
    id: "anvil",
    title: "3. Anvil",
    weight: "400 kg max",
    height: "255 mm",
    rows: [
      makeRow("Weight / lifting", "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes"),
      makeRow("Fixings", "Stainless steel runners for table connection"),
      makeRow("Anvil height", "255 mm — datum if running on bottom platen"),
      makeRow("Anvil body", "Solid construction with venting for air evacuation"),
      makeRow("Cutting plate", "Hardox 600 — raw material 10 mm, grind to clean, minimum 8 mm finished"),
      makeRow("Plate fixings", "M5 low head — flush or below face of plate, c/bore. Fixings clear of cut line."),
    ],
  },
  {
    id: "cutter",
    title: "4. Cutter (Knife Plate)",
    weight: "80 kg max",
    height: "56 mm",
    rows: [
      makeRow("Max weight", "80 kg"),
      makeRow("Cutter height", "56 mm"),
      makeRow("Knife", "30 mm 3pt universal 60° centre bevel, 1.05 mm thickness, unless agreed otherwise"),
      makeRow("Back plate", "Hardox 500 — raw material 8 mm, grind to clean, minimum 6 mm finished"),
      makeRow("Back plate thickness", "20 mm with 10 mm outer fixing to slide into machine. Steel inserts for longevity."),
      makeRow("Cutter blocks", "Aluminium floating design — oil-filled nylon locators, captive screws to mushrooms. Insulation plate between locator and block. Hard anodised."),
      makeRow("Master blocks", "2× cutter master blocks per tool + 1 full set spare blades. Engraved with P number, blade info, qty per set."),
      makeRow("DXF", "Provide DXF showing cut line and bridges only — no other information."),
    ],
  },
  {
    id: "pick-and-place",
    title: "5. Pick and Place",
    weight: "10 kg max",
    rows: [
      makeRow("Max weight", "10 kg"),
      makeRow("Build", "Built at Enviropax unless otherwise specified."),
      makeRow("Material", "Stainless Steel"),
      makeRow("Thickness", "3 mm"),
      makeRow("Suction cup hole", "Ø 12.5 mm"),
      makeRow("Mounting hole", "Ø 5.5 mm (2×)"),
      makeRow("Mounting hole spacing", "20.00 mm"),
      makeRow("Mounting arm width", "32 mm"),
      makeRow("Connector arm width", "8 mm"),
    ],
  },
  {
    id: "pusher",
    title: "6. Pusher",
    weight: "50 kg max",
    height: "240 mm to sheet level",
    rows: [
      makeRow("Max weight", "50 kg — slots in baseplate and cups to reduce weight where possible"),
      makeRow("Pusher height", "240 mm to sheet level unless product dictates otherwise"),
      makeRow("Construction", "Aluminium extruded pillars with Black Nylon 6 heads where possible"),
      makeRow("Fixings", "Standard KMD78.2SP design"),
      makeRow("Indexing", "Single index standard — must fit double index baseplate. Adjustable ±30 mm along index.", true),
      makeRow("Interchangeable heads", "Required if running different depth parts — inserts or interchangeable heads for web push-out.", true),
    ],
  },
  {
    id: "miscellaneous",
    title: "7. Miscellaneous",
    rows: [
      makeRow("Patterns / plugs", "To be returned to Enviropax"),
      makeRow("Product drawings", "PDF and DXF if pattern manufactured"),
      makeRow("Models", "STEP file if pattern and samples manufactured"),
      makeRow("Samples", "Made in Enviropax supplied material where possible"),
      makeRow("Seal jigs / QA", "To be modelled by Enviropax", true),
      makeRow("Drawings", "Provide GA PDF drawings on completion and full payment"),
      makeRow("O-rings", "Provide list of all standard O-rings used in Enviropax tooling"),
    ],
  },
];

const GENERAL_NOTES = [
  "All steel parts to be zinc plated or stainless.",
  "All separate parts to have weights and Enviropax code clearly marked.",
];

const STORAGE_KEY = "spec-ref-sections-v2";

function loadSections(): Section[] {
  if (typeof window === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed: Section[] = JSON.parse(raw);
    // Merge: keep default section order/title/weight/height, but use stored rows
    return DEFAULT_SECTIONS.map((def) => {
      const stored = parsed.find((s) => s.id === def.id);
      return stored ? { ...def, rows: stored.rows } : def;
    });
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function saveSections(sections: Section[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // ignore
  }
}

// ── Shared style helpers ───────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "2px 7px",
  backgroundColor: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  color: C.textDim,
  cursor: "pointer",
  lineHeight: 1.4,
};

const smallBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 10px",
  backgroundColor: C.accentDim,
  color: C.accent,
  border: `1px solid ${C.accentBorder}`,
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
};

const smallBtnGhost: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 10px",
  backgroundColor: "transparent",
  color: C.textDim,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  cursor: "pointer",
};

const cellInput: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  fontSize: 13,
  backgroundColor: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  outline: "none",
  minWidth: 60,
};

// ── FlagBadge ──────────────────────────────────────────────────────────────

function FlagBadge() {
  return (
    <span
      className="inline-flex items-center text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
      style={{
        backgroundColor: C.amberDim,
        color: C.amber,
        border: `1px solid ${C.amberBorder}`,
        fontFamily: "var(--font-jetbrains-mono)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      Job Specific
    </span>
  );
}

// ── Editable inline cell ───────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      style={cellInput}
    />
  );
}

// ── SectionAccordion ───────────────────────────────────────────────────────

function SectionAccordion({
  section,
  defaultOpen,
  onUpdateRows,
}: {
  section: Section;
  defaultOpen?: boolean;
  onUpdateRows: (id: string, rows: SpecRow[]) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [editMode, setEditMode] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newFlag, setNewFlag] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const newLabelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingRow && newLabelRef.current) newLabelRef.current.focus();
  }, [addingRow]);

  const updateRow = (rowId: string, field: keyof SpecRow, val: string | boolean) => {
    const updated = section.rows.map((r) =>
      r.id === rowId ? { ...r, [field]: val } : r
    );
    onUpdateRows(section.id, updated);
  };

  const deleteRow = (rowId: string) => {
    onUpdateRows(section.id, section.rows.filter((r) => r.id !== rowId));
    setDeleteConfirmId(null);
  };

  const addRow = () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    const newRow: SpecRow = {
      id: `${newLabel}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: newLabel.trim(),
      value: newValue.trim(),
      flag: newFlag,
    };
    onUpdateRows(section.id, [...section.rows, newRow]);
    setNewLabel("");
    setNewValue("");
    setNewFlag(false);
    setAddingRow(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addRow();
    if (e.key === "Escape") { setAddingRow(false); setNewLabel(""); setNewValue(""); setNewFlag(false); }
  };

  return (
    <>
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            backgroundColor: open ? C.surface2 : C.surface,
            borderBottom: open ? `1px solid ${C.border}` : "none",
          }}
        >
          {/* Toggle chevron */}
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.18s ease",
                color: C.accent,
              }}
            >
              <path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Title — clicking also toggles */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-1 text-left font-semibold text-sm"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-jetbrains-mono)", color: C.text }}
          >
            {section.title}
          </button>

          {/* Summary chips */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {section.weight && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, border: `1px solid ${C.accentBorder}`, fontFamily: "var(--font-jetbrains-mono)" }}>
                {section.weight}
              </span>
            )}
            {section.height && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(100,116,139,0.1)", color: C.textDim, border: `1px solid ${C.border}`, fontFamily: "var(--font-jetbrains-mono)" }}>
                H: {section.height}
              </span>
            )}
          </div>

          {/* Edit controls — always visible */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {open && (
              <>
                <button
                  onClick={() => { setAddingRow(true); setEditMode(true); if (!open) setOpen(true); }}
                  style={{ ...iconBtn, color: C.accent, borderColor: C.accentBorder, backgroundColor: C.accentDim }}
                >
                  + Row
                </button>
                <button
                  onClick={() => { setEditMode((v) => !v); setAddingRow(false); }}
                  style={{
                    ...iconBtn,
                    color: editMode ? C.accent : C.textDim,
                    borderColor: editMode ? C.accentBorder : C.border,
                    backgroundColor: editMode ? C.accentDim : C.surface,
                    fontWeight: editMode ? 600 : 400,
                  }}
                >
                  {editMode ? "✓ Done" : "✎ Edit"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        {open && (
          <div style={{ backgroundColor: C.bg }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {section.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < section.rows.length - 1 || addingRow ? `1px solid ${C.border}` : "none",
                      backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    {/* Label cell */}
                    <td
                      style={{
                        padding: "10px 16px",
                        verticalAlign: "top",
                        width: 220,
                        minWidth: 140,
                      }}
                    >
                      {editMode ? (
                        <EditableCell value={row.label} onSave={(v) => updateRow(row.id, "label", v)} placeholder="Label" />
                      ) : (
                        <span style={{ color: C.textDim, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                          {row.label}
                        </span>
                      )}
                    </td>

                    {/* Value cell */}
                    <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
                      {editMode ? (
                        <EditableCell value={row.value} onSave={(v) => updateRow(row.id, "value", v)} placeholder="Value" />
                      ) : (
                        <div className="flex items-start gap-2 flex-wrap">
                          <span style={{ color: C.text, fontSize: 13 }}>{row.value}</span>
                          {row.flag && <FlagBadge />}
                        </div>
                      )}
                    </td>

                    {/* Edit-mode controls */}
                    {editMode && (
                      <td style={{ padding: "10px 12px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <div className="flex items-center gap-2">
                          {/* Flag toggle */}
                          <button
                            onClick={() => updateRow(row.id, "flag", !row.flag)}
                            title={row.flag ? "Remove Job Specific flag" : "Mark as Job Specific"}
                            style={{
                              fontSize: 11,
                              padding: "2px 7px",
                              borderRadius: 4,
                              cursor: "pointer",
                              border: `1px solid ${row.flag ? C.amberBorder : C.border}`,
                              backgroundColor: row.flag ? C.amberDim : "transparent",
                              color: row.flag ? C.amber : C.textMuted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.flag ? "★ JS" : "☆ JS"}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmId(row.id)}
                            style={{
                              fontSize: 11,
                              padding: "2px 7px",
                              backgroundColor: C.redDim,
                              border: `1px solid ${C.redBorder}`,
                              color: C.red,
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Add-row inline form */}
                {addingRow && (
                  <tr style={{ backgroundColor: "rgba(232,160,32,0.04)" }}>
                    <td style={{ padding: "8px 16px", verticalAlign: "top", width: 220 }}>
                      <input
                        ref={newLabelRef}
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={handleAddKeyDown}
                        placeholder="Label"
                        style={cellInput}
                      />
                    </td>
                    <td style={{ padding: "8px 16px", verticalAlign: "top" }}>
                      <input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyDown={handleAddKeyDown}
                        placeholder="Value"
                        style={cellInput}
                      />
                    </td>
                    <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNewFlag((v) => !v)}
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: 4,
                            cursor: "pointer",
                            border: `1px solid ${newFlag ? C.amberBorder : C.border}`,
                            backgroundColor: newFlag ? C.amberDim : "transparent",
                            color: newFlag ? C.amber : C.textMuted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {newFlag ? "★ JS" : "☆ JS"}
                        </button>
                        <button onClick={addRow} style={smallBtn}>Add</button>
                        <button
                          onClick={() => { setAddingRow(false); setNewLabel(""); setNewValue(""); setNewFlag(false); }}
                          style={smallBtnGhost}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      {deleteConfirmId && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "22px 26px", width: 320 }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Delete row?</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 18 }}>This entry will be permanently removed from this section.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirmId(null)} style={smallBtnGhost}>Cancel</button>
              <button
                onClick={() => deleteRow(deleteConfirmId)}
                style={{ fontSize: 13, padding: "5px 14px", backgroundColor: C.redDim, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 5, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SpecReferenceClient() {
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    setSections(loadSections());
    setLoaded(true);
  }, []);

  // Persist whenever sections change (after initial load)
  useEffect(() => {
    if (loaded) saveSections(sections);
  }, [sections, loaded]);

  const handleUpdateRows = (sectionId: string, rows: SpecRow[]) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, rows } : s))
    );
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)", color: C.text }}>
            Tooling Specification Reference
          </h1>
          <p className="text-sm" style={{ color: C.textDim }}>
            Enviropax Standard PET Tooling Manufacture Specification — KMD 78.2 Speed
          </p>
        </div>

        {/* General notes */}
        <div className="rounded-lg px-5 py-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: C.textMuted, fontFamily: "var(--font-jetbrains-mono)" }}>
            General — applies to all tools
          </p>
          <ul className="flex flex-col gap-1.5">
            {GENERAL_NOTES.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: C.accent, flexShrink: 0, marginTop: 2 }}>—</span>
                <span style={{ color: C.textDim }}>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Flag legend */}
        <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
          <FlagBadge />
          <span>= Requires Enviropax input at quote stage / job-specific. Use ★ JS button in edit mode to toggle.</span>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-3">
          {sections.map((section, i) => (
            <SectionAccordion
              key={section.id}
              section={section}
              defaultOpen={i === 0}
              onUpdateRows={handleUpdateRows}
            />
          ))}
        </div>

        {/* Document footer */}
        <div
          className="text-xs pt-4 mt-2 flex flex-wrap gap-x-4 gap-y-1"
          style={{ borderTop: `1px solid ${C.border}`, color: C.textMuted, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <span>Ref: F702</span>
          <span>Issue 1</span>
          <span>01/08/2025</span>
          <span>Issued by: Tom Richardson</span>
        </div>
      </div>
    </div>
  );
}
