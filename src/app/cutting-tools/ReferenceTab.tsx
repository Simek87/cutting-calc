"use client";

import React, { useState } from "react";

const ROWS = [
  {
    type:  "Głowica (Face Mill)",
    vcMin: 500, vcMax: 1200,
    fzMin: 0.05, fzMax: 0.20,
    notes: "High Vc with sharp inserts; avoid built-up edge",
  },
  {
    type:  "End Mill",
    vcMin: 300, vcMax: 800,
    fzMin: 0.03, fzMax: 0.12,
    notes: "Reduce ae for slotting; 3–4 flutes recommended",
  },
  {
    type:  "TipRad",
    vcMin: 300, vcMax: 700,
    fzMin: 0.05, fzMax: 0.15,
    notes: "Corner radius protects edge; good for semi-finishing",
  },
  {
    type:  "Ballnose",
    vcMin: 300, vcMax: 500,
    fzMin: 0.01, fzMax: 0.05,
    notes: "Vc applied to Deff, not nominal D. Values for finishing — use TipRad for semi-finishing.",
  },
  {
    type:  "Drill",
    vcMin: 60, vcMax: 150,
    fzMin: 0.05, fzMax: 0.15,
    notes: "Peck for chip evacuation; through-coolant preferred. Per rev.",
  },
  {
    type:  "Reamer",
    vcMin: 30, vcMax: 80,
    fzMin: 0.05, fzMax: 0.20,
    notes: "0.1–0.3 mm stock for finishing; flood coolant. Per rev.",
  },
] as const;

const VC_MIN = 300;
const VC_MAX = 500;

function roundTo10(n: number) {
  return Math.round(n / 10) * 10;
}

interface DeffResult {
  deff: number;
  ratio: number;
  sMin: number;
  sMax: number;
  lowDeff: boolean;
}

function calcDeff(D: number, ap: number): DeffResult {
  const deff  = 2 * Math.sqrt(ap * (D - ap));
  const ratio = (deff / D) * 100;
  const sMin  = roundTo10((VC_MIN * 1000) / (Math.PI * deff));
  const sMax  = roundTo10((VC_MAX * 1000) / (Math.PI * deff));
  return { deff, ratio, sMin, sMax, lowDeff: deff < 0.5 * D };
}

