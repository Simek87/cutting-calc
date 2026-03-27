"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Machine = "Danusys" | "Hurco" | "Both";

interface CuttingTool {
  id: string;
  name: string;
  machine: Machine;
  toolType: string | null;
  diameter: number;
  cornerRadius: number | null;
  flutes: number;
  notes: string | null;
  vc:   number | null;
  rpm:  number | null;
  feed: number | null;
  fz:   number | null;
  ap:   number | null;
  ae:   number | null;
  mrr:  number | null;
}

// ── Machine limits ─────────────────────────────────────────────────────────

const MACHINE_MAX_RPM: Record<Machine, number> = {
  Danusys: 4250,
  Hurco: 14000,
  Both: 14000, // use higher limit when tool fits both; calculator lets user select
};

const MACHINES: Machine[] = ["Danusys", "Hurco", "Both"];

const MACHINE_COLORS: Record<Machine, string> = {
  Danusys: "bg-orange-100 text-orange-700 border-orange-300",
  Hurco:   "bg-blue-100 text-blue-700 border-blue-300",
  Both:    "bg-purple-100 text-purple-700 border-purple-300",
};

// ── Calculator formulas ────────────────────────────────────────────────────

// rpm (s) = (vc [m/min] × 1000) / (π × D [mm])
function calcRpm(vc: number, D: number): number {
  return (vc * 1000) / (Math.PI * D);
}

// feed (f) [mm/min] = fz [mm/tooth] × z [flutes] × rpm
function calcFeed(fz: number, z: number, rpm: number): number {
  return fz * z * rpm;
}

// MRR [cm³/min] = (ae [mm] × ap [mm] × f [mm/min]) / 1000
function calcMrr(ae: number, ap: number, feed: number): number {
  return (ae * ap * feed) / 1000;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, dec = 1) =>
  v != null ? v.toFixed(dec) : "—";

const numField = (v: string) => (v === "" ? null : Number(v));

// ── Empty form state ───────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: "", machine: "Hurco" as Machine, toolType: "",
    diameter: "", cornerRadius: "", flutes: "",
    notes: "", vc: "", rpm: "", feed: "", fz: "", ap: "", ae: "", mrr: "",
  };
}

// ── Main component ─────────────────────────────────────────────────────────

