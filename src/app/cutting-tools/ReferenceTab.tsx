"use client";

import { useState } from "react";

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
    </div>
  );
}
