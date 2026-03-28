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
  calcVc,
  calcFeed,
  calcFz as calcFzFromF,
  calcMrr,
  fmtRpm,
  fmtVc,
  fmtFeed,
  fmtFz,
  fmtMrr,
  fmtPct,
} from "./calc";
import { SetupCard } from "./SetupCard";
import { usePresets } from "./usePresets";
import { MrrComparator } from "./MrrComparator";

// ── Local types (library/UI only) ──────────────────────────────────────────

type Machine = "Danusys" | "Hurco" | "Both";
type Tab     = "library" | "calculator" | "compare" | "comparator" | "reference";

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
  const [calcFormError, setCalcFormError] = useState<string | null>(null);
  const [calcFormClamped, setCalcFormClamped] = useState(false);
  const nextId                            = useRef(3);

  // Standalone calculator state
  const [calc, setCalc] = useState<{
    D: string; z: string; machine: "Danusys" | "Hurco";
    speedMode: "vc" | "s"; vc: string; s: string;
    feedMode:  "fz" | "f"; fz: string; f: string;
    ap: string; ae: string;
  }>({
    D: "", z: "", machine: "Hurco",
    speedMode: "vc", vc: "", s: "",
    feedMode:  "fz", fz: "", f: "",
    ap: "", ae: "",
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

  // ── Standalone calculator result (bidirectional) ──────────────────────────

  const calcResult = useMemo(() => {
    const D = Number(calc.D);
    const z = Number(calc.z);
    if (D <= 0 || z <= 0) return null;

    const maxRpm = MACHINE_MAX_RPM[calc.machine];

    // ── Speed: Vc→S or S→Vc ────────────────────────────────────────────────
    let idealRpm: number;
    let vc: number;

    if (calc.speedMode === "vc") {
      const vcIn = Number(calc.vc);
      if (!vcIn) return null;
      vc       = vcIn;
      idealRpm = calcRpm(vcIn, D);           // S = (Vc×1000)/(π×D)
    } else {
      const sIn = Number(calc.s);
      if (!sIn) return null;
      idealRpm = sIn;
      vc       = calcVc(sIn, D);             // Vc = (S×π×D)/1000
    }

    const clamped   = idealRpm > maxRpm;
    const actualRpm = clamped ? maxRpm : idealRpm;

    // ── Feed: Fz→F or F→Fz ─────────────────────────────────────────────────
    let feed: number;
    let fz: number;

    if (calc.feedMode === "fz") {
      const fzIn = Number(calc.fz);
      if (!fzIn) return null;
      fz   = fzIn;
      feed = calcFeed(fzIn, z, actualRpm);   // F = Fz×Z×S_actual
    } else {
      const fIn = Number(calc.f);
      if (!fIn || actualRpm === 0) return null;
      feed = fIn;
      fz   = calcFzFromF(fIn, z, actualRpm); // Fz = F/(Z×S_actual)
    }

    const ap  = Number(calc.ap);
    const ae  = Number(calc.ae);
    const mrr = ap > 0 && ae > 0 ? calcMrr(ae, ap, feed) : null;

    return { idealRpm, clamped, actualRpm, maxRpm, vc, feed, fz, mrr };
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

  const handleCalcRpmFeed = () => {
    const D  = Number(form.diameter);
    const z  = Number(form.flutes);
    const vc = Number(form.vc);
    const fz = Number(form.fz);
    if (!D || !z || !vc || !fz) {
      setCalcFormError("Fill in D, Vc, Fz and Z to calculate");
      setCalcFormClamped(false);
      return;
    }
    setCalcFormError(null);
    const machineMax = form.machine === "Both" ? MACHINE_MAX_RPM.Hurco : MACHINE_MAX_RPM[form.machine as "Danusys" | "Hurco"];
    const idealRpm   = calcRpm(vc, D);
    const clamped    = idealRpm > machineMax;
    const actualRpm  = clamped ? machineMax : idealRpm;
    const feed       = calcFeed(fz, z, actualRpm);
    setCalcFormClamped(clamped);
    setForm((p) => ({ ...p, rpm: String(Math.round(actualRpm)), feed: String(Math.round(feed)) }));
  };

  const startAdd = () => { setForm(emptyForm()); setEditingId(null); setShowForm(true); setCalcFormError(null); setCalcFormClamped(false); };

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
    setCalcFormError(null);
    setCalcFormClamped(false);
  };

  const loadIntoCalc = (t: CuttingTool) => {
    const hasVc   = t.vc   != null;
    const hasFz   = t.fz   != null;
    setCalc({
      D:         String(t.diameter),
      z:         String(t.flutes),
      machine:   t.machine === "Both" ? "Hurco" : t.machine,
      speedMode: hasVc              ? "vc" : t.rpm  != null ? "s"  : "vc",
      vc:        hasVc              ? String(t.vc)  : "",
      s:         !hasVc && t.rpm != null ? String(t.rpm) : "",
      feedMode:  hasFz              ? "fz" : t.feed != null ? "f"  : "fz",
      fz:        hasFz              ? String(t.fz)  : "",
      f:         !hasFz && t.feed != null ? String(t.feed) : "",
      ap:        t.ap != null ? String(t.ap) : "",
      ae:        t.ae != null ? String(t.ae) : "",
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
          <h1 className="text-xl font-semibold text-gray-900">Milling Calc</h1>
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
      <div className="flex items-center border-b overflow-x-auto">
        {(["library", "calculator", "compare", "comparator", "reference"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "library"     ? "Library"
           : t === "calculator"  ? "Calculator"
           : t === "compare"     ? "Compare Setups"
           : t === "comparator"  ? "MRR Comparator"
           :                       "Reference"}
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
                {/* Row 1 — inputs: Vc, Fz, ap, ae */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { k: "vc", label: "Vc (m/min)",    ph: "80"   },
                    { k: "fz", label: "Fz (mm/tooth)", ph: "0.05" },
                    { k: "ap", label: "ap (mm)",        ph: "5"    },
                    { k: "ae", label: "ae (mm)",        ph: "2"    },
                  ].map(({ k, label, ph }) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                      <input type="number" step="any" min="0" value={(form as Record<string, string>)[k]} onChange={(e) => setF(k, e.target.value)} className="w-full border rounded px-2 py-1 text-xs" placeholder={ph} />
                    </div>
                  ))}
                </div>
                {/* Calculate button row */}
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={handleCalcRpmFeed}
                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 font-medium"
                  >⟳ Calculate S &amp; F</button>
                  {calcFormError && <span className="text-xs text-red-600">{calcFormError}</span>}
                  {calcFormClamped && !calcFormError && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">⚠ S clamped to machine max</span>
                  )}
                </div>
                {/* Row 2 — computed / manual: S, F, MRR */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "rpm",  label: "S (rpm)",       ph: "3200" },
                    { k: "feed", label: "F (mm/min)",    ph: "640"  },
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
            <span className="text-xs text-gray-400 ml-2 font-normal">bidirectional · rpm · feed · MRR</span>
          </div>
          <div className="p-4 space-y-4">

            {/* ── Geometry + Machine ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Machine</label>
                <select
                  value={calc.machine}
                  onChange={(e) => setCalc((p) => ({ ...p, machine: e.target.value as "Danusys" | "Hurco" }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="Danusys">Danusys — max {MACHINE_MAX_RPM.Danusys.toLocaleString()} rpm</option>
                  <option value="Hurco">Hurco — max {MACHINE_MAX_RPM.Hurco.toLocaleString()} rpm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" title="Tool diameter">D (mm)</label>
                <input type="number" step="any" min="0" value={calc.D} onChange={(e) => setC("D", e.target.value)} placeholder="50" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" title="Number of flutes">Z (flutes)</label>
                <input type="number" step="1" min="1" value={calc.z} onChange={(e) => setC("z", e.target.value)} placeholder="3" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
              </div>
            </div>

            {/* ── Speed section ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Speed</span>
                <div className="flex rounded border overflow-hidden text-xs">
                  <button
                    onClick={() => setCalc((p) => ({ ...p, speedMode: "vc" }))}
                    className={`px-3 py-0.5 ${calc.speedMode === "vc" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >Vc → S</button>
                  <button
                    onClick={() => setCalc((p) => ({ ...p, speedMode: "s" }))}
                    className={`px-3 py-0.5 border-l ${calc.speedMode === "s" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >S → Vc</button>
                </div>
              </div>
              {calc.speedMode === "vc" ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vc — cutting speed (m/min)</label>
                  <input type="number" step="any" min="0" value={calc.vc} onChange={(e) => setC("vc", e.target.value)} placeholder="80" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">S — spindle speed (rpm)</label>
                  <input type="number" step="any" min="0" value={calc.s} onChange={(e) => setC("s", e.target.value)} placeholder="500" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              )}
            </div>

            {/* ── Feed section ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Feed</span>
                <div className="flex rounded border overflow-hidden text-xs">
                  <button
                    onClick={() => setCalc((p) => ({ ...p, feedMode: "fz" }))}
                    className={`px-3 py-0.5 ${calc.feedMode === "fz" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >Fz → F</button>
                  <button
                    onClick={() => setCalc((p) => ({ ...p, feedMode: "f" }))}
                    className={`px-3 py-0.5 border-l ${calc.feedMode === "f" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >F → Fz</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {calc.feedMode === "fz" ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fz — feed per tooth (mm/tooth)</label>
                    <input type="number" step="any" min="0" value={calc.fz} onChange={(e) => setC("fz", e.target.value)} placeholder="0.05" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">F — feed rate (mm/min)</label>
                    <input type="number" step="any" min="0" value={calc.f} onChange={(e) => setC("f", e.target.value)} placeholder="150" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ap — axial depth (mm)</label>
                  <input type="number" step="any" min="0" value={calc.ap} onChange={(e) => setC("ap", e.target.value)} placeholder="3" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ae — radial depth (mm)</label>
                  <input type="number" step="any" min="0" value={calc.ae} onChange={(e) => setC("ae", e.target.value)} placeholder="40" className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              </div>
            </div>

            {/* ── Results ── */}
            {calcResult ? (
              <div className="border-t pt-3 space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  {/* S ideal */}
                  <div className={`rounded p-3 ${calcResult.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                    <div className="text-xs text-gray-500 mb-1">S — theoretical</div>
                    <div className="text-lg font-mono font-bold text-gray-800">{fmtRpm(calcResult.idealRpm)}</div>
                    <div className="text-xs text-gray-400">rpm</div>
                    {calcResult.clamped && <div className="text-xs text-amber-700 mt-1">⚠ exceeds machine max</div>}
                  </div>
                  {/* S actual */}
                  <div className={`rounded p-3 ${calcResult.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                    <div className="text-xs text-gray-500 mb-1">S — actual {calcResult.clamped ? "(clamped)" : "(OK)"}</div>
                    <div className={`text-lg font-mono font-bold ${calcResult.clamped ? "text-red-700" : "text-green-700"}`}>{fmtRpm(calcResult.actualRpm)}</div>
                    <div className="text-xs text-gray-400">rpm · max {calcResult.maxRpm.toLocaleString()}</div>
                  </div>
                  {/* Vc — shown as computed when in S mode, or confirmed when in Vc mode */}
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Vc {calc.speedMode === "s" ? "(computed)" : ""}</div>
                    <div className="text-lg font-mono font-bold text-gray-800">{fmtVc(calcResult.vc)}</div>
                    <div className="text-xs text-gray-400">m/min</div>
                  </div>
                  {/* F */}
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">F {calc.feedMode === "fz" ? "(computed)" : ""}{calcResult.clamped ? " — at clamped rpm" : ""}</div>
                    <div className="text-lg font-mono font-bold text-gray-800">{fmtFeed(calcResult.feed)}</div>
                    <div className="text-xs text-gray-400">mm/min</div>
                  </div>
                  {/* Fz — shown as computed when in F mode */}
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Fz {calc.feedMode === "f" ? "(computed)" : ""}</div>
                    <div className="text-lg font-mono font-bold text-gray-800">{fmtFz(calcResult.fz)}</div>
                    <div className="text-xs text-gray-400">mm/tooth</div>
                  </div>
                  {/* MRR */}
                  <div className={`rounded p-3 ${calcResult.mrr != null ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50 opacity-60"}`}>
                    <div className="text-xs text-gray-500 mb-1">MRR</div>
                    {calcResult.mrr != null ? (
                      <>
                        <div className="text-lg font-mono font-bold text-indigo-700">{fmtMrr(calcResult.mrr)}</div>
                        <div className="text-xs text-gray-400">cm³/min</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400 mt-1">enter ap + ae</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-3 text-sm text-gray-400 border-t">
                {calc.speedMode === "vc" ? "Enter D, Z, Vc" : "Enter D, Z, S"}{" "}
                {calc.feedMode === "fz" ? "and Fz" : "and F"} to calculate.
              </div>
            )}

            <div className="text-xs text-gray-400 font-mono pt-1 border-t">
              S=(Vc·1000)/(π·D)  ·  Vc=(S·π·D)/1000  ·  F=Fz·Z·S  ·  Fz=F/(Z·S)  ·  MRR=(ae·ap·F)/1000
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
      {/* ══ MRR Comparator tab ══ */}
      {tab === "comparator" && (
        <MrrComparator tools={tools} />
      )}

      {/* ══ Reference tab ══ */}
      {tab === "reference" && (
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="bg-gray-900 px-4 py-2.5">
            <span className="text-sm font-bold text-white uppercase tracking-wider">Reference</span>
            <span className="text-xs text-gray-400 ml-2 font-normal">Aluminium (6061 / 7075) — Recommended cutting parameters</span>
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
                {[
                  {
                    type: "Face Mill",
                    vc:   "400 – 800",
                    fz:   "0.05 – 0.20",
                    notes: "Use high Vc with sharp inserts; avoid built-up edge",
                  },
                  {
                    type: "End Mill (flat)",
                    vc:   "200 – 500",
                    fz:   "0.02 – 0.10",
                    notes: "Reduce ae for slotting; 3–4 flutes recommended",
                  },
                  {
                    type: "Ball Nose Mill",
                    vc:   "150 – 400",
                    fz:   "0.01 – 0.05",
                    notes: "Vc at ball centre is 0 — use effective diameter",
                  },
                  {
                    type: "Drill",
                    vc:   "60 – 150",
                    fz:   "0.05 – 0.15 / rev",
                    notes: "Peck drill for chip evacuation; through-coolant preferred",
                  },
                  {
                    type: "Reamer",
                    vc:   "30 – 80",
                    fz:   "0.05 – 0.20 / rev",
                    notes: "0.1–0.3 mm stock for finishing; flood coolant",
                  },
                ].map((row) => (
                  <tr key={row.type} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{row.type}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-gray-700">{row.vc}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-gray-700">{row.fz}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400 italic">
            Values are starting points. Adjust for coating, coolant strategy, and rigidity.
          </div>
        </div>
      )}

    </div>
  );
}
