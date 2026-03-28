"use client";

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
    vcMin: 150, vcMax: 400,
    fzMin: 0.01, fzMax: 0.05,
    notes: "Vc at ball centre is 0 — use effective Deff",
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

export function ReferenceTab() {
  return (
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
  );
}
