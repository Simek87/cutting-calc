// ── Cutting Tools — calculation helpers, types, formatters ────────────────
// Single source of truth for all machining formulas used in this module.

// ── Types ──────────────────────────────────────────────────────────────────

/** Human-readable labels for tool type DB values. */
export const TOOL_TYPE_LABELS: Record<string, string> = {
  FACE_MILL: "Głowica",
  END_MILL:  "End Mill",
  TIP_RAD:   "TipRad",
  BALL_NOSE: "Ballnose",
};

/** Ordered list of known tool type values (for dropdowns and filters). */
export const TOOL_TYPES = ["FACE_MILL", "END_MILL", "TIP_RAD", "BALL_NOSE"] as const;

/** Default cutting parameters per tool type — applied on type selection in the Add Tool form. */
export const TOOL_TYPE_DEFAULTS: Record<string, { vc: number; fz: number; z: number }> = {
  FACE_MILL: { vc: 600,  fz: 0.15, z: 3 },
  END_MILL:  { vc: 300,  fz: 0.10, z: 3 },
  TIP_RAD:   { vc: 400,  fz: 0.10, z: 3 },
  BALL_NOSE: { vc: 275,  fz: 0.03, z: 2 },
};

/** Machines that support numeric RPM limits. "Both" is a library tag only. */
export type CalcMachine = "Danusys" | "Hurco";

/** A saved tool from the cutting-tools library (mirrors the DB model). */
export interface CuttingTool {
  id:           string;
  name:         string;
  machine:      "Danusys" | "Hurco" | "Both";
  toolType:     string | null;
  diameter:     number;
  cornerRadius: number | null;
  flutes:       number;
  notes:        string | null;
  vc:   number | null;
  rpm:  number | null;
  feed: number | null;
  fz:   number | null;
  ap:   number | null;
  ae:   number | null;
  mrr:  number | null;
}

/** One comparison setup — all fields are strings (controlled form inputs). */
export interface Setup {
  id:      string;
  name:    string;
  toolId:  string;
  D:       string;  // diameter [mm]
  R:       string;  // corner radius [mm] — display/context only, not in MRR formula
  z:       string;  // number of flutes
  machine: CalcMachine;
  vc:      string;  // cutting speed [m/min]
  fz:      string;  // feed per tooth [mm/tooth]
  ap:      string;  // axial depth of cut [mm]
  ae:      string;  // radial depth of cut [mm]
}

/** A saved preset — persisted to localStorage; recomputed on load. */
export interface Preset {
  id:      string;       // timestamp-based key
  name:    string;       // user-defined label, e.g. "Al roughing ap5 ae2"
  toolId:  string;
  D:       string;
  R:       string;
  z:       string;
  machine: CalcMachine;
  vc:      string;
  fz:      string;
  ap:      string;
  ae:      string;
}

/** Computed outputs for one setup. */
export interface SetupResult {
  idealRpm:  number;        // theoretical spindle speed
  clamped:   boolean;       // true when idealRpm > machine max
  actualRpm: number;        // min(idealRpm, machineMax)
  maxRpm:    number;        // machine limit used
  feed:      number;        // [mm/min]
  mrr:       number | null; // [cm³/min] — null when ap or ae not provided
}

// ── Machine limits ─────────────────────────────────────────────────────────

export const MACHINE_MAX_RPM: Record<CalcMachine, number> = {
  Danusys: 4250,
  Hurco:   14000,
};

// ── Formulas ───────────────────────────────────────────────────────────────

/** S = (Vc × 1000) / (π × D) */
export function calcRpm(vc: number, D: number): number {
  return (vc * 1000) / (Math.PI * D);
}

/** Vc = (S × π × D) / 1000   — inverse of calcRpm */
export function calcVc(s: number, D: number): number {
  return (s * Math.PI * D) / 1000;
}

/** F = Fz × Z × S_actual */
export function calcFeed(fz: number, z: number, rpm: number): number {
  return fz * z * rpm;
}

/** Fz = F / (Z × S_actual)   — inverse of calcFeed */
export function calcFz(f: number, z: number, rpm: number): number {
  return f / (z * rpm);
}

/** MRR = (ae × ap × F) / 1000   [cm³/min] */
export function calcMrr(ae: number, ap: number, feed: number): number {
  return (ae * ap * feed) / 1000;
}

/**
 * Compute all outputs for a setup.
 * Returns null if any required input (D, Z, Vc, Fz) is missing or non-positive,
 * preventing NaN / Infinity from appearing in the UI.
 */
