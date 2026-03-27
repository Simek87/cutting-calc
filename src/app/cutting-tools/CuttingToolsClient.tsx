"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Machine = "Danusys" | "Hurco" | "Both";
type Tab = "library" | "calculator" | "compare";

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

interface CompareSlot {
  toolId:  string;
  D:       string;
  R:       string;
  z:       string;
  machine: Machine;
  vc:      string;
  fz:      string;
  ap:      string;
  ae:      string;
}

// ── Machine limits ─────────────────────────────────────────────────────────

const MACHINE_MAX_RPM: Record<Machine, number> = {
  Danusys: 4250,
  Hurco:   14000,
  Both:    14000,
};

const MACHINES: Machine[] = ["Danusys", "Hurco", "Both"];

const MACHINE_COLORS: Record<Machine, string> = {
  Danusys: "bg-orange-100 text-orange-700 border-orange-300",
  Hurco:   "bg-blue-100 text-blue-700 border-blue-300",
  Both:    "bg-purple-100 text-purple-700 border-purple-300",
};

// ── Calculator formulas ────────────────────────────────────────────────────

function calcRpm(vc: number, D: number): number {
  return (vc * 1000) / (Math.PI * D);
}
function calcFeed(fz: number, z: number, rpm: number): number {
  return fz * z * rpm;
}
function calcMrr(ae: number, ap: number, feed: number): number {
  return (ae * ap * feed) / 1000;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, dec = 1) =>
  v != null ? v.toFixed(dec) : "—";

const numField = (v: string) => (v === "" ? null : Number(v));

// ── Compare slot helpers ───────────────────────────────────────────────────

function emptySlot(): CompareSlot {
  return { toolId: "", D: "", R: "", z: "", machine: "Hurco", vc: "", fz: "", ap: "", ae: "" };
}

function calcSlotResult(slot: CompareSlot) {
  const D  = Number(slot.D);
  const z  = Number(slot.z);
  const vc = Number(slot.vc);
  const fz = Number(slot.fz);
  const ap = Number(slot.ap);
  const ae = Number(slot.ae);
  if (!D || !z || !vc || !fz) return null;

  const maxRpm    = MACHINE_MAX_RPM[slot.machine];
  const idealRpm  = calcRpm(vc, D);
  const clamped   = idealRpm > maxRpm;
  const actualRpm = clamped ? maxRpm : idealRpm;
  const feed      = calcFeed(fz, z, actualRpm);
  const mrr       = ap && ae ? calcMrr(ae, ap, feed) : null;
  return { idealRpm, clamped, actualRpm, maxRpm, feed, mrr };
}

// ── Empty form state ───────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: "", machine: "Hurco" as Machine, toolType: "",
    diameter: "", cornerRadius: "", flutes: "",
    notes: "", vc: "", rpm: "", feed: "", fz: "", ap: "", ae: "", mrr: "",
  };
}

// ── Compare card component ─────────────────────────────────────────────────