function DeffCalculator() {
  const [D,      setD]      = useState("");
  const [ap,     setAp]     = useState("");
  const [result, setResult] = useState<DeffResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  const handleCalc = () => {
    const dVal  = Number(D);
    const apVal = Number(ap);
    if (!D || !ap || dVal <= 0 || apVal <= 0) {
      setError("Fill in both D and ap");
      setResult(null);
      return;
    }
    if (apVal >= dVal) {
      setError("ap must be less than D");
      setResult(null);
      return;
    }
    setError(null);
    setResult(calcDeff(dVal, apVal));
  };

  const inp = "w-full border rounded px-2 py-1.5 text-sm font-mono";
  const lbl = "block text-xs text-gray-500 mb-0.5";

  return (
    <div className="border rounded-lg bg-white overflow-hidden mt-4">
      <div className="bg-gray-800 px-4 py-2.5">
        <span className="text-sm font-bold text-white">Ballnose — Effective Diameter (D<sub>eff</sub>)</span>
        <span className="text-xs text-gray-400 ml-2 font-normal">Vc recommendations apply to D<sub>eff</sub>, not nominal D</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-end gap-3">
          <div className="w-32">
            <label className={lbl}>D (mm)</label>
            <input type="number" step="any" min="0" value={D}
              onChange={(e) => setD(e.target.value)}
              placeholder="e.g. 16" className={inp} />
          </div>
          <div className="w-32">
            <label className={lbl}>ap (mm)</label>
            <input type="number" step="any" min="0" value={ap}
              onChange={(e) => setAp(e.target.value)}
              placeholder="e.g. 2" className={inp} />
          </div>
          <button onClick={handleCalc}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium shrink-0"
          >⟳ Calculate D<sub>eff</sub></button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>

        {result && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">D<sub>eff</sub></div>
                <div className="font-mono font-bold text-gray-900 text-base">{result.deff.toFixed(2)}</div>
                <div className="text-xs text-gray-400">mm</div>
              </div>
              <div className="bg-gray-50 rounded p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">D<sub>eff</sub> / D</div>
                <div className="font-mono font-bold text-gray-900 text-base">{result.ratio.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">of nominal</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Recommended Vc</div>
                <div className="font-mono font-bold text-indigo-700 text-base">{VC_MIN}–{VC_MAX}</div>
                <div className="text-xs text-gray-400">m/min (Al)</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Recommended S</div>
                <div className="font-mono font-bold text-indigo-700 text-base">{result.sMin.toLocaleString()}–{result.sMax.toLocaleString()}</div>
                <div className="text-xs text-gray-400">rpm</div>
              </div>
            </div>
            {result.lowDeff && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ D<sub>eff</sub> is less than 50% of D — consider increasing ap or using a smaller ball nose for better surface speed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cheat sheet helpers ────────────────────────────────────────────────────

const th = "px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap";
const td = "px-3 py-2 font-mono tabular-nums text-sm whitespace-nowrap";
const tdL = "px-3 py-2 text-sm whitespace-nowrap font-medium text-gray-900";

function CardShell({ title, subtitle, footer, children }: {
  title: string; subtitle?: string; footer?: string; children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden mt-4">
      <div className="bg-gray-800 px-4 py-2.5">
        <span className="text-sm font-bold text-white">{title}</span>
        {subtitle && <span className="text-xs text-gray-400 ml-2 font-normal">{subtitle}</span>}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer && (
        <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-400 italic">{footer}</div>
      )}
    </div>
  );
}

// ── Cheat Sheet 1 — Ballnose Finishing ─────────────────────────────────────

const BN_ROWS = [
  { d: "D2",  ap: 0.2,  ae: 0.200, deff: 1.2, s: 14000, clamped: true,  vcAct: 52.8,  fz: 0.02, f: 560 },
  { d: "D3",  ap: 0.3,  ae: 0.245, deff: 1.8, s: 14000, clamped: true,  vcAct: 79.2,  fz: 0.02, f: 560 },
  { d: "D4",  ap: 0.4,  ae: 0.283, deff: 2.4, s: 14000, clamped: true,  vcAct: 105.6, fz: 0.02, f: 560 },
  { d: "D5",  ap: 0.5,  ae: 0.316, deff: 3.0, s: 14000, clamped: true,  vcAct: 131.9, fz: 0.02, f: 560 },
  { d: "D6",  ap: 0.6,  ae: 0.346, deff: 3.6, s: 14000, clamped: true,  vcAct: 158.3, fz: 0.02, f: 560 },
  { d: "D8",  ap: 0.8,  ae: 0.400, deff: 4.8, s: 14000, clamped: true,  vcAct: 211.1, fz: 0.02, f: 560 },
  { d: "D10", ap: 1.0,  ae: 0.447, deff: 6.0, s: 14000, clamped: true,  vcAct: 263.9, fz: 0.02, f: 560 },
  { d: "D12", ap: 1.2,  ae: 0.490, deff: 7.2, s: 14000, clamped: true,  vcAct: 316.7, fz: 0.02, f: 560 },
  { d: "D16", ap: 1.6,  ae: 0.566, deff: 9.6, s: 13260, clamped: false, vcAct: 400.0, fz: 0.02, f: 531 },
] as const;

function BallnoseCheatSheet() {
  return (
    <CardShell
      title="Ballnose Finishing — Aluminium (Z=2, cusp ≤ 0.005mm)"
      subtitle="Vc=400 m/min applied to Deff. Machine limit: 14,000 rpm (Hurco)"
      footer="* S clamped to 14,000 rpm (Hurco max). Vc actual < 400 m/min for D≤12. Use HSC spindle for full Vc on small diameters."
    >
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {["D (mm)", "ap (mm)", "ae (mm)", "Deff (mm)", "S (rpm)", "Vc actual (m/min)", "Fz (mm)", "F (mm/min)"].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {BN_ROWS.map((r) => (
            <tr key={r.d} className={r.clamped ? "bg-amber-50" : "hover:bg-gray-50"}>
              <td className={tdL}>{r.d}</td>
              <td className={td}>{r.ap.toFixed(1)}</td>
              <td className={td}>{r.ae.toFixed(3)}</td>
              <td className={td}>{r.deff.toFixed(1)}</td>
              <td className={`${td} ${r.clamped ? "text-amber-700 font-semibold" : "text-gray-700"}`}>
                {r.s.toLocaleString()}
                {r.clamped && (
                  <span className="ml-1" title="RPM clamped to machine limit — ideal Vc=400 not achievable on this diameter">⚠</span>
                )}
              </td>
              <td className={`${td} ${r.clamped ? "text-amber-700" : "text-gray-700"}`}>{r.vcAct.toFixed(1)}</td>
              <td className={td}>{r.fz.toFixed(2)}</td>
              <td className={td}>{r.f}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
}

// ── Cheat Sheet 2 — TipRad Finishing ──────────────────────────────────────

const TR_IDEAL: Record<string, number> = { "D6R": 21221, "D8R": 15915, "D10R": 12732, "D12R": 10610 };

const TR_HURCO = [
  { tool: "D6R",  ap: 0.2, ae: 0.3, s: 14000, clamped: true,  vcAct: 263.9, fz: 0.08, f: 3360 },
  { tool: "D8R",  ap: 0.2, ae: 0.3, s: 14000, clamped: true,  vcAct: 351.9, fz: 0.08, f: 3360 },
  { tool: "D10R", ap: 0.2, ae: 0.3, s: 12732, clamped: false, vcAct: 400.0, fz: 0.08, f: 3056 },
  { tool: "D12R", ap: 0.2, ae: 0.3, s: 10610, clamped: false, vcAct: 400.0, fz: 0.08, f: 2546 },
] as const;

const TR_DANUSYS = [
  { tool: "D6R",  ap: 0.2, ae: 0.3, s: 4250, clamped: true, vcAct: 80.1,  fz: 0.08, f: 1020 },
  { tool: "D8R",  ap: 0.2, ae: 0.3, s: 4250, clamped: true, vcAct: 106.8, fz: 0.08, f: 1020 },
  { tool: "D10R", ap: 0.2, ae: 0.3, s: 4250, clamped: true, vcAct: 133.5, fz: 0.08, f: 1020 },
  { tool: "D12R", ap: 0.2, ae: 0.3, s: 4250, clamped: true, vcAct: 160.2, fz: 0.08, f: 1020 },
] as const;

type TRMachine = "Hurco" | "Danusys";

function TipRadCheatSheet() {
  const [machine, setMachine] = useState<TRMachine>("Hurco");
  const rows = machine === "Hurco" ? TR_HURCO : TR_DANUSYS;

  return (
    <CardShell
      title="TipRad Finishing — Aluminium (Z=3)"
      footer="Vc=400 m/min target on nominal D, ap=0.2mm, ae=0.3mm fixed stepover. ⚠ = RPM clamped to machine limit, Vc actual < 400 m/min."
    >
      <div className="px-4 py-2.5 border-b flex items-center gap-2">
        {(["Hurco", "Danusys"] as TRMachine[]).map((m) => (
          <button key={m} onClick={() => setMachine(m)}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
              machine === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            {m === "Hurco" ? "Hurco (14,000 rpm)" : "Danusys (4,250 rpm)"}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {["Tool", "ap (mm)", "ae (mm)", "S (rpm)", "Vc actual (m/min)", "Fz (mm/tooth)", "F (mm/min)"].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.tool} className={r.clamped ? "bg-amber-50" : "hover:bg-gray-50"}>
              <td className={tdL}>{r.tool}</td>
              <td className={td}>{r.ap.toFixed(1)}</td>
              <td className={td}>{r.ae.toFixed(1)}</td>
              <td className={`${td} ${r.clamped ? "text-amber-700 font-semibold" : "text-gray-700"}`}>
                {r.s.toLocaleString()}
                {r.clamped && (
                  <span className="ml-1" title={`RPM clamped to machine limit — ideal S=${TR_IDEAL[r.tool]?.toLocaleString()} rpm`}>⚠</span>
                )}
              </td>
              <td className={`${td} ${r.clamped ? "text-amber-700" : "text-gray-700"}`}>{r.vcAct.toFixed(1)}</td>
              <td className={td}>{r.fz.toFixed(2)}</td>
              <td className={td}>{r.f.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
}

// ── Cheat Sheet 3 — Reamer HSS ─────────────────────────────────────────────

const REAMER_AL = [
  { d: "D6",  s: 3180, fpr: 0.15, f: 477 },
  { d: "D8",  s: 2390, fpr: 0.15, f: 358 },
  { d: "D10", s: 1910, fpr: 0.15, f: 286 },
  { d: "D12", s: 1590, fpr: 0.15, f: 238 },
] as const;

const REAMER_STEEL = [
  { d: "D6",  s: 1330, fpr: 0.10, f: 133 },
  { d: "D8",  s: 990,  fpr: 0.10, f: 99  },
  { d: "D10", s: 800,  fpr: 0.10, f: 80  },
  { d: "D12", s: 660,  fpr: 0.10, f: 66  },
] as const;

type ReamerMaterial = "Aluminium" | "Steel";

const REAMER_FOOTER: Record<ReamerMaterial, string> = {
  Aluminium: "Vc=60 m/min. Pre-drill to H7 tolerance. 0.1–0.3mm stock on diameter. Flood coolant.",
  Steel:     "Vc=25 m/min. Pre-drill to H7 tolerance. 0.1–0.3mm stock on diameter. Flood coolant, reduce Vc for stainless.",
};

function ReamerCheatSheet() {
  const [material, setMaterial] = useState<ReamerMaterial>("Aluminium");
  const rows = material === "Aluminium" ? REAMER_AL : REAMER_STEEL;

  return (
    <CardShell
      title="Reamer HSS — Starting Parameters"
      footer={REAMER_FOOTER[material]}
    >
      <div className="px-4 py-2.5 border-b flex items-center gap-2">
        {(["Aluminium", "Steel"] as ReamerMaterial[]).map((m) => (
          <button key={m} onClick={() => setMaterial(m)}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
              material === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >{m}</button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {["D (mm)", "S (rpm)", "fpr (mm/rev)", "F (mm/min)"].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.d} className="hover:bg-gray-50">
              <td className={tdL}>{r.d}</td>
              <td className={td}>{r.s.toLocaleString()}</td>
              <td className={td}>{r.fpr.toFixed(2)}</td>
              <td className={td}>{r.f}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardShell>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function ReferenceTab() {
  return (
    <div className="space-y-0">
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="bg-gray-900 px-4 py-2.5">
          <span className="text-sm font-bold text-white uppercase tracking-wider">Reference</span>
          <span className="text-xs text-gray-400 ml-2 font-normal">
            Aluminium (6061 / 7075) — Recommended cutting parameters
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Tool Type", "Vc min–max (m/min)", "Fz min–max (mm/tooth)", "Notes"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ROWS.map((row) => (
                <tr key={row.type} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{row.type}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-gray-700 whitespace-nowrap">
                    {row.vcMin}–{row.vcMax}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-gray-700 whitespace-nowrap">
                    {row.fzMin.toFixed(2)}–{row.fzMax.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-400 italic">
          Values are starting points for carbide tooling. Adjust for coating, coolant strategy, rigidity and depth of cut.
        </div>
      </div>

      <DeffCalculator />
      <BallnoseCheatSheet />
      <TipRadCheatSheet />
      <ReamerCheatSheet />
    </div>
  );
}
