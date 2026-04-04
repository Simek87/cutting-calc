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

// ── Section part templates ────────────────────────────────────────────────────

export interface SectionPartTemplate {
  name: string;
  /** True = bought-in standard part: no machining ops, no material order */
  isStandard: boolean;
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
      { name: "FXT-PLATE",   isStandard: false },
      { name: "FRAME-PLATE", isStandard: false },
      { name: "BASE-PLATE",  isStandard: false },
      { name: "CAVITY",      isStandard: false },
      { name: "EXTRUSIONS",  isStandard: false },
      { name: "VAC-PLATE",   isStandard: false },
      { name: "WATER-PLATE", isStandard: false },
    ],
  },
  {
    code: "PLG",
    fullName: "Plug Assist",
    parts: [
      { name: "PLUG",         isStandard: false },
      { name: "PLUG-PLATE",   isStandard: false },
      { name: "CLAM-PLATE",   isStandard: false },
      { name: "VAC-BLOCK",    isStandard: false },
      { name: "PLUG-SHAFT",   isStandard: false },
      { name: "MOVING-PLATE", isStandard: false },
      { name: "EXTRUSIONS",   isStandard: false },
      { name: "TENNONS",      isStandard: true  }, // bought-in standard part
      { name: "FXT-PLATE",    isStandard: false },
    ],
  },
  {
    code: "CUT",
    fullName: "Cutter",
    parts: [
      { name: "XAR500-PLATE", isStandard: false },
      { name: "LOCATORS",     isStandard: false },
      { name: "BLADE-BASE",   isStandard: false },
      { name: "BLADE",        isStandard: false },
      { name: "MUSHROOM",     isStandard: true  }, // bought-in standard part
      { name: "BACK-PLATE",   isStandard: false },
    ],
  },
  {
    code: "AVL",
    fullName: "Anvil",
    parts: [
      { name: "FXT-PLATE",    isStandard: false },
      { name: "BOLSTER-PLATE",isStandard: false },
      { name: "WEAR-PLATE",   isStandard: false },
    ],
  },
  {
    code: "PBX",
    fullName: "Pressure Box",
    parts: [
      { name: "BASKET",       isStandard: false },
      { name: "BASKET-PLATE", isStandard: false },
      { name: "EXTRUSIONS",   isStandard: false },
      { name: "PNP-FRAME",    isStandard: false },
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
