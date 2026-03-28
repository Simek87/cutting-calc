"use client";

import { useState } from "react";
import {
  type Setup,
  type CuttingTool,
  type Preset,
  MACHINE_MAX_RPM,
  calcSetupResult,
  getClampPct,
  isHeavilyClamped,
  fmtRpm,
  fmtFeed,
  fmtMrr,
} from "./calc";

interface SetupCardProps {
  setup:          Setup;
  tools:          CuttingTool[];
  canRemove:      boolean;
  onUpdate:       (patch: Partial<Setup>) => void;
  onRemove:       () => void;
  onDuplicate:    () => void;
  onReset:        () => void;
  presets:        Preset[];
  onSavePreset:   (name: string) => void;
  onDeletePreset: (id: string) => void;
}

export function SetupCard({
  setup,
  tools,
  canRemove,
  onUpdate,
  onRemove,
  onDuplicate,
  onReset,
  presets,
  onSavePreset,
  onDeletePreset,
}: SetupCardProps) {
  const result       = calcSetupResult(setup);
  const clampPct     = result ? getClampPct(result) : 0;
  const heavyClamped = result ? isHeavilyClamped(result) : false;

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const handleLoadPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    onUpdate({ toolId: p.toolId, D: p.D, R: p.R, z: p.z, machine: p.machine, vc: p.vc, fz: p.fz, ap: p.ap, ae: p.ae });
  };

  const handleSave = () => {
    if (!saveName.trim() && !setup.name) return;
    onSavePreset(saveName.trim() || setup.name);
    setSaveName("");
    setSaveOpen(false);
  };

  const handleToolSelect = (toolId: string) => {
    if (!toolId) { onUpdate({ toolId: "" }); return; }
    const t = tools.find((t) => t.id === toolId);
    if (!t) return;
    onUpdate({
      toolId,
      D: String(t.diameter),
      R: t.cornerRadius != null ? String(t.cornerRadius) : "",
      z: String(t.flutes),
      ...(t.vc   != null && { vc: String(t.vc) }),
      ...(t.fz   != null && { fz: String(t.fz) }),
      ...(t.ap   != null && { ap: String(t.ap) }),
      ...(t.ae   != null && { ae: String(t.ae) }),
      ...(t.machine !== "Both" && { machine: t.machine }),
    });
  };

  const inp = "w-full border rounded px-2 py-1 text-sm font-mono";
  const lbl = "block text-xs text-gray-500 mb-0.5";
  const sec = "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="border rounded-lg bg-white overflow-hidden flex flex-col">

      {/* Header: editable name + actions */}
      <div className="bg-gray-900 px-3 py-2 flex items-center gap-1.5">
        <input
          value={setup.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-white text-sm font-semibold placeholder-gray-500 outline-none min-w-0"
          placeholder="Setup name…"
        />
        <button onClick={onDuplicate} className="text-gray-500 hover:text-gray-200 text-xs px-1 shrink-0" title="Duplicate setup">⧉</button>
        <button onClick={onReset}     className="text-gray-500 hover:text-gray-200 text-xs px-1 shrink-0" title="Reset setup">↺</button>
        {canRemove && (
          <button onClick={onRemove}  className="text-gray-500 hover:text-red-400  text-xs px-1 shrink-0" title="Remove setup">✕</button>
        )}
      </div>

      {/* Preset strip — pill buttons: click name to load, × to delete (no auto-load) */}
      <div className="border-b bg-gray-50 px-3 py-1.5 space-y-1.5">
        {saveOpen ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setSaveOpen(false); }}
              placeholder={setup.name || "Preset name…"}
              className="flex-1 border rounded px-2 py-0.5 text-xs min-w-0"
            />
            <button onClick={handleSave} className="text-xs text-green-700 hover:text-green-900 font-bold shrink-0" title="Confirm save">✓</button>
            <button onClick={() => setSaveOpen(false)} className="text-xs text-gray-400 hover:text-gray-700 shrink-0" title="Cancel">✕</button>
          </div>
        ) : (
          <>
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                    <button
                      onClick={() => handleLoadPreset(p.id)}
                      className="text-xs text-gray-700 hover:text-indigo-700 leading-none"
                      title={`Load "${p.name}"`}
                    >{p.name}</button>
                    <button
                      onClick={() => onDeletePreset(p.id)}
                      className="text-gray-300 hover:text-red-500 text-xs leading-none ml-0.5"
                      title={`Delete "${p.name}"`}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => { setSaveName(setup.name); setSaveOpen(true); }}
                className="text-xs text-gray-500 hover:text-gray-800"
                title="Save current setup as preset"
              >💾 save</button>
            </div>
          </>
        )}
      </div>

      <div className="p-3 space-y-3 flex-1">

        {/* ── TOOL ── */}
        <div>
          <div className={sec}>Tool</div>
          <select
            value={setup.toolId}
            onChange={(e) => handleToolSelect(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm mb-2"
          >
            <option value="">— manual entry —</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Ø{t.diameter}{t.cornerRadius != null ? ` R${t.cornerRadius}` : ""}, Z{t.flutes})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            {([
              { k: "D" as const, label: "D (mm)",     ph: "50" },
              { k: "R" as const, label: "R (mm)",     ph: "0"  },
              { k: "z" as const, label: "Z (flutes)", ph: "3"  },
            ] as const).map(({ k, label, ph }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="number" step="any" min="0" value={setup[k]}
                  onChange={(e) => onUpdate({ [k]: e.target.value })}
                  placeholder={ph} className={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* ── CUTTING INPUTS ── */}
        <div>
          <div className={sec}>Cutting inputs</div>
          <div className="mb-2">
            <label className={lbl}>Machine</label>
            <select value={setup.machine}
              onChange={(e) => onUpdate({ machine: e.target.value as "Danusys" | "Hurco" })}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="Danusys">Danusys — max {MACHINE_MAX_RPM.Danusys.toLocaleString()} rpm</option>
              <option value="Hurco">Hurco — max {MACHINE_MAX_RPM.Hurco.toLocaleString()} rpm</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { k: "vc" as const, label: "Vc (m/min)",    ph: "80"   },
              { k: "fz" as const, label: "Fz (mm/tooth)", ph: "0.05" },
              { k: "ap" as const, label: "ap (mm)",        ph: "5"    },
              { k: "ae" as const, label: "ae (mm)",        ph: "2"    },
            ] as const).map(({ k, label, ph }) => (
              <div key={k}>
                <label className={lbl}>{label}</label>
                <input type="number" step="any" min="0" value={setup[k]}
                  onChange={(e) => onUpdate({ [k]: e.target.value })}
                  placeholder={ph} className={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* ── RESULTS ── */}
        <div>
          <div className={sec}>Results</div>
          {result ? (
            <div className="space-y-1.5">
              {heavyClamped && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠ Speed limited −{clampPct}% below theoretical
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`rounded p-2 ${result.clamped ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-500">S ideal</div>
                  <div className="font-mono font-bold text-gray-800 text-sm leading-tight">{fmtRpm(result.idealRpm)}</div>
                  <div className="text-xs text-gray-400">rpm</div>
                </div>
                <div className={`rounded p-2 ${result.clamped ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                  <div className="text-xs text-gray-500">S actual {result.clamped ? "(clamped)" : "(OK)"}</div>
                  <div className={`font-mono font-bold text-sm leading-tight ${result.clamped ? "text-red-700" : "text-green-700"}`}>
                    {fmtRpm(result.actualRpm)}
                  </div>
                  <div className="text-xs text-gray-400">rpm · max {result.maxRpm.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500">Feed</div>
                  <div className="font-mono font-bold text-gray-800 text-sm leading-tight">{fmtFeed(result.feed)}</div>
                  <div className="text-xs text-gray-400">mm/min</div>
                </div>
                <div className={`rounded p-2 ${result.mrr != null ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50 opacity-60"}`}>
                  <div className="text-xs text-gray-500">MRR</div>
                  {result.mrr != null ? (
                    <>
                      <div className="font-mono font-bold text-indigo-700 text-sm leading-tight">{fmtMrr(result.mrr)}</div>
                      <div className="text-xs text-gray-400">cm³/min</div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 mt-0.5">enter ap + ae</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-1 italic">Fill D, Z, Vc and Fz to calculate.</div>
          )}
        </div>

      </div>
    </div>
  );
}