function CompareCard({
  label,
  slot,
  tools,
  onChange,
}: {
  label: string;
  slot: CompareSlot;
  tools: CuttingTool[];
  onChange: (key: keyof CompareSlot, value: string) => void;
}) {
  const result = calcSlotResult(slot);

  const handleToolSelect = (id: string) => {
    onChange("toolId", id);
    if (!id) return;
    const t = tools.find((t) => t.id === id);
    if (!t) return;
    onChange("D",  String(t.diameter));
    onChange("R",  t.cornerRadius != null ? String(t.cornerRadius) : "");
    onChange("z",  String(t.flutes));
    if (t.vc   != null) onChange("vc",  String(t.vc));
    if (t.fz   != null) onChange("fz",  String(t.fz));
    if (t.ap   != null) onChange("ap",  String(t.ap));
    if (t.ae   != null) onChange("ae",  String(t.ae));
    if (t.machine !== "Both") onChange("machine", t.machine);
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden flex flex-col">
      {/* card header */}
      <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm font-bold text-white uppercase tracking-wider">{label}</span>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {/* Tool picker */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">From library (optional)</label>
          <select
            value={slot.toolId}
            onChange={(e) => handleToolSelect(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          >
            <option value="">— manual entry —</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Ø{t.diameter}, Z{t.flutes})
              </option>
            ))}
          </select>
        </div>

        {/* Geometry */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "D" as const, label: "D (mm)", ph: "50" },
            { k: "R" as const, label: "R (mm)", ph: "2" },
            { k: "z" as const, label: "Z (flutes)", ph: "3" },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
              <input
                type="number" step="any" min="0"
                value={slot[k]}
                onChange={(e) => onChange(k, e.target.value)}
                placeholder={ph}
                className="w-full border rounded px-2 py-1 text-sm font-mono"
              />
            </div>
          ))}
        </div>

        {/* Machine */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Machine</label>
          <select
            value={slot.machine}
            onChange={(e) => onChange("machine", e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="Danusys">Danusys (max {MACHINE_MAX_RPM.Danusys.toLocaleString()} rpm)</option>
            <option value="Hurco">Hurco (max {MACHINE_MAX_RPM.Hurco.toLocaleString()} rpm)</option>
          </select>
        </div>

        {/* Cutting params */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "vc" as const, label: "Vc (m/min)",     ph: "80" },
            { k: "fz" as const, label: "Fz (mm/tooth)",  ph: "0.05" },
            { k: "ap" as const, label: "ap (mm)",         ph: "5" },
            { k: "ae" as const, label: "ae (mm)",         ph: "2" },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
              <input
                type="number" step="any" min="0"
                value={slot[k]}
                onChange={(e) => onChange(k, e.target.value)}
                placeholder={ph}
                className="w-full border rounded px-2 py-1 text-sm font-mono"
              />
            </div>
          ))}
        </div>

        {/* Results */}
        {result ? (
          <div className="border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded p-2.5 ${result.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                <div className="text-xs text-gray-500">S ideal</div>
                <div className="text-base font-mono font-bold text-gray-800">
                  {Math.round(result.idealRpm).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">rpm</div>
              </div>
              <div className={`rounded p-2.5 ${result.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <div className="text-xs text-gray-500">S actual {result.clamped ? "(clamped)" : "(OK)"}</div>
                <div className={`text-base font-mono font-bold ${result.clamped ? "text-red-700" : "text-green-700"}`}>
                  {Math.round(result.actualRpm).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">rpm · max {result.maxRpm.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded p-2.5">
                <div className="text-xs text-gray-500">F (feed)</div>
                <div className="text-base font-mono font-bold text-gray-800">
                  {Math.round(result.feed).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">mm/min</div>
              </div>
              <div className={`rounded p-2.5 ${result.mrr != null ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50 opacity-50"}`}>
                <div className="text-xs text-gray-500">MRR</div>
                {result.mrr != null ? (
                  <>
                    <div className="text-base font-mono font-bold text-indigo-700">
                      {result.mrr.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">cm³/min</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-1">enter ap + ae</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t pt-3 text-xs text-gray-400">
            Enter D, Z, Vc and Fz to calculate.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CuttingToolsClient({ initialTools }: { initialTools: CuttingTool[] }) {
  const [tools, setTools]               = useState<CuttingTool[]>(initialTools);
  const [tab, setTab]                   = useState<Tab>("library");
  const [machineFilter, setMachineFilter] = useState<Machine | "All">("All");
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [form, setForm]                 = useState(emptyForm());

  // Calculator state
  const [calc, setCalc] = useState({
    D: "", z: "", vc: "", fz: "", ap: "", ae: "",
    machine: "Hurco" as Machine,
  });

  // Compare state
  const [slotA, setSlotA] = useState<CompareSlot>(emptySlot());
  const [slotB, setSlotB] = useState<CompareSlot>(emptySlot());

  const resultA = useMemo(() => calcSlotResult(slotA), [slotA]);
  const resultB = useMemo(() => calcSlotResult(slotB), [slotB]);

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

    const maxRpm    = MACHINE_MAX_RPM[calc.machine];
    const idealRpm  = calcRpm(vc, D);
    const clamped   = idealRpm > maxRpm;
    const actualRpm = clamped ? maxRpm : idealRpm;
    const f         = calcFeed(fz, z, actualRpm);
    const mrr       = ap && ae ? calcMrr(ae, ap, f) : null;
    return { idealRpm, clamped, actualRpm, maxRpm, f, mrr };
  }, [calc]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setC = (k: string, v: string) => setCalc((p) => ({ ...p, [k]: v }));

  const makeSlotSetter = (setter: React.Dispatch<React.SetStateAction<CompareSlot>>) =>
    (key: keyof CompareSlot, value: string) =>
      setter((prev) => ({ ...prev, [key]: value }));

  const setA = makeSlotSetter(setSlotA);
  const setB = makeSlotSetter(setSlotB);

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
      const res     = await fetch(`/api/cutting-tools/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setTools((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
    } else {
      const res     = await fetch("/api/cutting-tools", {
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
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cutting Tools</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tool library · Calculator · Compare</p>
        </div>
        {tab === "library" && (
          <button
            onClick={startAdd}
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
          >
            + Add Tool
          </button>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex items-center border-b">
        {(["library", "calculator", "compare"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "library" ? "Library" : t === "calculator" ? "Calculator" : "Compare"}
          </button>
        ))}
      </div>

      {/* ── Library tab ── */}
      {tab === "library" && (
        <div className="space-y-4">
          {/* Add / Edit form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="border rounded-lg bg-white p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">
                  {editingId ? "Edit Tool" : "New Tool"}
                </span>
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
                    { k: "vc",   label: "Vc (m/min)",   ph: "80" },
                    { k: "rpm",  label: "S (rpm)",       ph: "3200" },
                    { k: "feed", label: "F (mm/min)",    ph: "640" },
                    { k: "fz",   label: "Fz (mm/tooth)", ph: "0.05" },
                    { k: "ap",   label: "ap (mm)",       ph: "5" },
                    { k: "ae",   label: "ae (mm)",       ph: "2" },
                    { k: "mrr",  label: "MRR (cm³/min)", ph: "" },
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
        </div>
      )}

      {/* ── Calculator tab ── */}
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

            {calcResult ? (
              <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                <div className={`rounded p-3 ${calcResult.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-500 mb-1">S — Ideal rpm</div>
                  <div className="text-lg font-mono font-bold text-gray-800">
                    {Math.round(calcResult.idealRpm).toLocaleString()}
                  </div>
                  {calcResult.clamped && <div className="text-xs text-amber-700 mt-1">⚠ exceeds machine limit</div>}
                </div>
                <div className={`rounded p-3 ${calcResult.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                  <div className="text-xs text-gray-500 mb-1">S — Machine rpm {calcResult.clamped ? "(clamped)" : "(OK)"}</div>
                  <div className={`text-lg font-mono font-bold ${calcResult.clamped ? "text-red-700" : "text-green-700"}`}>
                    {Math.round(calcResult.actualRpm).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">max {calcResult.maxRpm.toLocaleString()} rpm</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">F — Feed {calcResult.clamped ? "(at machine rpm)" : ""}</div>
                  <div className="text-lg font-mono font-bold text-gray-800">
                    {Math.round(calcResult.f).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">mm/min</div>
                </div>
                <div className={`rounded p-3 ${calcResult.mrr != null ? "bg-gray-50" : "bg-gray-50 opacity-50"}`}>
                  <div className="text-xs text-gray-500 mb-1">MRR</div>
                  {calcResult.mrr != null ? (
                    <>
                      <div className="text-lg font-mono font-bold text-gray-800">{calcResult.mrr.toFixed(2)}</div>
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

            <div className="text-xs text-gray-400 font-mono space-y-0.5 pt-1 border-t">
              <div>S = (Vc × 1000) / (π × D)   |   F = Fz × Z × S_actual   |   MRR = (ae × ap × F) / 1000</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Compare tab ── */}
      {tab === "compare" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompareCard label="Tool A" slot={slotA} tools={tools} onChange={setA} />
            <CompareCard label="Tool B" slot={slotB} tools={tools} onChange={setB} />
          </div>

          {/* Comparison summary */}
          {(resultA || resultB) && (
            <div className="border rounded-lg bg-white overflow-hidden">
              <div className="bg-gray-100 border-b px-4 py-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Comparison Summary</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* MRR row */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Tool A — MRR</div>
                    <div className="text-xl font-mono font-bold text-gray-800">
                      {resultA?.mrr != null ? resultA.mrr.toFixed(2) : "—"}
                    </div>
                    <div className="text-xs text-gray-400">cm³/min</div>
                  </div>
                  <div className="text-center border-x">
                    <div className="text-xs text-gray-500 mb-1">Difference</div>
                    {resultA?.mrr != null && resultB?.mrr != null ? (() => {
                      const diff = resultA.mrr - resultB.mrr;
                      const pct  = resultB.mrr > 0 ? (diff / resultB.mrr) * 100 : 0;
                      const winner = diff > 0 ? "A" : diff < 0 ? "B" : null;
                      return (
                        <>
                          <div className={`text-xl font-mono font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-600"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {pct !== 0 ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : "equal"}
                          </div>
                          {winner && (
                            <div className={`mt-1 text-xs font-semibold ${winner === "A" ? "text-green-600" : "text-red-500"}`}>
                              Tool {winner} removes more
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <div className="text-gray-400 text-sm mt-1">—</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Tool B — MRR</div>
                    <div className="text-xl font-mono font-bold text-gray-800">
                      {resultB?.mrr != null ? resultB.mrr.toFixed(2) : "—"}
                    </div>
                    <div className="text-xs text-gray-400">cm³/min</div>
                  </div>
                </div>

                {/* Feed diff */}
                {resultA && resultB && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Tool A — Feed</div>
                      <div className="font-mono font-semibold text-gray-700">{Math.round(resultA.feed).toLocaleString()} <span className="text-xs text-gray-400">mm/min</span></div>
                    </div>
                    <div className="border-x">
                      <div className="text-xs text-gray-500 mb-0.5">Feed diff</div>
                      <div className={`font-mono font-semibold ${resultA.feed - resultB.feed > 0 ? "text-green-600" : "text-red-500"}`}>
                        {resultA.feed - resultB.feed > 0 ? "+" : ""}{Math.round(resultA.feed - resultB.feed).toLocaleString()} <span className="text-xs">mm/min</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Tool B — Feed</div>
                      <div className="font-mono font-semibold text-gray-700">{Math.round(resultB.feed).toLocaleString()} <span className="text-xs text-gray-400">mm/min</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!resultA && !resultB && (
            <div className="text-sm text-gray-400 text-center py-4">
              Fill in D, Z, Vc and Fz for at least one tool to see results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
