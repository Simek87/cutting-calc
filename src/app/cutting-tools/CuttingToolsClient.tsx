"use client";

import { useState, useMemo, useRef } from "react";
import {
  type CuttingTool,
  type Setup,
  MACHINE_MAX_RPM,
  calcSetupResult,
  getClampPct,
  isHeavilyClamped,
  calcRpm,
  calcFeed,
  calcMrr,
  fmtRpm,
  fmtFeed,
  fmtMrr,
  fmtPct,
} from "./calc";
import { SetupCard } from "./SetupCard";
import { usePresets } from "./usePresets";

// ── Local types (library/UI only) ──────────────────────────────────────────

type Machine = "Danusys" | "Hurco" | "Both";
type Tab     = "library" | "calculator" | "compare";

// ── Constants ──────────────────────────────────────────────────────────────

const MACHINES: Machine[] = ["Danusys", "Hurco", "Both"];

const MACHINE_COLORS: Record<Machine, string> = {
  Danusys: "bg-orange-100 text-orange-700 border-orange-300",
  Hurco:   "bg-blue-100 text-blue-700 border-blue-300",
  Both:    "bg-purple-100 text-purple-700 border-purple-300",
};

const SETUP_NAMES = ["Setup A", "Setup B", "Setup C"] as const;

// ── Local helpers ──────────────────────────────────────────────────────────

const fmt      = (v: number | null | undefined, dec = 1) => v != null ? v.toFixed(dec) : "—";
const numField = (v: string) => (v === "" ? null : Number(v));

function emptySetup(name: string, id: string): Setup {
  return { id, name, toolId: "", D: "", R: "", z: "", machine: "Hurco", vc: "", fz: "", ap: "", ae: "" };
}

function emptyForm() {
  return {
    name: "", machine: "Hurco" as Machine, toolType: "",
    diameter: "", cornerRadius: "", flutes: "",
    notes: "", vc: "", rpm: "", feed: "", fz: "", ap: "", ae: "", mrr: "",
  };
}

// ── Main component ─────────────────────────────────────────────────────────

