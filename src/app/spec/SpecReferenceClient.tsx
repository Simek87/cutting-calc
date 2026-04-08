"use client";

import { useState } from "react";

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
};

interface SpecRow {
  label: string;
  value: string;
  flag?: boolean;
}

interface Section {
  id: string;
  title: string;
  weight?: string;
  height?: string;
  rows: SpecRow[];
}

const GENERAL_NOTES = [
  "All steel parts to be zinc plated or stainless.",
  "All separate parts to have weights and Enviropax code clearly marked.",
];

const SECTIONS: Section[] = [
  {
    id: "moulding",
    title: "1. Moulding Tool",
    weight: "400 kg max",
    height: "290 mm",
    rows: [
      { label: "Weight / lifting", value: "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes" },
      { label: "Fixings", value: "Stainless steel runners for table connection" },
      { label: "Water fittings", value: "Hasco Z811/13/G 3/8 — 5 inlets and 5 outlets across entire moulding tool including frame (reserve 1 in / 1 out for frame). Fittings on operator's side." },
      { label: "Moulds — venting", value: "0.6 mm venting on 10 mm pitch, 3 vents per denest. 0.4 mm vent holes in presentation faces pitched 15 mm apart. Slot vent job-specific.", flag: true },
      { label: "Moulds — vent levels", value: "1 level: 30–45 mm deep | 2 levels: 46–90 mm deep | 3 levels: 91 mm+" },
      { label: "Moulds — finish", value: "Light blast, unless presentation face or specified by Enviropax", flag: true },
      { label: "Clips (if applicable)", value: "Brass inserts", flag: true },
      { label: "Tool frame", value: "Water cooled steel with fixed profiled aluminium, down holders machined into frame for sealed products. Flowed matrix cooling. Hard anodised." },
      { label: "Gas springs", value: "4× Nitro Springs NG1-010. Hard insert in frame area and below spring body." },
      { label: "Flat seal area", value: "12 mm external frame flat seal area — 0.5 mm clearance from frame to mould" },
      { label: "Vacuum block", value: "O-ring sealed to table connection plate. Minimal air leaks." },
      { label: "Mould model", value: "Approved model with added shrinkage, supplied with engraving detail, approved material and gauge. Shrinkage approved via email before commencement.", flag: true },
      { label: "O-rings", value: "All O-ring types and sizes to be stated on Inspection List copied to Enviropax." },
    ],
  },
  {
    id: "pressure-box",
    title: "2. Pressure Box",
    weight: "400 kg max",
    height: "Product specific",
    rows: [
      { label: "Weight / lifting", value: "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes" },
      { label: "Tool height", value: "Product specific — as minimal as possible", flag: true },
      { label: "Fixings", value: "Stainless steel runners for table connection" },
      { label: "Water fittings", value: "Hasco Z811/13/G 3/8 — 1 inlet, 1 outlet" },
      { label: "Plugs — material", value: "Optiform SLX or Hytac equivalent", flag: true },
      { label: "Plugs — bearings", value: "Plain Pacific type with seals, linear shafting, captive screws. No ball bearings." },
      { label: "Plugs — access", value: "Removable from bottom, encapsulated/captive screws, or access holes in back, or individual shafts", flag: true },
      { label: "Tool frame", value: "Profiled aluminium with fixed down holders for sealed products. Flowed water matrix cooling. Individual cooled flange clamps if required.", flag: true },
      { label: "Pressure box frame", value: "O-ring seal to film face — continuous dovetail slot to grip O-ring. Central to tool frame. 4 mm dia. O-ring chord." },
      { label: "Air inlet", value: "O-ring sealed vacuum block to table connection plate." },
      { label: "Legs", value: "Aluminium 80×40 mm machine build. Alternatives permitted if advantageous." },
      { label: "Future proofing", value: "Design to accept plugs at later date even if not required initially.", flag: true },
    ],
  },
  {
    id: "anvil",
    title: "3. Anvil",
    weight: "400 kg max",
    height: "255 mm",
    rows: [
      { label: "Weight / lifting", value: "Max 400 kg — lightening holes and M12 tapped holes for lifting eyes" },
      { label: "Fixings", value: "Stainless steel runners for table connection" },
      { label: "Anvil height", value: "255 mm — datum if running on bottom platen" },
      { label: "Anvil body", value: "Solid construction with venting for air evacuation" },
      { label: "Cutting plate", value: "Hardox 600 — raw material 10 mm, grind to clean, minimum 8 mm finished" },
      { label: "Plate fixings", value: "M5 low head — flush or below face of plate, c/bore. Fixings clear of cut line." },
    ],
  },
  {
    id: "cutter",
    title: "4. Cutter (Knife Plate)",
    weight: "80 kg max",
    height: "56 mm",
    rows: [
      { label: "Max weight", value: "80 kg" },
      { label: "Cutter height", value: "56 mm" },
      { label: "Knife", value: "30 mm 3pt universal 60° centre bevel unless agreed otherwise" },
      { label: "Back plate", value: "Hardox 500 — raw material 8 mm, grind to clean, minimum 6 mm finished" },
      { label: "Back plate thickness", value: "20 mm with 10 mm outer fixing to slide into machine. Steel inserts for longevity." },
      { label: "Cutter blocks", value: "Aluminium floating design — oil-filled nylon locators, captive screws to mushrooms. Insulation plate between locator and block. Hard anodised." },
      { label: "Master blocks", value: "2× cutter master blocks per tool + 1 full set spare blades. Engraved with P number, blade info, qty per set." },
      { label: "DXF", value: "Provide DXF showing cut line and bridges only — no other information." },
    ],
  },
  {
    id: "pick-and-place",
    title: "5. Pick and Place",
    weight: "10 kg max",
    rows: [
      { label: "Max weight", value: "10 kg" },
      { label: "Build", value: "Built at Enviropax unless otherwise specified." },
    ],
  },
  {
    id: "pusher",
    title: "6. Pusher",
    weight: "50 kg max",
    height: "240 mm to sheet level",
    rows: [
      { label: "Max weight", value: "50 kg — slots in baseplate and cups to reduce weight where possible" },
      { label: "Pusher height", value: "240 mm to sheet level unless product dictates otherwise" },
      { label: "Construction", value: "Aluminium extruded pillars with Black Nylon 6 heads where possible" },
      { label: "Fixings", value: "Standard KMD78.2SP design" },
      { label: "Indexing", value: "Single index standard — must fit double index baseplate. Adjustable ±30 mm along index.", flag: true },
      { label: "Interchangeable heads", value: "Required if running different depth parts — inserts or interchangeable heads for web push-out.", flag: true },
    ],
  },
  {
    id: "miscellaneous",
    title: "7. Miscellaneous",
    rows: [
      { label: "Patterns / plugs", value: "To be returned to Enviropax" },
      { label: "Product drawings", value: "PDF and DXF if pattern manufactured" },
      { label: "Models", value: "STEP file if pattern and samples manufactured" },
      { label: "Samples", value: "Made in Enviropax supplied material where possible" },
      { label: "Seal jigs / QA", value: "To be modelled by Enviropax", flag: true },
      { label: "Drawings", value: "Provide GA PDF drawings on completion and full payment" },
      { label: "O-rings", value: "Provide list of all standard O-rings used in Enviropax tooling" },
    ],
  },
];

