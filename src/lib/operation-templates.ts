import type { OperationType } from "./types";

export interface TemplateOperation {
  name: string;
  type: OperationType;
  order: number;
  dependsOnPrevious?: boolean; // default true if omitted
}

export interface OperationTemplate {
  id: string;
  label: string;
  operations: TemplateOperation[];
}

export const OPERATION_TEMPLATES: OperationTemplate[] = [
  {
    id: "none",
    label: "No operations",
    operations: [],
  },
  {
    id: "standard",
    label: "Standard Part",
    operations: [
      { name: "Order material", type: "procurement", order: 1 },
      { name: "CAM",            type: "internal",    order: 2, dependsOnPrevious: false },
      { name: "Milling",        type: "internal",    order: 3 },
      { name: "Assembly",       type: "assembly",    order: 4 },
      { name: "Inspection",     type: "inspection",  order: 5 },
    ],
  },
  {
    id: "milled",
    label: "Milled Part",
    operations: [
      { name: "CAM",        type: "internal",   order: 1 },
      { name: "Mill",       type: "internal",   order: 2 },
      { name: "Gundrill",   type: "internal",   order: 3 },
      { name: "Finish",     type: "internal",   order: 4 },
      { name: "Inspection", type: "inspection", order: 5 },
      { name: "Assembly",   type: "assembly",   order: 6 },
    ],
  },
  {
    id: "laser",
    label: "Laser Part",
    operations: [
      { name: "Order material", type: "procurement", order: 1 },
      { name: "Laser cutting",  type: "outsource",   order: 2 },
      { name: "Deburr",         type: "internal",    order: 3 },
      { name: "Inspection",     type: "inspection",  order: 4 },
      { name: "Assembly",       type: "assembly",    order: 5 },
    ],
  },
  {
    id: "outsourced",
    label: "Outsourced Part",
    operations: [
      { name: "Send to supplier", type: "outsource",   order: 1 },
      { name: "Inspection",       type: "inspection",  order: 2 },
      { name: "Assembly",         type: "assembly",    order: 3 },
    ],
  },
];

// ── Template wizard types ─────────────────────────────────────────────────────

/** How the part quantity is determined in the wizard. */
export type QtyRule = "cavities" | "tbd" | "one";

/**
 * Which operation preset is applied to new parts created from the template.
 * - standard   : Order material → CAM → Milling → Assembly → Inspection
 * - gundrilled : Order material → CAM → Milling → Gundrill → Finish → Assembly → Inspection
 * - pnp-frame  : Order material → CAM → Milling → Assembly  (no inspection — PBX frame)
 * - laser      : Order material → Laser cutting → Deburr → Assembly → Inspection
 * - none       : No operations (bought-in standard parts)
 */
export type OpPreset = "standard" | "gundrilled" | "pnp-frame" | "laser" | "none";

/** Canonical operations for each preset. */
export const OP_PRESETS: Record<OpPreset, TemplateOperation[]> = {
  standard: [
    { name: "Order material", type: "procurement", order: 1 },
    { name: "CAM",            type: "internal",    order: 2, dependsOnPrevious: false },
    { name: "Milling",        type: "internal",    order: 3 },
    { name: "Assembly",       type: "assembly",    order: 4 },
    { name: "Inspection",     type: "inspection",  order: 5 },
  ],
  gundrilled: [
    { name: "Order material", type: "procurement", order: 1 },
    { name: "CAM",            type: "internal",    order: 2, dependsOnPrevious: false },
    { name: "Milling",        type: "internal",    order: 3 },
    { name: "Gundrill",       type: "internal",    order: 4 },
    { name: "Finish",         type: "internal",    order: 5 },
    { name: "Assembly",       type: "assembly",    order: 6 },
    { name: "Inspection",     type: "inspection",  order: 7 },
  ],
  "pnp-frame": [
    { name: "Order material", type: "procurement", order: 1 },
    { name: "CAM",            type: "internal",    order: 2, dependsOnPrevious: false },
    { name: "Milling",        type: "internal",    order: 3 },
    { name: "Assembly",       type: "assembly",    order: 4 },
  ],
  laser: [
    { name: "Order material", type: "procurement", order: 1 },
    { name: "Laser cutting",  type: "outsource",   order: 2 },
    { name: "Deburr",         type: "internal",    order: 3 },
    { name: "Assembly",       type: "assembly",    order: 4 },
    { name: "Inspection",     type: "inspection",  order: 5 },
  ],
  none: [],
};