export function CuttingToolsClient({ initialTools }: { initialTools: CuttingTool[] }) {
  const [tools, setTools]                 = useState<CuttingTool[]>(initialTools);
  const [tab, setTab]                     = useState<Tab>("library");
  const [machineFilter, setMachineFilter] = useState<Machine | "All">("All");
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const nextId                            = useRef(3);

  // Standalone calculator state
  const [calc, setCalc] = useState({
    D: "", z: "", vc: "", fz: "", ap: "", ae: "",
    machine: "Hurco" as Machine,
  });

  // Saved presets (localStorage)
  const { presets, savePreset, deletePreset } = usePresets();

  // Compare Setups — 2 by default (A, B), max 3
  const [setups, setSetups] = useState<Setup[]>([
    emptySetup(SETUP_NAMES[0], "s1"),
    emptySetup(SETUP_NAMES[1], "s2"),
  ]);

  // ── Filtered library tools ────────────────────────────────────────────────

  const filtered = useMemo(() =>
    machineFilter === "All"
      ? tools
      : tools.filter((t) => t.machine === machineFilter || t.machine === "Both"),
    [tools, machineFilter]
  );

  // ── Standalone calculator result ──────────────────────────────────────────

  const calcResult = useMemo(() => {
    const D  = Number(calc.D);
    const z  = Number(calc.z);
    const vc = Number(calc.vc);
    const fz = Number(calc.fz);
    const ap = Number(calc.ap);
    const ae = Number(calc.ae);
    if (D <= 0 || z <= 0 || !vc || !fz) return null;

    const maxRpm    = MACHINE_MAX_RPM[calc.machine as "Danusys" | "Hurco"] ?? 14000;
    const idealRpm  = calcRpm(vc, D);
    const clamped   = idealRpm > maxRpm;
    const actualRpm = clamped ? maxRpm : idealRpm;
    const f         = calcFeed(fz, z, actualRpm);
    const mrr       = ap > 0 && ae > 0 ? calcMrr(ae, ap, f) : null;
    return { idealRpm, clamped, actualRpm, maxRpm, f, mrr };
  }, [calc]);

  // ── Compare setup results ─────────────────────────────────────────────────

  const setupResults = useMemo(() => setups.map(calcSetupResult), [setups]);

  // ── Setup CRUD helpers ────────────────────────────────────────────────────

  const updateSetup = (id: string, patch: Partial<Setup>) =>
    setSetups((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));

  const removeSetup = (id: string) =>
    setSetups((prev) => prev.filter((s) => s.id !== id));

  const addSetup = () => {
    const id   = `s${nextId.current++}`;
    const name = SETUP_NAMES[setups.length] ?? `Setup ${setups.length + 1}`;
    setSetups((prev) => [...prev, emptySetup(name, id)]);
  };

  const duplicateSetup = (id: string) => {
    const src = setups.find((s) => s.id === id);
    if (!src || setups.length >= 3) return;
    const newId = `s${nextId.current++}`;
    setSetups((prev) => [...prev, { ...src, id: newId, name: src.name + " (copy)" }]);
  };

  const resetSetup = (id: string) =>
    setSetups((prev) => prev.map((s) => s.id === id ? emptySetup(s.name, s.id) : s));

  // ── Library form helpers ──────────────────────────────────────────────────

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setC = (k: string, v: string) => setCalc((p) => ({ ...p, [k]: v }));

  const startAdd = () => { setForm(emptyForm()); setEditingId(null); setShowForm(true); };

  const startEdit = (t: CuttingTool) => {
    setForm({
      name: t.name, machine: t.machine, toolType: t.toolType ?? "",
      diameter:     String(t.diameter),
      cornerRadius: t.cornerRadius != null ? String(t.cornerRadius) : "",
      flutes:       String(t.flutes),
      notes:        t.notes ?? "",
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
    setTab("calculator");
  };

  // ── Library API ───────────────────────────────────────────────────────────

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
      vc:   numField(form.vc),   rpm:  numField(form.rpm),
      feed: numField(form.feed), fz:   numField(form.fz),
      ap:   numField(form.ap),   ae:   numField(form.ae),
      mrr:  numField(form.mrr),
    };
    if (editingId) {
      const res     = await fetch(`/api/cutting-tools/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const updated = await res.json();
      setTools((prev) => prev.map((t) => t.id === editingId ? updated : t));
    } else {
      const res     = await fetch("/api/cutting-tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  // ── Summary data ──────────────────────────────────────────────────────────

  const summaryRows = setups.map((s, i) => {
    const result   = setupResults[i];
    const libTool  = tools.find((t) => t.id === s.toolId);
    const toolName = libTool?.name ?? (s.D ? `Ø${s.D}` : "—");
    return { setup: s, result, toolName };
  });

  const validMrrs = summaryRows.map((r) => r.result?.mrr ?? null).filter((v): v is number => v !== null);
  const bestMrr   = validMrrs.length > 0 ? Math.max(...validMrrs) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cutting Tools</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tool library · Calculator · Compare Setups</p>
        </div>
        {tab === "library" && (
          <button onClick={startAdd} className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700">
            + Add Tool
          </button>
        )}
        {tab === "compare" && setups.length < 3 && (
          <button onClick={addSetup} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:border-gray-500">
            + Add Setup
          </button>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex items-center border-b">
        {(["library", "calculator", "compare"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "library" ? "Library" : t === "calculator" ? "Calculator" : "Compare Setups"}
          </button>
        ))}
      </div>

      {/* ══ Library tab ══ */}
      {tab === "library" && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="border rounded-lg bg-white p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">{editingId ? "Edit Tool" : "New Tool"}</span>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕ Cancel</button>
              </div>
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
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Machining Parameters (reference values)</div>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { k: "vc",   label: "Vc (m/min)",   ph: "80"   },
                    { k: "rpm",  label: "S (rpm)",       ph: "3200" },
                    { k: "feed", label: "F (mm/min)",    ph: "640"  },
                    { k: "fz",   label: "Fz (mm/tooth)", ph: "0.05" },
                    { k: "ap",   label: "ap (mm)",       ph: "5"    },
                    { k: "ae",   label: "ae (mm)",       ph: "2"    },
                    { k: "mrr",  label: "MRR (cm³/min)", ph: ""     },
                  ].map(({ k, label, ph }) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                      <input type="number" step="any" min="0" value={(form as Record<string, string>)[k]} onChange={(e) => setF(k, e.target.value)} className="w-full border rounded px-2 py-1 text-xs" placeholder={ph} />
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded hover:bg-gray-700">
                {editingId ? "Save Changes" : "Add Tool"}
              </button>
            </form>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-1">Machine:</span>
            {(["All", ...MACHINES] as const).map((m) => (
              <button key={m} onClick={() => setMachineFilter(m)}
                className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
                  machineFilter === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                }`}
              >
                {m === "All" ? `All (${tools.length})` : `${m} (${tools.filter(t => t.machine === m || (m !== "Both" && t.machine === "Both")).length})`}
              </button>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Tool","Type","Machine","D","R","Z","Vc","S","F","Fz","ap","ae","MRR",""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["","","","mm","mm","","m/min","rpm","mm/min","mm/tooth","mm","mm","cm³/min",""].map((u, i) => (
                      <th key={i} className="px-3 pb-1 text-left text-gray-400 font-normal normal-case tracking-normal">{u}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={14} className="px-4 py-6 text-center text-gray-400">No tools yet. Add one above.</td></tr>
                  )}
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{t.name}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{t.toolType ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${MACHINE_COLORS[t.machine]}`}>{t.machine}</span>
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
                          <button onClick={() => loadIntoCalc(t)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium" title="Load into calculator">⟶ calc</button>
                          <button onClick={() => startEdit(t)} className="text-xs text-gray-400 hover:text-gray-700" title="Edit">✎</button>
                          <button onClick={() => handleDelete(t.id, t.name)} className="text-xs text-gray-300 hover:text-red-500" title="Delete">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ Calculator tab ══ */}
      {tab === "calculator" && (
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="bg-gray-900 px-4 py-2.5">
            <span className="text-sm font-bold text-white uppercase tracking-wider">Calculator</span>
            <span className="text-xs text-gray-400 ml-2 font-normal">rpm · feed · MRR</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-7 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Machine</label>
                <select value={calc.machine} onChange={(e) => setC("machine", e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
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
                  <input type="number" step="any" min="0" value={(calc as Record<string, string>)[k]} onChange={(e) => setC(k, e.target.value)} placeholder={ph} className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              ))}
            </div>
            {calcResult ? (
              <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                <div className={`rounded p-3 ${calcResult.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-500 mb-1">S — Ideal rpm</div>
                  <div className="text-lg font-mono font-bold text-gray-800">{fmtRpm(calcResult.idealRpm)}</div>
                  {calcResult.clamped && <div className="text-xs text-amber-700 mt-1">⚠ exceeds machine limit</div>}
                </div>
                <div className={`rounded p-3 ${calcResult.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                  <div className="text-xs text-gray-500 mb-1">S — Machine rpm {calcResult.clamped ? "(clamped)" : "(OK)"}</div>
                  <div className={`text-lg font-mono font-bold ${calcResult.clamped ? "text-red-700" : "text-green-700"}`}>{fmtRpm(calcResult.actualRpm)}</div>
                  <div className="text-xs text-gray-400 mt-1">max {calcResult.maxRpm.toLocaleString()} rpm</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">F — Feed {calcResult.clamped ? "(at machine rpm)" : ""}</div>
                  <div className="text-lg font-mono font-bold text-gray-800">{fmtFeed(calcResult.f)}</div>
                  <div className="text-xs text-gray-400 mt-1">mm/min</div>
                </div>
                <div className={`rounded p-3 ${calcResult.mrr != null ? "bg-gray-50" : "bg-gray-50 opacity-50"}`}>
                  <div className="text-xs text-gray-500 mb-1">MRR</div>
                  {calcResult.mrr != null
                    ? <><div className="text-lg font-mono font-bold text-gray-800">{fmtMrr(calcResult.mrr)}</div><div className="text-xs text-gray-400 mt-1">cm³/min</div></>
                    : <div className="text-sm text-gray-400 mt-1">enter ap + ae</div>
                  }
                </div>
              </div>
            ) : (
              <div className="py-3 text-sm text-gray-400 border-t">Enter D, Z, Vc and Fz to calculate.</div>
            )}
            <div className="text-xs text-gray-400 font-mono pt-1 border-t">
              S = (Vc × 1000) / (π × D)   |   F = Fz × Z × S_actual   |   MRR = (ae × ap × F) / 1000
            </div>
          </div>
        </div>
      )}

      {/* ══ Compare Setups tab ══ */}
      {tab === "compare" && (
        <div className="space-y-4">

          {/* Setup cards */}
          <div className={`grid gap-4 ${setups.length === 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
            {setups.map((s) => (
              <SetupCard
                key={s.id}
                setup={s}
                tools={tools}
                canRemove={setups.length > 2}
                onUpdate={(patch) => updateSetup(s.id, patch)}
                onRemove={() => removeSetup(s.id)}
                onDuplicate={() => duplicateSetup(s.id)}
                onReset={() => resetSetup(s.id)}
                presets={presets}
                onSavePreset={(name) => savePreset(name, s)}
                onDeletePreset={deletePreset}
              />
            ))}
          </div>

          {/* Comparison summary table */}
          {summaryRows.some((r) => r.result !== null) ? (
            <div className="border rounded-lg bg-white overflow-hidden">
              <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Comparison Summary</span>
                <span className="text-xs text-gray-400">★ = best MRR · ⚠ = speed limited &gt;30%</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Setup","Tool","Machine","S actual","Feed","MRR","Δ vs best"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["","","","rpm","mm/min","cm³/min",""].map((u, i) => (
                        <th key={i} className="px-3 pb-1 text-left text-gray-400 font-normal normal-case">{u}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryRows.map(({ setup, result, toolName }) => {
                      if (!result) {
                        return (
                          <tr key={setup.id}>
                            <td className="px-3 py-2 font-medium text-gray-700">{setup.name || "—"}</td>
                            <td colSpan={6} className="px-3 py-2 italic text-gray-400">incomplete — fill D, Z, Vc, Fz</td>
                          </tr>
                        );
                      }
                      const isBest    = bestMrr !== null && result.mrr !== null && result.mrr === bestMrr;
                      const clampPct  = getClampPct(result);
                      const heavyCl   = isHeavilyClamped(result);
                      const deltaPct  = bestMrr !== null && result.mrr !== null && !isBest && bestMrr > 0
                        ? ((result.mrr - bestMrr) / bestMrr) * 100
                        : null;

                      return (
                        <tr key={setup.id} className={isBest ? "bg-indigo-50" : "hover:bg-gray-50"}>
                          <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                            {setup.name || "—"}
                            {isBest && <span className="ml-1 text-indigo-600 font-bold">★</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{toolName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${MACHINE_COLORS[setup.machine]}`}>
                              {setup.machine}
                            </span>
                          </td>
                          <td className={`px-3 py-2 font-mono tabular-nums whitespace-nowrap ${result.clamped ? "text-red-600" : "text-green-700"}`}>
                            {fmtRpm(result.actualRpm)}
                            {heavyCl && <span className="ml-1 text-amber-600" title={`Clamped −${clampPct}%`}>⚠</span>}
                          </td>
                          <td className="px-3 py-2 font-mono tabular-nums">{fmtFeed(result.feed)}</td>
                          <td className={`px-3 py-2 font-mono tabular-nums font-semibold ${isBest ? "text-indigo-700" : ""}`}>
                            {result.mrr != null ? fmtMrr(result.mrr) : "—"}
                          </td>
                          <td className={`px-3 py-2 font-mono tabular-nums ${isBest ? "text-indigo-600 font-semibold" : deltaPct !== null ? "text-red-500" : "text-gray-400"}`}>
                            {isBest ? "best" : deltaPct !== null ? fmtPct(deltaPct) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400 font-mono">
                S = (Vc·1000)/(π·D)  ·  F = Fz·Z·S_actual  ·  MRR = (ae·ap·F)/1000
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-8 border rounded-lg bg-white">
              Fill in D, Z, Vc and Fz in at least one setup to see the summary.
            </div>
          )}

        </div>
      )}
    </div>
  );
}