export function CuttingToolsClient({ initialTools }: { initialTools: CuttingTool[] }) {
  const [tools, setTools] = useState<CuttingTool[]>(initialTools);
  const [machineFilter, setMachineFilter] = useState<Machine | "All">("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Calculator state
  const [calc, setCalc] = useState({
    D: "", z: "", vc: "", fz: "", ap: "", ae: "",
    machine: "Hurco" as Machine,
  });

  // ── Filtered tools ───────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    machineFilter === "All"
      ? tools
      : tools.filter((t) => t.machine === machineFilter || t.machine === "Both"),
    [tools, machineFilter]
  );

  // ── Calculator results ───────────────────────────────────────────────────

  const calcResult = useMemo(() => {
    const D  = Number(calc.D);
    const z  = Number(calc.z);
    const vc = Number(calc.vc);
    const fz = Number(calc.fz);
    const ap = Number(calc.ap);
    const ae = Number(calc.ae);
    if (!D || !z || !vc || !fz) return null;

    const maxRpm   = MACHINE_MAX_RPM[calc.machine];
    const idealRpm = calcRpm(vc, D);
    const clamped  = idealRpm > maxRpm;
    const actualRpm = clamped ? maxRpm : idealRpm;
    const f  = calcFeed(fz, z, actualRpm);
    const mrr = ap && ae ? calcMrr(ae, ap, f) : null;

    return { idealRpm, clamped, actualRpm, maxRpm, f, mrr };
  }, [calc]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setC = (k: string, v: string) => setCalc((p) => ({ ...p, [k]: v }));

  const startAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (t: CuttingTool) => {
    setForm({
      name: t.name, machine: t.machine, toolType: t.toolType ?? "",
      diameter: String(t.diameter),
      cornerRadius: t.cornerRadius != null ? String(t.cornerRadius) : "",
      flutes: String(t.flutes),
      notes: t.notes ?? "",
      vc:   t.vc   != null ? String(t.vc)   : "",
      rpm:  t.rpm  != null ? String(t.rpm)  : "",
      feed: t.feed != null ? String(t.feed) : "",
      fz:   t.fz   != null ? String(t.fz)   : "",
      ap:   t.ap   != null ? String(t.ap)   : "",
      ae:   t.ae   != null ? String(t.ae)   : "",
      mrr:  t.mrr  != null ? String(t.mrr)  : "",
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  // Load tool params into calculator
  const loadIntoCalc = (t: CuttingTool) => {
    setCalc({
      D:  String(t.diameter),
      z:  String(t.flutes),
      vc: t.vc  != null ? String(t.vc)  : "",
      fz: t.fz  != null ? String(t.fz)  : "",
      ap: t.ap  != null ? String(t.ap)  : "",
      ae: t.ae  != null ? String(t.ae)  : "",
      machine: t.machine === "Both" ? "Hurco" : t.machine,
    });
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name:         form.name.trim(),
      machine:      form.machine,
      toolType:     form.toolType.trim() || null,
      diameter:     Number(form.diameter),
      cornerRadius: numField(form.cornerRadius),
      flutes:       Number(form.flutes),
      notes:        form.notes.trim() || null,
      vc:   numField(form.vc),
      rpm:  numField(form.rpm),
      feed: numField(form.feed),
      fz:   numField(form.fz),
      ap:   numField(form.ap),
      ae:   numField(form.ae),
      mrr:  numField(form.mrr),
    };

    if (editingId) {
      const res = await fetch(`/api/cutting-tools/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setTools((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
    } else {
      const res = await fetch("/api/cutting-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setTools((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/cutting-tools/${id}`, { method: "DELETE" });
    setTools((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cutting Tools</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tool library · Machining parameters · Calculator</p>
        </div>
        <button
          onClick={startAdd}
          className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
        >
          + Add Tool
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-lg bg-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700">
              {editingId ? "Edit Tool" : "New Tool"}
            </span>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕ Cancel</button>
          </div>

          {/* Row 1: name / type / machine */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Name *</label>
              <input required value={form.name} onChange={(e) => setF("name", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g. EM Ø8 4F" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Type</label>
              <input value={form.toolType} onChange={(e) => setF("toolType", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="End mill, drill…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Machine *</label>
              <select required value={form.machine} onChange={(e) => setF("machine", e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                {MACHINES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: geometry */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">D (mm) *</label>
              <input required type="number" step="any" min="0" value={form.diameter} onChange={(e) => setF("diameter", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="8" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">R (mm)</label>
              <input type="number" step="any" min="0" value={form.cornerRadius} onChange={(e) => setF("cornerRadius", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Z (flutes) *</label>
              <input required type="number" min="1" step="1" value={form.flutes} onChange={(e) => setF("flutes", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="4" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
              <input value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Optional" />
            </div>
          </div>

          {/* Row 3: machining params */}
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Machining Parameters (reference values)</div>
            <div className="grid grid-cols-7 gap-2">
              {[
                { k: "vc",   label: "Vc (m/min)",  ph: "80" },
                { k: "rpm",  label: "S (rpm)",      ph: "3200" },
                { k: "feed", label: "F (mm/min)",   ph: "640" },
                { k: "fz",   label: "Fz (mm/tooth)",ph: "0.05" },
                { k: "ap",   label: "ap (mm)",      ph: "5" },
                { k: "ae",   label: "ae (mm)",      ph: "2" },
                { k: "mrr",  label: "MRR (cm³/min)",ph: "" },
              ].map(({ k, label, ph }) => (
                <div key={k}>
                  <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                  <input
                    type="number" step="any" min="0"
                    value={(form as Record<string, string>)[k]}
                    onChange={(e) => setF(k, e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs"
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded hover:bg-gray-700">
            {editingId ? "Save Changes" : "Add Tool"}
          </button>
        </form>
      )}

      {/* Machine filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Machine:</span>
        {(["All", ...MACHINES] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMachineFilter(m)}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
              machineFilter === m
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            {m === "All" ? `All (${tools.length})` : `${m} (${tools.filter(t => t.machine === m || (m !== "Both" && t.machine === "Both")).length})`}
          </button>
        ))}
      </div>

      {/* Tool table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Tool", "Type", "Machine", "D", "R", "Z", "Vc", "S", "F", "Fz", "ap", "ae", "MRR", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["", "", "", "mm", "mm", "", "m/min", "rpm", "mm/min", "mm/tooth", "mm", "mm", "cm³/min", ""].map((u, i) => (
                  <th key={i} className="px-3 pb-1 text-left text-gray-400 font-normal normal-case tracking-normal">
                    {u}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-6 text-center text-gray-400">
                    No tools yet. Add one above.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{t.name}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{t.toolType ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${MACHINE_COLORS[t.machine]}`}>
                      {t.machine}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.diameter, 1)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.cornerRadius, 1)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{t.flutes}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.vc, 0)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.rpm, 0)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.feed, 0)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{t.fz != null ? t.fz.toFixed(3) : "—"}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.ap, 1)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.ae, 1)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{fmt(t.mrr, 2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadIntoCalc(t)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                        title="Load into calculator"
                      >
                        ⟶ calc
                      </button>
                      <button
                        onClick={() => startEdit(t)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="text-xs text-gray-300 hover:text-red-500"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculator */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="bg-gray-900 px-4 py-2.5">
          <span className="text-sm font-bold text-white uppercase tracking-wider">Calculator</span>
          <span className="text-xs text-gray-400 ml-2 font-normal">rpm · feed · MRR</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-7 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Machine</label>
              <select
                value={calc.machine}
                onChange={(e) => setC("machine", e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="Danusys">Danusys (max {MACHINE_MAX_RPM.Danusys.toLocaleString()} rpm)</option>
                <option value="Hurco">Hurco (max {MACHINE_MAX_RPM.Hurco.toLocaleString()} rpm)</option>
              </select>
            </div>
            {[
              { k: "D",  label: "D (mm)",       ph: "8",    title: "Tool diameter" },
              { k: "z",  label: "Z (flutes)",    ph: "4",    title: "Number of flutes" },
              { k: "vc", label: "Vc (m/min)",    ph: "80",   title: "Cutting speed" },
              { k: "fz", label: "Fz (mm/tooth)", ph: "0.05", title: "Feed per tooth" },
              { k: "ap", label: "ap (mm)",       ph: "5",    title: "Axial depth of cut" },
              { k: "ae", label: "ae (mm)",       ph: "2",    title: "Radial depth of cut" },
            ].map(({ k, label, ph, title }) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1" title={title}>{label}</label>
                <input
                  type="number" step="any" min="0"
                  value={(calc as Record<string, string>)[k]}
                  onChange={(e) => setC(k, e.target.value)}
                  placeholder={ph}
                  className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                />
              </div>
            ))}
          </div>

          {/* Results */}
          {calcResult ? (
            <div className="grid grid-cols-4 gap-3 pt-2 border-t">
              {/* rpm */}
              <div className={`rounded p-3 ${calcResult.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                <div className="text-xs text-gray-500 mb-1">S — Ideal rpm</div>
                <div className="text-lg font-mono font-bold text-gray-800">
                  {Math.round(calcResult.idealRpm).toLocaleString()}
                </div>
                {calcResult.clamped && (
                  <div className="text-xs text-amber-700 mt-1">
                    ⚠ exceeds machine limit
                  </div>
                )}
              </div>

              {/* machine-limited rpm */}
              <div className={`rounded p-3 ${calcResult.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <div className="text-xs text-gray-500 mb-1">
                  S — Machine rpm {calcResult.clamped ? "(clamped)" : "(OK)"}
                </div>
                <div className={`text-lg font-mono font-bold ${calcResult.clamped ? "text-red-700" : "text-green-700"}`}>
                  {Math.round(calcResult.actualRpm).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  max {calcResult.maxRpm.toLocaleString()} rpm
                </div>
              </div>

              {/* feed */}
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">
                  F — Feed {calcResult.clamped ? "(at machine rpm)" : ""}
                </div>
                <div className="text-lg font-mono font-bold text-gray-800">
                  {Math.round(calcResult.f).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">mm/min</div>
              </div>

              {/* MRR */}
              <div className={`rounded p-3 ${calcResult.mrr != null ? "bg-gray-50" : "bg-gray-50 opacity-50"}`}>
                <div className="text-xs text-gray-500 mb-1">MRR</div>
                {calcResult.mrr != null ? (
                  <>
                    <div className="text-lg font-mono font-bold text-gray-800">
                      {calcResult.mrr.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">cm³/min</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-1">enter ap + ae</div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3 text-sm text-gray-400 border-t">
              Enter D, Z, Vc and Fz to calculate.
            </div>
          )}

          {/* Formula reference */}
          <div className="text-xs text-gray-400 font-mono space-y-0.5 pt-1 border-t">
            <div>S = (Vc × 1000) / (π × D)   |   F = Fz × Z × S_actual   |   MRR = (ae × ap × F) / 1000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