export function calcSetupResult(s: Setup): SetupResult | null {
  const D  = Number(s.D);
  const z  = Number(s.z);
  const vc = Number(s.vc);
  const fz = Number(s.fz);
  const ap = Number(s.ap);
  const ae = Number(s.ae);

  if (D <= 0 || z <= 0 || !vc || !fz) return null;

  const maxRpm    = MACHINE_MAX_RPM[s.machine];
  const idealRpm  = calcRpm(vc, D);
  const clamped   = idealRpm > maxRpm;
  const actualRpm = clamped ? maxRpm : idealRpm;
  const feed      = calcFeed(fz, z, actualRpm);
  const mrr       = ap > 0 && ae > 0 ? calcMrr(ae, ap, feed) : null;

  return { idealRpm, clamped, actualRpm, maxRpm, feed, mrr };
}

/** One slot in the MRR Comparator — bidirectional speed input (Vc or S). */
export interface ComparatorSlot {
  id:        string;
  name:      string;
  toolId:    string;
  D:         string;
  z:         string;
  machine:   CalcMachine;
  speedMode: "vc" | "s";
  vc:        string;   // input when speedMode === "vc"
  s:         string;   // input when speedMode === "s"
  fz:        string;
  ap:        string;
  ae:        string;
}

/** Computed result for one Comparator slot — all values resolved. */
export interface ComparatorResult {
  idealRpm:  number;
  clamped:   boolean;
  actualRpm: number;
  maxRpm:    number;
  vc:        number;
  feed:      number;
  fz:        number;
  mrr:       number | null;
}

/**
 * Compute all outputs for a Comparator slot.
 * Handles Vc→S and S→Vc input paths.
 * Returns null when required inputs are missing or non-positive.
 */
export function calcComparatorResult(slot: ComparatorSlot): ComparatorResult | null {
  const D = Number(slot.D);
  const z = Number(slot.z);
  if (D <= 0 || z <= 0) return null;

  const maxRpm = MACHINE_MAX_RPM[slot.machine];

  let idealRpm: number;
  let vc: number;

  if (slot.speedMode === "vc") {
    const vcIn = Number(slot.vc);
    if (!vcIn) return null;
    vc       = vcIn;
    idealRpm = calcRpm(vcIn, D);              // S = (Vc×1000)/(π×D)
  } else {
    const sIn = Number(slot.s);
    if (!sIn) return null;
    idealRpm = sIn;
    vc       = calcVc(sIn, D);               // Vc = (S×π×D)/1000
  }

  const clamped   = idealRpm > maxRpm;
  const actualRpm = clamped ? maxRpm : idealRpm;

  const fzIn = Number(slot.fz);
  if (!fzIn) return null;

  const feed = calcFeed(fzIn, z, actualRpm); // F = Fz×Z×S_actual
  const ap   = Number(slot.ap);
  const ae   = Number(slot.ae);
  const mrr  = ap > 0 && ae > 0 ? calcMrr(ae, ap, feed) : null;

  return { idealRpm, clamped, actualRpm, maxRpm, vc, feed, fz: fzIn, mrr };
}

// ── Clamp helpers ──────────────────────────────────────────────────────────

/** How much idealRpm exceeds the machine max, in percent. 0 if not clamped. */
export function getClampPct(r: SetupResult): number {
  if (!r.clamped) return 0;
  return Math.round(((r.idealRpm - r.maxRpm) / r.maxRpm) * 100);
}

/** True when the speed is limited by more than 30% — worth a visible warning. */
export function isHeavilyClamped(r: SetupResult): boolean {
  return getClampPct(r) > 30;
}

// ── Number formatters ──────────────────────────────────────────────────────

/** Whole-number rpm with locale thousands separator: 14,000 */
export const fmtRpm  = (n: number): string => Math.round(n).toLocaleString();

/** Cutting speed to 1 decimal: 80.0 m/min */
export const fmtVc   = (n: number): string => n.toFixed(1);

/** Feed rate to 1 decimal place: 740.0 mm/min */
export const fmtFeed = (n: number): string => n.toFixed(1);

/** Feed per tooth to 3 decimal places: 0.050 mm/tooth */
export const fmtFz   = (n: number): string => n.toFixed(3);

/** MRR to 1 decimal place: 5.9 cm³/min */
export const fmtMrr  = (n: number): string => n.toFixed(1);

/** Signed percentage to 1 decimal: +12.3% or −5.1% */
export const fmtPct  = (n: number): string => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