// ── Section part templates ────────────────────────────────────────────────────

export interface SectionPartTemplate {
  name: string;
  /** True = bought-in standard part: no machining ops, no material order. */
  isStandard: boolean;
  /** Which operation sequence to create when building from template. */
  opPreset: OpPreset;
  /** How quantity is determined in the wizard. */
  qtyRule: QtyRule;
}

export interface SectionTemplate {
  code: string;       // e.g. "MLD"
  fullName: string;   // e.g. "Moulding"
  parts: SectionPartTemplate[];
}

/** Default part list per section for a KMD 78.2 Standard tool. */
export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    code: "MLD",
    fullName: "Moulding",
    parts: [
      { name: "FXT-PLATE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "FRAME-PLATE", isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "BASE-PLATE",  isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "CAVITY",      isStandard: false, opPreset: "gundrilled", qtyRule: "cavities" },
      { name: "EXTRUSIONS",  isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "VAC-PLATE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "WATER-PLATE", isStandard: false, opPreset: "standard",   qtyRule: "one"      },
    ],
  },
  {
    code: "PLG",
    fullName: "Plug Assist",
    parts: [
      { name: "PLUG",         isStandard: false, opPreset: "gundrilled", qtyRule: "cavities" },
      { name: "PLUG-PLATE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "CLAM-PLATE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "VAC-BLOCK",    isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "PLUG-SHAFT",   isStandard: false, opPreset: "gundrilled", qtyRule: "cavities" },
      { name: "MOVING-PLATE", isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "EXTRUSIONS",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "TENNONS",      isStandard: true,  opPreset: "none",       qtyRule: "tbd"      },
      { name: "FXT-PLATE",    isStandard: false, opPreset: "standard",   qtyRule: "one"      },
    ],
  },
  {
    code: "CUT",
    fullName: "Cutter",
    parts: [
      { name: "XAR500-PLATE", isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "LOCATORS",     isStandard: false, opPreset: "standard",   qtyRule: "tbd"      },
      { name: "BLADE-BASE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "BLADE",        isStandard: false, opPreset: "standard",   qtyRule: "cavities" },
      { name: "MUSHROOM",     isStandard: true,  opPreset: "none",       qtyRule: "tbd"      },
      { name: "BACK-PLATE",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
    ],
  },
  {
    code: "AVL",
    fullName: "Anvil",
    parts: [
      { name: "FXT-PLATE",     isStandard: false, opPreset: "standard", qtyRule: "one"      },
      { name: "BOLSTER-PLATE", isStandard: false, opPreset: "standard", qtyRule: "one"      },
      { name: "WEAR-PLATE",    isStandard: false, opPreset: "laser",    qtyRule: "cavities" },
    ],
  },
  {
    code: "PBX",
    fullName: "Pressure Box",
    parts: [
      { name: "BASKET",       isStandard: false, opPreset: "standard",   qtyRule: "cavities" },
      { name: "BASKET-PLATE", isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "EXTRUSIONS",   isStandard: false, opPreset: "standard",   qtyRule: "one"      },
      { name: "PNP-FRAME",    isStandard: false, opPreset: "pnp-frame",  qtyRule: "one"      },
    ],
  },
];

// ── NC program naming convention ──────────────────────────────────────────────
// Format: [TOOL]-[SECTION]-[PART-NAME]_OP[NUMBER]-[SIDE]_R[REV].[EXT]
// Extensions: .hnc (Hurco), .h (Danusys)

export type NCMachine = "Hurco" | "Danusys";

export function buildNCFileName({
  tool,
  section,
  part,
  opNumber,
  side,
  rev,
  machine,
}: {
  tool: string;
  section: string;
  part: string;
  opNumber: number;
  side: string;
  rev: number;
  machine: NCMachine;
}): string {
  const ext = machine === "Hurco" ? "hnc" : "h";
  const opStr = String(opNumber * 10).padStart(2, "0"); // 1→10, 2→20
  const revStr = String(rev).padStart(2, "0");
  return `${tool}-${section}-${part}_OP${opStr}-${side}_R${revStr}.${ext}`;
}

// Example: buildNCFileName({ tool:"AFS700", section:"MLD", part:"FRAME", opNumber:1, side:"FRONT", rev:1, machine:"Hurco" })
// → "AFS700-MLD-FRAME_OP10-FRONT_R01.hnc"