function FlagBadge() {
  return (
    <span
      className="ml-2 inline-flex items-center text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
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

function SectionAccordion({ section, defaultOpen }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
        style={{
          backgroundColor: open ? C.surface2 : C.surface,
          borderBottom: open ? `1px solid ${C.border}` : "none",
        }}
      >
        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
            color: C.accent,
          }}
        >
          <path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Title */}
        <span
          className="font-semibold text-sm flex-1"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: C.text }}
        >
          {section.title}
        </span>

        {/* Summary chips */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
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
      </button>

      {/* Body */}
      {open && (
        <div style={{ backgroundColor: C.bg }}>
          <table className="w-full text-sm">
            <tbody>
              {section.rows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < section.rows.length - 1 ? `1px solid ${C.border}` : "none",
                    backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <td
                    className="px-5 py-3 align-top font-medium"
                    style={{
                      color: C.textDim,
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: "0.72rem",
                      width: "220px",
                      minWidth: "160px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.label}
                  </td>
                  <td className="px-5 py-3 align-top" style={{ color: C.text }}>
                    <div className="flex items-start gap-1 flex-wrap">
                      <span>{row.value}</span>
                      {row.flag && <FlagBadge />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SpecReferenceClient() {
  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Page header */}
        <div>
          <h1
            className="text-xl font-bold mb-1"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: C.text }}
          >
            Tooling Specification Reference
          </h1>
          <p className="text-sm" style={{ color: C.textDim }}>
            Enviropax Standard PET Tooling Manufacture Specification — KMD 78.2 Speed
          </p>
        </div>

        {/* General notes */}
        <div
          className="rounded-lg px-5 py-4"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <p
            className="text-xs font-semibold mb-2 uppercase tracking-widest"
            style={{ color: C.textMuted, fontFamily: "var(--font-jetbrains-mono)" }}
          >
            General — applies to all tools
          </p>
          <ul className="flex flex-col gap-1.5">
            {GENERAL_NOTES.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: C.accent, flexShrink: 0, marginTop: "2px" }}>—</span>
                <span style={{ color: C.textDim }}>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Flag legend */}
        <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
          <FlagBadge />
          <span>= Requires Enviropax input at quote stage / job-specific</span>
        </div>

        {/* Section accordions */}
        <div className="flex flex-col gap-3">
          {SECTIONS.map((section, i) => (
            <SectionAccordion key={section.id} section={section} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Document footer */}
        <div
          className="text-xs pt-4 mt-2 flex flex-wrap gap-x-4 gap-y-1"
          style={{
            borderTop: `1px solid ${C.border}`,
            color: C.textMuted,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
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
