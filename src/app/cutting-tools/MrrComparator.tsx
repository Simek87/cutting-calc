"use client";

import { useState, useMemo, useRef } from "react";
import {
  type CuttingTool,
  type ComparatorSlot,
  type ComparatorResult,
  type CalcMachine,
  MACHINE_MAX_RPM,
  calcComparatorResult,
  fmtRpm,
  fmtVc,
  fmtFeed,
  fmtFz,
  fmtMrr,
  fmtPct,
} from "./calc";
import { useComparisons } from "./useComparisons";

// ── helpers ───────────────────────────────────────────────────────────────

function emptySlot(name: string, id: string): ComparatorSlot {
  return {
    id, name, toolId: "",
    D: "", z: "", machine: "Hurco",
    speedMode: "vc", vc: "", s: "",
    fz: "", ap: "", ae: "",
  };
}

// ── SlotCard (internal) ───────────────────────────────────────────────────

function SlotCard({
  slot,
  result,
  isBest,
  delta,
  canRemove,
  tools,
  onUpdate,
  onRemove,
  onLoadTool,
}: {
  slot:       ComparatorSlot;
  result:     ComparatorResult | null;
  isBest:     boolean;
  delta:      number | null;
  canRemove:  boolean;
  tools:      CuttingTool[];
  onUpdate:   (patch: Partial<ComparatorSlot>) => void;
  onRemove:   () => void;
  onLoadTool: (toolId: string) => void;
}) {
  const inp = "w-full border rounded px-2 py-1 text-xs font-mono";
  const lbl = "block text-xs text-gray-500 mb-0.5";
  const tog = (active: boolean, right = false) =>
    `px-2.5 py-0.5 text-xs ${right ? "border-l" : ""} ${
      active ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
    }`;

  return (
    <div className={`border rounded-lg bg-white overflow-hidden flex flex-col ${
      isBest ? "border-green-400 ring-1 ring-green-300" : ""
    }`}>

      {/* Header */}
      <div className="bg-gray-900 px-3 py-2 flex items-center gap-1.5">
        <input
          value={slot.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-white text-sm font-semibold placeholder-gray-500 outline-none min-w-0"
          placeholder="Slot name…"
        />
        {isBest && <span className="text-green-400 text-xs font-bold shrink-0">★ BEST</span>}
        {canRemove && (
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400 text-xs px-1 shrink-0" title="Remove slot">✕</button>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 flex-1">

        {/* Library picker */}
        <select
          value={slot.toolId}
          onChange={(e) => onLoadTool(e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-xs"
        >
          <option value="">— load from library —</option>
          {tools.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (Ø{t.diameter}{t.cornerRadius != null ? ` R${t.cornerRadius}` : ""}, Z{t.flutes})
            </option>
          ))}
        </select>

        {/* Machine */}
        <div>
          <label className={lbl}>Machine</label>
          <select
            value={slot.machine}
            onChange={(e) => onUpdate({ machine: e.target.value as CalcMachine })}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="Danusys">Danusys — max {MACHINE_MAX_RPM.Danusys.toLocaleString()} rpm</option>
            <option value="Hurco">Hurco — max {MACHINE_MAX_RPM.Hurco.toLocaleString()} rpm</option>
          </select>
        </div>

        {/* Geometry */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>D (mm)</label>
            <input type="number" step="any" min="0" value={slot.D}
              onChange={(e) => onUpdate({ D: e.target.value })} placeholder="50" className={inp} />
          </div>
          <div>
            <label className={lbl}>Z (flutes)</label>
            <input type="number" step="1" min="1" value={slot.z}
              onChange={(e) => onUpdate({ z: e.target.value })} placeholder="3" className={inp} />
          </div>
        </div>

        {/* Speed */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Speed</span>
            <div className="flex rounded border overflow-hidden">
              <button onClick={() => onUpdate({ speedMode: "vc" })} className={tog(slot.speedMode === "vc")}>Vc → S</button>
              <button onClick={() => onUpdate({ speedMode: "s"  })} className={tog(slot.speedMode === "s", true)}>S → Vc</button>
            </div>
          </div>
          {slot.speedMode === "vc" ? (
            <div>
              <label className={lbl}>Vc (m/min)</label>
              <input type="number" step="any" min="0" value={slot.vc}
                onChange={(e) => onUpdate({ vc: e.target.value })} placeholder="80" className={inp} />
            </div>
          ) : (
            <div>
              <label className={lbl}>S (rpm)</label>
              <input type="number" step="any" min="0" value={slot.s}
                onChange={(e) => onUpdate({ s: e.target.value })} placeholder="500" className={inp} />
            </div>
          )}
        </div>

        {/* Feed + depths */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Fz (mm/tooth)</label>
            <input type="number" step="any" min="0" value={slot.fz}
              onChange={(e) => onUpdate({ fz: e.target.value })} placeholder="0.05" className={inp} />
          </div>
          <div>
            <label className={lbl}>ap (mm)</label>
            <input type="number" step="any" min="0" value={slot.ap}
              onChange={(e) => onUpdate({ ap: e.target.value })} placeholder="3" className={inp} />
          </div>
          <div>
            <label className={lbl}>ae (mm)</label>
            <input type="number" step="any" min="0" value={slot.ae}
              onChange={(e) => onUpdate({ ae: e.target.value })} placeholder="25" className={inp} />
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div className={`rounded border p-2 text-xs space-y-1.5 ${
            isBest ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
          }`}>
            {result.clamped && (
              <div className="text-amber-700 flex items-center gap-1">
                <span title="RPM clamped to machine limit">⚠</span>
                <span>S clamped to {result.maxRpm.toLocaleString()} rpm</span>
              </div>
            )}
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
              <span className="text-gray-500">S actual</span>
              <span className={result.clamped ? "text-red-600 font-bold" : "text-green-700 font-bold"}>
                {fmtRpm(result.actualRpm)} rpm
              </span>
              <span className="text-gray-500">S ideal</span>
              <span className="text-gray-600">{fmtRpm(result.idealRpm)} rpm</span>
              <span className="text-gray-500">Vc</span>
              <span>{fmtVc(result.vc)} m/min</span>
              <span className="text-gray-500">F</span>
              <span>{fmtFeed(result.feed)} mm/min</span>
              <span className="text-gray-500">Fz</span>
              <span>{fmtFz(result.fz)} mm/tooth</span>
              <span className="text-gray-500">MRR</span>
              <span className={isBest ? "text-green-700 font-bold" : ""}>
                {result.mrr != null ? `${fmtMrr(result.mrr)} cm³/min` : "— enter ap + ae"}
              </span>
              {!isBest && delta !== null && (
                <>
                  <span className="text-gray-500">Δ vs best</span>
                  <span className="text-red-500 font-bold">{fmtPct(delta)}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic py-1">Fill D, Z, speed and Fz to calculate.</div>
        )}

      </div>
    </div>
  );
}

// ── MrrComparator ─────────────────────────────────────────────────────────

export function MrrComparator({ tools }: { tools: CuttingTool[] }) {
  const nextId = useRef(3);

  const [slots, setSlots] = useState<ComparatorSlot[]>([
    emptySlot("Slot 1", "c1"),
    emptySlot("Slot 2", "c2"),
  ]);

  const { comparisons, saveComparison, deleteComparison } = useComparisons();
  const [saveOpen,     setSaveOpen]     = useState(false);
  const [saveName,     setSaveName]     = useState("");
  const [selectedCmp,  setSelectedCmp]  = useState("");

  // ── slot CRUD ────────────────────────────────────────────────────────────

  const updateSlot = (id: string, patch: Partial<ComparatorSlot>) =>
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));

  const removeSlot = (id: string) =>
    setSlots((prev) => prev.filter((s) => s.id !== id));

  const addSlot = () => {
    if (slots.length >= 3) return;
    const id   = `c${nextId.current++}`;
    const name = `Slot ${slots.length + 1}`;
    setSlots((prev) => [...prev, emptySlot(name, id)]);
  };

  const loadLibraryTool = (slotId: string, toolId: string) => {
    if (!toolId) { updateSlot(slotId, { toolId: "" }); return; }
    const t = tools.find((x) => x.id === toolId);
    if (!t) return;
    updateSlot(slotId, {
      toolId,
      name:      t.name,
      D:         String(t.diameter),
      z:         String(t.flutes),
      machine:   t.machine === "Both" ? "Hurco" : t.machine,
      speedMode: t.vc != null ? "vc" : "s",
      vc:        t.vc  != null               ? String(t.vc)  : "",
      s:         t.vc == null && t.rpm != null ? String(t.rpm) : "",
      fz:        t.fz  != null ? String(t.fz)  : "",
      ap:        t.ap  != null ? String(t.ap)  : "",
      ae:        t.ae  != null ? String(t.ae)  : "",
    });
  };

  // ── save / load comparisons ──────────────────────────────────────────────

  const handleSave = () => {
    saveComparison(saveName, slots);
    setSaveName("");
    setSaveOpen(false);
  };

  const handleLoadComparison = (id: string) => {
    const cmp = comparisons.find((c) => c.id === id);
    if (!cmp) return;
    setSlots(cmp.slots);
    setSelectedCmp(id);
  };

  // ── computed results ─────────────────────────────────────────────────────

  const results = useMemo(() => slots.map(calcComparatorResult), [slots]);

  const validMrrs = results
    .map((r) => r?.mrr ?? null)
    .filter((v): v is number => v !== null);
  const maxMrr = validMrrs.length > 0 ? Math.max(...validMrrs) : null;

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Toolbar: saved comparisons + save ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {!saveOpen && comparisons.length > 0 && (
          <>
            <select
              value={selectedCmp}
              onChange={(e) => {
                setSelectedCmp(e.target.value);
                if (e.target.value) handleLoadComparison(e.target.value);
              }}
              className="border rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="">— load saved —</option>
              {comparisons.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCmp && (
              <button
                onClick={() => { deleteComparison(selectedCmp); setSelectedCmp(""); }}
                className="text-gray-400 hover:text-red-500 text-xs"
                title="Delete this saved comparison"
              >✕</button>
            )}
            <div className="w-px h-5 bg-gray-200 shrink-0" />
          </>
        )}

        {saveOpen ? (
          <>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setSaveOpen(false); }}
              placeholder="Comparison name…"
              className="border rounded px-2 py-1.5 text-sm flex-1 min-w-40"
            />
            <button onClick={handleSave} className="text-sm text-green-700 hover:text-green-900 font-bold">✓ Save</button>
            <button onClick={() => setSaveOpen(false)} className="text-sm text-gray-400 hover:text-gray-700">✕</button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setSaveName(""); setSaveOpen(true); }}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:border-gray-500"
            >💾 Save comparison</button>
            {slots.length < 3 && (
              <button
                onClick={addSlot}
                className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:border-gray-500"
              >+ Add slot</button>
            )}
          </>
        )}
      </div>

      {/* ── Slot cards ── */}
      <div className={`grid gap-4 ${slots.length === 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
        {slots.map((slot, i) => {
          const result = results[i] ?? null;
          const isBest = result?.mrr != null && maxMrr !== null && result.mrr === maxMrr;
          const delta  =
            result?.mrr != null && maxMrr !== null && !isBest && maxMrr > 0
              ? ((result.mrr - maxMrr) / maxMrr) * 100
              : null;
          return (
            <SlotCard
              key={slot.id}
              slot={slot}
              result={result}
              isBest={isBest}
              delta={delta}
              canRemove={slots.length > 2}
              tools={tools}
              onUpdate={(patch) => updateSlot(slot.id, patch)}
              onRemove={() => removeSlot(slot.id)}
              onLoadTool={(toolId) => loadLibraryTool(slot.id, toolId)}
            />
          );
        })}
      </div>

      {/* ── Bar chart ── */}
      {maxMrr !== null && (
        <div className="border rounded-lg bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            MRR Comparison
          </div>
          <div className="space-y-3">
            {slots.map((slot, i) => {
              const r    = results[i];
              const mrr  = r?.mrr ?? 0;
              const pct  = maxMrr > 0 ? (mrr / maxMrr) * 100 : 0;
              const best = mrr > 0 && mrr === maxMrr;
              const label = slot.name || `Slot ${i + 1}`;
              return (
                <div key={slot.id} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-600 truncate text-right shrink-0">{label}</div>
                  <div className="flex-1 bg-gray-100 rounded h-7 overflow-hidden">
                    {mrr > 0 && (
                      <div
                        className={`h-full rounded flex items-center justify-end pr-2 transition-all duration-300 ${
                          best ? "bg-green-500" : "bg-indigo-400"
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      >
                        {pct > 28 && (
                          <span className="text-xs font-mono text-white">{fmtMrr(mrr)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-24 text-xs font-mono text-gray-600 shrink-0">
                    {mrr > 0 ? `${fmtMrr(mrr)} cm³/min` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
