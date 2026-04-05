"use client";

import { useState, useEffect, useCallback } from "react";

// ── FONTS via @import in style tag injected below ──────────────────────────

const MACHINES = {
  HURCO: { name: "HURCO", maxRPM: 14000, color: "#00d4ff" },
  DANUSYS: { name: "DANUSYS", maxRPM: 4250, color: "#ff6b35" },
};

const MATERIALS = {
  ALU: { label: "Aluminium", color: "#00d4ff", bg: "rgba(0,212,255,0.12)" },
  PLASTIC: { label: "Plastic", color: "#00ff88", bg: "rgba(0,255,136,0.12)" },
};

// Preset tools with base cutting data per material
const PRESET_TOOLS = [
  {
    // Pramet VCGT 220520F-FA Grade HF7 — z3 holder
    // Vc ALU: 942 m/min = 6000 RPM on Ø50 — VERIFIED IN PRACTICE, inserts held up
    // Datasheet says 330 m/min (turning ref) — irrelevant for milling in alu
    id: "50R2", label: "Ø50 R2 z3 · VCGT 220520F-FA HF7", type: "facemill",
    diameter: 50, teeth: 3,
    machines: ["HURCO"],
    insertRef: "Pramet VCGT 220520F-FA Grade HF7 ✓ verified in practice",
    note: "6000 RPM verified in practice — datasheet Vc (330) is turning reference, not applicable",
    params: {
      ALU:     { vc: 942, fz: 0.18, ae: 35, ap: 1.5 },
      PLASTIC: { vc: 200, fz: 0.20, ae: 35, ap: 1.5 },
    },
  },
  {
    // Ceratizit XDKT 11T308FR-F20 CTWN215
    // Vc ALU (green zone): 280-1500 m/min — tangential insert, high speed alu
    // 10,000 RPM on Ø32 = Vc 1005 m/min — within insert spec
    id: "32R08", label: "Ø32 R0.8 z4 · XDKT 11T308FR-F20 CTWN215", type: "facemill",
    diameter: 32, teeth: 4,
    machines: ["HURCO", "DANUSYS"],
    insertRef: "Ceratizit XDKT 11T308FR-F20 CTWN215",
    params: {
      ALU:     { vc: 1005, fz: 0.15, ae: 22, ap: 2.0 },
      PLASTIC: { vc: 350,  fz: 0.18, ae: 22, ap: 2.0 },
    },
  },
  // EM20 z3 — Trochoidal 10%D
  { id: "EM20-T10", label: "Ø20 EM z3 · Trochoidal 10%", type: "endmill", strategy: "Trochoidal 10%D",
    chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    diameter: 20, teeth: 3, machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 350, fz: 0.22, ae: 2,  ap: 30 },
      PLASTIC: { vc: 240, fz: 0.25, ae: 2,  ap: 30 },
    },
  },
  // EM20 z3 — Trochoidal 20%D
  { id: "EM20-T20", label: "Ø20 EM z3 · Trochoidal 20%", type: "endmill", strategy: "Trochoidal 20%D",
    diameter: 20, teeth: 3, chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 350, fz: 0.16, ae: 4,  ap: 30 },
      PLASTIC: { vc: 240, fz: 0.18, ae: 4,  ap: 30 },
    },
  },
  // EM20 z3 — Conventional 60%D
  { id: "EM20-C60", label: "Ø20 EM z3 · Conv. 60%", type: "endmill", strategy: "Conventional 60%D",
    diameter: 20, teeth: 3, machines: ["HURCO", "DANUSYS"],
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    params: {
      ALU:     { vc: 350, fz: 0.06, ae: 12, ap: 10 },
      PLASTIC: { vc: 220, fz: 0.08, ae: 12, ap: 10 },
    },
  },
  // EM16 z3 — Trochoidal 10%D
  { id: "EM16-T10", label: "Ø16 EM z3 · Trochoidal 10%", type: "endmill", strategy: "Trochoidal 10%D",
    diameter: 16, teeth: 3, chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 330, fz: 0.22, ae: 1.6, ap: 24 },
      PLASTIC: { vc: 220, fz: 0.25, ae: 1.6, ap: 24 },
    },
  },
  // EM16 z3 — Trochoidal 20%D
  { id: "EM16-T20", label: "Ø16 EM z3 · Trochoidal 20%", type: "endmill", strategy: "Trochoidal 20%D",
    diameter: 16, teeth: 3, chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 330, fz: 0.16, ae: 3.2, ap: 24 },
      PLASTIC: { vc: 220, fz: 0.18, ae: 3.2, ap: 24 },
    },
  },
  // EM16 z3 — Conventional 60%D
  { id: "EM16-C60", label: "Ø16 EM z3 · Conv. 60%", type: "endmill", strategy: "Conventional 60%D",
    diameter: 16, teeth: 3, machines: ["HURCO", "DANUSYS"],
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    params: {
      ALU:     { vc: 330, fz: 0.055, ae: 9.6, ap: 8 },
      PLASTIC: { vc: 210, fz: 0.07, ae: 9.6, ap: 8 },
    },
  },
  // EM12 z3 — Trochoidal 10%D
  { id: "EM12-T10", label: "Ø12 EM z3 · Trochoidal 10%", type: "endmill", strategy: "Trochoidal 10%D",
    diameter: 12, teeth: 3, chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 300, fz: 0.22, ae: 1.2, ap: 18 },
      PLASTIC: { vc: 200, fz: 0.25, ae: 1.2, ap: 18 },
    },
  },
  // EM12 z3 — Trochoidal 20%D
  { id: "EM12-T20", label: "Ø12 EM z3 · Trochoidal 20%", type: "endmill", strategy: "Trochoidal 20%D",
    diameter: 12, teeth: 3, chipNote: "fz chip-thinning corrected · Hm≈0.07mm",
    machines: ["HURCO", "DANUSYS"],
    params: {
      ALU:     { vc: 300, fz: 0.16, ae: 2.4, ap: 18 },
      PLASTIC: { vc: 200, fz: 0.18, ae: 2.4, ap: 18 },
    },
  },
  // EM12 z3 — Conventional 60%D
  { id: "EM12-C60", label: "Ø12 EM z3 · Conv. 60%", type: "endmill", strategy: "Conventional 60%D",
    diameter: 12, teeth: 3, machines: ["HURCO", "DANUSYS"],
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    genericNote: "ap = 1.5×D max · generic/mid-range tooling assumed",
    params: {
      ALU:     { vc: 300, fz: 0.05, ae: 7.2, ap: 6 },
      PLASTIC: { vc: 200, fz: 0.06, ae: 7.2, ap: 6 },
    },
  },
];

// MRR = ae * ap * vf   where vf = fz * z * n,  n = (vc*1000)/(π*D)
function calcRPM(vc, D) {
  return (vc * 1000) / (Math.PI * D);
}
function calcVf(fz, z, rpm) {
  return fz * z * rpm;
}
function calcMRR(ae, ap, vf) {
  // cm³/min: ae*ap in mm², vf in mm/min → /1000 for cm³
  return (ae * ap * vf) / 1000;
}
function calcAll(p, D, z, maxRPM) {
  const rpmTheoretical = calcRPM(p.vc, D);
  const rpm = Math.round(Math.min(rpmTheoretical, maxRPM) / 10) * 10;
  const vcActual = (rpm * Math.PI * D) / 1000;
  const vf = calcVf(p.fz, z, rpm);
  const mrr = calcMRR(p.ae, p.ap, vf);
  const limited = rpmTheoretical > maxRPM;
  return { rpm: Math.round(rpm), vcActual: Math.round(vcActual), vf: Math.round(vf), mrr: Math.round(mrr * 10) / 10, limited };
}

// ── FINISH DATA ──────────────────────────────────────────────────────────────
const BN_SIZES = [2, 3, 4, 5, 6, 8, 10, 12, 16];
const WALL_ANGLES = ["Flat", "2.5°", "5°", "30°", "45°", "60°"];

function getFinishParams(bn, angle, mat) {
  // Base params for BN finish — ap & ae max 0.3mm (stock left after roughing)
  const base = {
    2:  { vc: 650, fz: 0.015, ae: 0.05 },  // generic SC: reduced from 850
    3:  { vc: 680, fz: 0.020, ae: 0.08 },  // generic SC: reduced from 820
    4:  { vc: 780, fz: 0.025, ae: 0.10 },
    5:  { vc: 760, fz: 0.030, ae: 0.12 },
    6:  { vc: 760, fz: 0.035, ae: 0.15 },
    8:  { vc: 720, fz: 0.040, ae: 0.20 },
    10: { vc: 700, fz: 0.045, ae: 0.25 },
    12: { vc: 680, fz: 0.050, ae: 0.25 },
    16: { vc: 650, fz: 0.060, ae: 0.30 },
  };
  const matMult = mat === "PLASTIC" ? 0.75 : 1.0;
  const angleMult = {
    "Flat": 0.6, "2.5°": 0.65, "5°": 0.7, "30°": 0.85, "45°": 1.0, "60°": 1.1,
  };
  const p = base[bn];
  return {
    vc: Math.round(p.vc * matMult),
    fz: +(p.fz * (angleMult[angle] || 1.0)).toFixed(3),
    ap: 0.3,
    ae: p.ae,
    note: angle === "Flat" ? "⚠ Cusp height critical" : angle === "60°" ? "✓ Optimal geometry" : "",
  };
}

// ── REAMER DATA ──────────────────────────────────────────────────────────────
const REAMER_SIZES = [4, 6, 8, 10, 12];
const REAMER_MATS = ["ALU", "STEEL", "BRASS"];
function getReamerParams(d, mat) {
  const base = {
    ALU:   { vc: 30, fz: 0.08, tolerance: "H7", coolant: "Flood" },
    STEEL: { vc: 10, fz: 0.04, tolerance: "H7", coolant: "Flood" },
    BRASS: { vc: 20, fz: 0.06, tolerance: "H7", coolant: "Mist/Dry" },
  };
  const scaleFz = (d / 8);
  const p = base[mat];
  const rpm = Math.round((p.vc * 1000) / (Math.PI * d));
  const vf = Math.round(p.fz * scaleFz * rpm);
  return { ...p, fz: +(p.fz * scaleFz).toFixed(3), rpm, vf };
}

// ── DRILL DATA ────────────────────────────────────────────────────────────────
const DRILL_SIZES = [3, 4, 5, 6, 8, 10, 12];
const DRILL_MATS = ["ALU", "STEEL", "BRASS"];
function getDrillParams(d, mat) {
  const base = {
    ALU:   { vc: 80,  fz: 0.05, coolant: "Flood/Air blast" },
    STEEL: { vc: 25,  fz: 0.02, coolant: "Flood" },
    BRASS: { vc: 50,  fz: 0.03, coolant: "Mist/Dry" },
  };
  const p = base[mat];
  const rpm = Math.round((p.vc * 1000) / (Math.PI * d));
  const vf = Math.round(p.fz * rpm);
  return { ...p, fz: +(p.fz + d * 0.002).toFixed(3), rpm, vf };
}
function getSpotParams(mat) {
  const base = {
    ALU:   { vc: 120, fz: 0.02, angle: "90°", note: "1×D depth max" },
    STEEL: { vc: 40,  fz: 0.01, angle: "90°", note: "0.5×D depth" },
    BRASS: { vc: 80,  fz: 0.015, angle: "90°", note: "Dry or mist" },
  };
  const p = base[mat];
  const rpm = Math.round((p.vc * 1000) / (Math.PI * 12));
  const vf = Math.round(p.fz * rpm);
  return { ...p, rpm, vf };
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #090b10;
    --s1: #0f1318;
    --s2: #161b24;
    --s3: #1d2433;
    --border: #242d3d;
    --border2: #2e3a4e;
    --cyan: #00d4ff;
    --orange: #ff6b35;
    --green: #00e87a;
    --yellow: #fbbf24;
    --purple: #a78bfa;
    --red: #f87171;
    --text: #e2e8f0;
    --muted: #64748b;
    --muted2: #8899aa;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Barlow', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); min-height: 100vh; overflow-x: hidden; }

  /* SCANLINE OVERLAY */
  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
  }

  .app { display: flex; flex-direction: column; min-height: 100vh; max-width: 1600px; margin: 0 auto; padding: 0 28px 48px; }

  /* HEADER */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0 18px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .logo-box {
    width: 38px; height: 38px; border: 1px solid var(--cyan);
    display: flex; align-items: center; justify-content: center;
    position: relative; flex-shrink: 0;
  }
  .logo-box::before {
    content: ''; position: absolute; inset: 3px;
    border: 1px solid rgba(0,212,255,0.3);
  }
  .logo-icon { font-size: 16px; }
  .logo-text { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--cyan); letter-spacing: 0.2em; text-transform: uppercase; }
  .logo-sub { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.15em; }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .machine-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 4px;
    border: 1px solid var(--border2);
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .machine-badge.active-hurco { border-color: var(--cyan); background: rgba(0,212,255,0.08); color: var(--cyan); }
  .machine-badge.active-danusys { border-color: var(--orange); background: rgba(255,107,53,0.08); color: var(--orange); }
  .machine-badge:not(.active-hurco):not(.active-danusys) { color: var(--muted); }
  .machine-badge:hover { border-color: var(--border2); color: var(--text); }
  .rpm-limit { font-size: 9px; font-weight: 400; opacity: 0.7; }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* TABS */
  .tab-bar {
    display: flex; gap: 2px;
    background: var(--s1); border: 1px solid var(--border);
    border-radius: 8px; padding: 4px;
    margin-bottom: 28px;
  }
  .tab-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 16px; border-radius: 6px; border: none; cursor: pointer;
    font-family: var(--mono); font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
    transition: all 0.18s; color: var(--muted); background: transparent;
    text-transform: uppercase;
  }
  .tab-btn:hover { color: var(--text); background: var(--s2); }
  .tab-btn.active { background: var(--s3); color: var(--cyan); border: 1px solid var(--border2); }
  .tab-icon { font-size: 14px; }

  /* SECTION TITLE */
  .sec-title {
    font-family: var(--mono); font-size: 10px; color: var(--cyan);
    letter-spacing: 0.2em; text-transform: uppercase;
    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* CARDS */
  .card {
    background: var(--s1); border: 1px solid var(--border);
    border-radius: 10px; padding: 20px;
  }
  .card-sm { background: var(--s2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }

  /* BUTTONS */
  .btn {
    padding: 7px 16px; border-radius: 6px; border: 1px solid var(--border2);
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; letter-spacing: 0.06em;
    background: var(--s2); color: var(--muted2); text-transform: uppercase;
  }
  .btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .btn-primary { background: var(--cyan); color: #000; border-color: var(--cyan); }
  .btn-primary:hover { background: #33dcff; color: #000; }
  .btn-danger { border-color: var(--red); color: var(--red); }
  .btn-danger:hover { background: rgba(248,113,113,0.1); }
  .btn-green { background: var(--green); color: #000; border-color: var(--green); }
  .btn-green:hover { background: #33efaa; color: #000; }

  /* INPUTS */
  .inp {
    background: var(--s3); border: 1px solid var(--border2); border-radius: 6px;
    padding: 7px 10px; font-family: var(--mono); font-size: 11px;
    color: var(--text); width: 100%; transition: border-color 0.15s;
  }
  .inp:focus { outline: none; border-color: var(--cyan); }
  .inp-label { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; display: block; }
  .inp-group { display: flex; flex-direction: column; gap: 4px; }

  /* SELECT */
  select.inp { cursor: pointer; }

  /* TABLE */
  .tbl { width: 100%; border-collapse: collapse; }
  .tbl th {
    text-align: left; padding: 8px 12px;
    background: var(--s2); color: var(--muted); border-bottom: 1px solid var(--border);
    font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
    white-space: nowrap;
  }
  .tbl td {
    padding: 9px 12px; border-bottom: 1px solid rgba(36,45,61,0.6);
    font-family: var(--mono); font-size: 11px; transition: background 0.1s;
  }
  .tbl tr:hover td { background: rgba(255,255,255,0.02); }
  .tbl tr:last-child td { border-bottom: none; }

  /* VALUE COLORS */
  .v-good { color: var(--green); font-weight: 700; }
  .v-med  { color: var(--yellow); font-weight: 600; }
  .v-low  { color: var(--muted2); }
  .v-cyan { color: var(--cyan); font-weight: 600; }
  .v-orange { color: var(--orange); font-weight: 600; }
  .v-warn { color: var(--red); font-size: 9px; }
  .v-muted { color: var(--muted); font-size: 10px; }

  /* CHIP */
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 4px; font-family: var(--mono);
    font-size: 9px; font-weight: 600; letter-spacing: 0.05em;
  }
  .chip-alu   { background: rgba(0,212,255,0.12); color: var(--cyan); border: 1px solid rgba(0,212,255,0.25); }
  .chip-plastic { background: rgba(0,232,122,0.12); color: var(--green); border: 1px solid rgba(0,232,122,0.25); }
  .chip-steel { background: rgba(167,139,250,0.12); color: var(--purple); border: 1px solid rgba(167,139,250,0.25); }
  .chip-brass { background: rgba(251,191,36,0.12); color: var(--yellow); border: 1px solid rgba(251,191,36,0.25); }
  .chip-warn  { background: rgba(248,113,113,0.12); color: var(--red); border: 1px solid rgba(248,113,113,0.25); }
  .chip-ok    { background: rgba(0,232,122,0.12); color: var(--green); border: 1px solid rgba(0,232,122,0.25); }

  /* BAR */
  .bar-wrap { height: 22px; background: var(--s3); border-radius: 4px; overflow: hidden; position: relative; flex: 1; }
  .bar-fill {
    height: 100%; border-radius: 4px; display: flex; align-items: center;
    padding: 0 8px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
    position: relative; overflow: hidden;
  }
  .bar-fill::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.1));
  }
  .bar-label { font-family: var(--mono); font-size: 9px; font-weight: 700; color: #000; position: relative; z-index: 1; white-space: nowrap; }

  /* MRR GRID */
  .mrr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .mrr-controls { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .mrr-machine-row { display: flex; gap: 16px; margin-bottom: 24px; }
  .mrr-machine-card {
    flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 16px;
    transition: border-color 0.2s;
  }
  .mrr-machine-card.selected-hurco { border-color: var(--cyan); background: rgba(0,212,255,0.04); }
  .mrr-machine-card.selected-danusys { border-color: var(--orange); background: rgba(255,107,53,0.04); }
  .mcard-name { font-family: var(--mono); font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .mcard-rpm { font-family: var(--mono); font-size: 10px; color: var(--muted); }

  /* CUSTOM CONFIG PANEL */
  .custom-panel { margin-top: 24px; }
  .cfg-grid { display: grid; grid-template-columns: repeat(6, 1fr) auto; gap: 10px; align-items: end; margin-bottom: 12px; }
  .cfg-list { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  .cfg-row {
    display: grid; grid-template-columns: 2fr repeat(5,1fr) auto auto;
    gap: 8px; align-items: center;
    background: var(--s2); border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 14px; transition: border-color 0.15s;
  }
  .cfg-row:hover { border-color: var(--border2); }
  .cfg-name { font-family: var(--mono); font-size: 11px; color: var(--text); font-weight: 600; }
  .cfg-val { font-family: var(--mono); font-size: 10px; color: var(--muted2); }
  .cfg-mrr { font-family: var(--mono); font-size: 13px; font-weight: 700; }

  /* FINISH TAB */
  .finish-controls { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; align-items: end; margin-bottom: 20px; }
  .finish-table-wrap { overflow-x: auto; }
  .saved-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .saved-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 20px;
    background: var(--s2); border: 1px solid var(--border2);
    font-family: var(--mono); font-size: 10px; cursor: pointer;
    transition: all 0.15s;
  }
  .saved-chip:hover { border-color: var(--cyan); color: var(--cyan); }
  .saved-chip .del { color: var(--muted); font-size: 11px; }
  .saved-chip .del:hover { color: var(--red); }

  /* GRID 3 */
  .grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .grid2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }

  /* STAT BOX */
  .stat-box {
    background: var(--s2); border: 1px solid var(--border); border-radius: 8px;
    padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
  }
  .stat-val { font-family: var(--mono); font-size: 22px; font-weight: 700; line-height: 1; }
  .stat-unit { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .stat-label { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }

  /* TOOLTIP-LIKE NOTE */
  .note-box {
    background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.2);
    border-radius: 6px; padding: 8px 12px;
    font-family: var(--mono); font-size: 10px; color: var(--cyan);
  }
  .warn-box {
    background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2);
    border-radius: 6px; padding: 8px 12px;
    font-family: var(--mono); font-size: 10px; color: var(--red);
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--s1); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* ANIMATIONS */
  @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
  .animate-in { animation: fadeIn 0.25s ease forwards; }

  /* PC-FIRST — no mobile compromises */
  /* min-width so tables never collapse */
  .app { min-width: 960px; }
  .tbl { min-width: 700px; }
  .tab-btn { min-width: 120px; }

  /* Tighter table cells for data density */
  .tbl th { padding: 7px 10px; font-size: 9px; }
  .tbl td { padding: 7px 10px; font-size: 11px; }

  /* cfg grid always 7 cols on PC */
  .cfg-grid { grid-template-columns: 2fr repeat(6,1fr) auto; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MachineSelector({ activeMachine, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Object.values(MACHINES).map((m) => {
        const key = m.name.toLowerCase();
        const isActive = activeMachine === m.name;
        return (
          <div
            key={m.name}
            className={`machine-badge ${isActive ? (m.name === "HURCO" ? "active-hurco" : "active-danusys") : ""}`}
            onClick={() => onSelect(m.name)}
          >
            <div className="dot" style={{ background: isActive ? m.color : "var(--border2)" }} />
            <span>{m.name}</span>
            <span className="rpm-limit">{m.maxRPM.toLocaleString()} RPM</span>
          </div>
        );
      })}
    </div>
  );
}

// ── MRR TAB ───────────────────────────────────────────────────────────────────
function MrrTab({ activeMachine }) {
  const [material, setMaterial] = useState("ALU");
  const [customConfigs, setCustomConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cnc_mrr_configs") || "[]"); } catch { return []; }
  });
  const [newCfg, setNewCfg] = useState({ name: "", D: 20, z: 4, vc: 400, fz: 0.08, ae: 14, ap: 20 });
  const [showAddForm, setShowAddForm] = useState(false);

  const maxRPM = MACHINES[activeMachine]?.maxRPM || 14000;
  const mat = material;

  useEffect(() => {
    localStorage.setItem("cnc_mrr_configs", JSON.stringify(customConfigs));
  }, [customConfigs]);

  const addConfig = () => {
    if (!newCfg.name) return;
    setCustomConfigs(prev => [...prev, { ...newCfg, id: Date.now() }]);
    setNewCfg({ name: "", D: 20, z: 4, vc: 400, fz: 0.08, ae: 14, ap: 20 });
    setShowAddForm(false);
  };
  const removeConfig = (id) => setCustomConfigs(prev => prev.filter(c => c.id !== id));

  // Build rows for all preset tools
  const presetRows = PRESET_TOOLS
    .filter(tool => !tool.machines || tool.machines.includes(activeMachine))
    .map(tool => {
    const p = tool.params[mat];
    const res = calcAll(p, tool.diameter, tool.teeth, maxRPM);
    return { ...tool, p, res };
  });

  const customRows = customConfigs.map(cfg => {
    const p = { vc: +cfg.vc, fz: +cfg.fz, ae: +cfg.ae, ap: +cfg.ap };
    const res = calcAll(p, +cfg.D, +cfg.z, maxRPM);
    return { id: cfg.id, label: cfg.name, p, D: cfg.D, z: cfg.z, res };
  });

  const allRows = [...presetRows.map(r => ({ ...r, isPreset: true })), ...customRows.map(r => ({ ...r, isPreset: false }))];
  const maxMRR = Math.max(...allRows.map(r => r.res.mrr), 1);

  function mrrColor(mrr) {
    const ratio = mrr / maxMRR;
    if (ratio > 0.7) return "var(--green)";
    if (ratio > 0.4) return "var(--yellow)";
    return "var(--orange)";
  }

  return (
    <div className="animate-in">
      {/* Machine + Material controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(MATERIALS).map(k => (
            <button
              key={k}
              className={`btn ${material === k ? "btn-primary" : ""}`}
              style={material === k ? { background: MATERIALS[k].color, borderColor: MATERIALS[k].color } : {}}
              onClick={() => setMaterial(k)}
            >
              {MATERIALS[k].label}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          Machine: <span style={{ color: MACHINES[activeMachine].color, fontWeight: 700 }}>{activeMachine}</span>
          <span style={{ marginLeft: 8 }}>max {MACHINES[activeMachine].maxRPM.toLocaleString()} RPM</span>
        </div>
      </div>

      {/* Chart + Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="sec-title">// MRR Comparison — {MATERIALS[mat].label}</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Strategy</th>
              <th>Vc (m/min)</th>
              <th>RPM</th>
              <th>fz (mm)</th>
              <th>ae (mm)</th>
              <th>ap (mm)</th>
              <th>Vf (mm/min)</th>
              <th>MRR (cm³/min)</th>
              <th>Visual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => {
              const { res } = row;
              const barPct = Math.round((res.mrr / maxMRR) * 100);
              return (
                <tr key={row.id || row.label}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 11 }}>{row.label}</div>
                    {row.insertRef && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{row.insertRef}</div>}
                    {row.note && <div style={{ fontSize: 9, color: "var(--green)", marginTop: 2 }}>⚑ {row.note}</div>}
                    {row.chipNote && <div style={{ fontSize: 9, color: "var(--purple)", marginTop: 2 }}>◈ {row.chipNote}</div>}
                    {row.genericNote && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>· {row.genericNote}</div>}
                    {!row.isPreset && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--cyan)" }}>★</span>}
                  </td>
                  <td>
                    {row.strategy
                      ? <span className="chip" style={{
                          background: row.strategy.includes("10%") ? "rgba(0,232,122,0.12)" :
                                      row.strategy.includes("20%") ? "rgba(0,212,255,0.12)" :
                                      "rgba(251,191,36,0.12)",
                          color: row.strategy.includes("10%") ? "var(--green)" :
                                 row.strategy.includes("20%") ? "var(--cyan)" :
                                 "var(--yellow)",
                          border: row.strategy.includes("10%") ? "1px solid rgba(0,232,122,0.3)" :
                                  row.strategy.includes("20%") ? "1px solid rgba(0,212,255,0.3)" :
                                  "1px solid rgba(251,191,36,0.3)",
                          fontSize: 9, whiteSpace: "nowrap"
                        }}>{row.strategy}</span>
                      : <span className="v-muted" style={{fontSize:9}}>—</span>}
                  </td>
                  <td className="v-muted">{row.p?.vc || row.res.vcActual}</td>
                  <td className={res.limited ? "v-warn" : "v-muted"}>{res.rpm.toLocaleString()}</td>
                  <td className="v-muted">{row.p?.fz}</td>
                  <td className="v-muted">{row.p?.ae}</td>
                  <td className="v-muted">{row.p?.ap}</td>
                  <td className="v-cyan">{res.vf.toLocaleString()}</td>
                  <td>
                    <span className="cfg-mrr" style={{ color: mrrColor(res.mrr) }}>{res.mrr}</span>
                  </td>
                  <td style={{ width: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="bar-wrap" style={{ height: 18 }}>
                        <div className="bar-fill" style={{ width: `${barPct}%`, background: mrrColor(res.mrr) }}>
                          {barPct > 20 && <span className="bar-label">{barPct}%</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {res.limited
                      ? <span className="chip chip-warn">RPM LIMITED</span>
                      : <span className="chip chip-ok">OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Custom config section */}
      <div className="custom-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="sec-title" style={{ marginBottom: 0, flex: "none" }}>// Custom Configurations</div>
          <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? "✕ Cancel" : "+ Add Config"}
          </button>
        </div>

        {showAddForm && (
          <div className="card-sm" style={{ marginBottom: 16 }}>
            <div className="cfg-grid">
              <div className="inp-group" style={{ gridColumn: "span 2" }}>
                <label className="inp-label">Config Name</label>
                <input className="inp" placeholder="e.g. EM20 Roughing ALU" value={newCfg.name}
                  onChange={e => setNewCfg(p => ({ ...p, name: e.target.value }))} />
              </div>
              {[
                { key: "D", label: "Ø (mm)" },
                { key: "z", label: "Teeth" },
                { key: "vc", label: "Vc m/min" },
                { key: "fz", label: "fz mm" },
                { key: "ae", label: "ae mm" },
                { key: "ap", label: "ap mm" },
              ].map(({ key, label }) => (
                <div className="inp-group" key={key}>
                  <label className="inp-label">{label}</label>
                  <input className="inp" type="number" step="any" value={newCfg[key]}
                    onChange={e => setNewCfg(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn btn-green" onClick={addConfig} style={{ width: "100%" }}>Save</button>
              </div>
            </div>
            {newCfg.D && newCfg.vc && (
              <div className="note-box" style={{ marginTop: 8 }}>
                Preview → RPM: {Math.min(Math.round(calcRPM(+newCfg.vc, +newCfg.D)), maxRPM).toLocaleString()} | 
                MRR: {calcAll({ vc: +newCfg.vc, fz: +newCfg.fz, ae: +newCfg.ae, ap: +newCfg.ap }, +newCfg.D, +newCfg.z, maxRPM).mrr} cm³/min
              </div>
            )}
          </div>
        )}

        {customConfigs.length > 0 && (
          <div className="cfg-list">
            {customRows.map(row => (
              <div className="cfg-row" key={row.id}>
                <span className="cfg-name">★ {row.label}</span>
                <span className="cfg-val">Ø{row.D}</span>
                <span className="cfg-val">{row.p.vc} m/min</span>
                <span className="cfg-val">fz {row.p.fz}</span>
                <span className="cfg-val">ae {row.p.ae}</span>
                <span className="cfg-val">ap {row.p.ap}</span>
                <span className="cfg-mrr" style={{ color: mrrColor(row.res.mrr) }}>{row.res.mrr}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>cm³/min</span>
                <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 9 }} onClick={() => removeConfig(row.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
        {customConfigs.length === 0 && !showAddForm && (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11 }}>
            No custom configs yet — add your own tool settings above
          </div>
        )}
      </div>
    </div>
  );
}


// ── SIDE FINISH EM Z3 DATA ──────────────────────────────────────────────────
const EM_FINISH_SIZES = [4, 6, 8, 10, 12, 16, 20];

// Safe ap per diameter for side finish (conservative / max)
const EM_AP_MAP = {
  4:  { safe: 2,  max: 4  },   // 0.5×D / 1×D
  6:  { safe: 4.5, max: 9 },   // 0.75×D / 1.5×D
  8:  { safe: 8,  max: 12 },   // 1×D / 1.5×D
  10: { safe: 12, max: 15 },   // 1.2×D / 1.5×D
  12: { safe: 18, max: 24 },   // 1.5×D / 2×D
  16: { safe: 24, max: 32 },   // 1.5×D / 2×D
  20: { safe: 30, max: 40 },   // 1.5×D / 2×D
};

const EM_AE_OPTIONS = [
  { label: "0.05mm", value: 0.05, desc: "Super finish — Ra 0.2–0.4μm" },
  { label: "0.1mm",  value: 0.1,  desc: "Fine finish — Ra ~0.8μm" },
  { label: "0.3mm",  value: 0.3,  desc: "Standard finish" },
  { label: "0.5mm",  value: 0.5,  desc: "Semi-finish / pre-finish" },
];

function getEmSideFinishParams(d, ae_mm, mat) {
  const baseVc = { ALU: 420, PLASTIC: 260 };  // generic SC tooling
  const baseFz = {
    4:  0.025, 6:  0.030, 8:  0.035,
    10: 0.040, 12: 0.045, 16: 0.055, 20: 0.065,
  };
  // Super finish: drop fz significantly — chip thinning effect
  const aeMult = ae_mm <= 0.05 ? 0.5 : ae_mm <= 0.1 ? 0.7 : ae_mm <= 0.3 ? 1.0 : 0.85;
  const matMult = mat === "PLASTIC" ? 0.75 : 1.0;
  const vc = Math.round(baseVc[mat] * (1 - d * 0.002));
  const fz = +(baseFz[d] * aeMult).toFixed(3);
  const apSafe = EM_AP_MAP[d]?.safe || d;
  const apMax  = EM_AP_MAP[d]?.max  || d * 2;
  const rpm = Math.round((vc * 1000) / (Math.PI * d) / 10) * 10;
  const vf = Math.round(fz * 3 * rpm);
  return { vc, fz, ae: ae_mm, apSafe, apMax, rpm, vf };
}


// ── BULLNOSE 3D MILLING DATA ─────────────────────────────────────────────────
const TR_SIZES = [
  { d: 8,  r: [1, 1.5, 2] },
  { d: 10, r: [1, 1.5, 2] },
  { d: 12, r: [1, 1.5, 2] },
  { d: 16, r: [1, 1.5, 2] },
];

const TR_STRATEGIES = [
  { id: "ramp", label: "Ramps & Tapers", ae_pct: 0.15, ap_mm: 0.5 },
  { id: "corner", label: "3D Corner Blend", ae_pct: 0.10, ap_mm: 0.3 },
];

function getTrParams(d, r, strategy, mat) {
  // Effective cutting radius at tip = r (corner)
  // Vc referenced to full diameter
  const baseVc = { ALU: 400, PLASTIC: 240 };  // generic SC tooling
  const baseFz = {
    8: 0.040, 10: 0.050, 12: 0.055, 16: 0.070,
  };
  const rMult = r === 1 ? 1.05 : r === 1.5 ? 1.0 : 0.95; // smaller r = slightly higher fz possible
  const matMult = mat === "PLASTIC" ? 0.75 : 1.0;
  const vc = Math.round(baseVc[mat] * matMult);
  const fz = +(baseFz[d] * rMult).toFixed(3);
  const ae = +(d * strategy.ae_pct).toFixed(2);
  const ap = strategy.ap_mm;
  const rpm = Math.round((vc * 1000) / (Math.PI * d) / 10) * 10;
  const vf = Math.round(fz * 3 * rpm);
  return { vc, fz, ae, ap, rpm, vf };
}

// ── FINISH TAB ────────────────────────────────────────────────────────────────
function FinishTab({ activeMachine }) {
  const [material, setMaterial] = useState("ALU");
  const [finishSubTab, setFinishSubTab] = useState("bn");
  const [emAe, setEmAe] = useState(0.3);
  const [trStrategy, setTrStrategy] = useState("ramp");
  const [savedSettings, setSavedSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cnc_finish_saved") || "[]"); } catch { return []; }
  });
  const [saveLabel, setSaveLabel] = useState("");
  const [highlight, setHighlight] = useState(null);
  const maxRPM = MACHINES[activeMachine]?.maxRPM || 14000;
  const machineColor = activeMachine === "HURCO" ? "var(--cyan)" : "var(--orange)";

  function clampRPM(rpmRaw) {
    return Math.round(Math.min(rpmRaw, maxRPM) / 10) * 10;
  }
  function calcFinishVf(fz, z, rpmRaw) {
    const rpm = clampRPM(rpmRaw);
    return { rpm, vf: Math.round(fz * z * rpm), limited: rpmRaw > maxRPM };
  }

  useEffect(() => {
    localStorage.setItem("cnc_finish_saved", JSON.stringify(savedSettings));
  }, [savedSettings]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(savedSettings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cnc_finish_settings.json"; a.click();
  };
  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setSavedSettings(JSON.parse(ev.target.result)); } catch {}
    };
    reader.readAsText(file);
  };
  const saveCurrentView = () => {
    if (!saveLabel) return;
    setSavedSettings(prev => [...prev, { label: saveLabel, material, timestamp: new Date().toLocaleDateString() }]);
    setSaveLabel("");
  };

  const FINISH_SUBTABS = [
    { id: "bn",     icon: "⚈", label: "Ball Nose" },
    { id: "side",   icon: "▭", label: "Side Finish EM" },
    { id: "tr",     icon: "◉", label: "Bullnose 3D" },
  ];

  return (
    <div className="animate-in">
      {/* Top controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(MATERIALS).map(k => (
            <button key={k} className={`btn ${material === k ? "btn-primary" : ""}`}
              style={material === k ? { background: MATERIALS[k].color, borderColor: MATERIALS[k].color } : {}}
              onClick={() => setMaterial(k)}>{MATERIALS[k].label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={exportJSON}>↓ Export JSON</button>
          <label className="btn" style={{ cursor: "pointer" }}>
            ↑ Import JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={importJSON} />
          </label>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, marginBottom: 20 }}>
        {FINISH_SUBTABS.map(t => (
          <button key={t.id}
            className={`btn ${finishSubTab === t.id ? "btn-primary" : ""}`}
            style={{ flex: 1, ...(finishSubTab === t.id ? {} : {}) }}
            onClick={() => setFinishSubTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── BALL NOSE ── */}
      {finishSubTab === "bn" && (
      <div className="card" style={{ marginBottom: 20, overflowX: "auto" }}>
        <div className="sec-title">// Ball Nose Finish — {MATERIALS[material].label} — Vc / fz recommendations</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>BN Ø</th>
              {WALL_ANGLES.map(a => <th key={a}>{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {BN_SIZES.map(bn => (
              <tr key={bn}>
                <td><span style={{ color: "var(--cyan)", fontWeight: 700 }}>BN {bn}</span></td>
                {WALL_ANGLES.map(angle => {
                  const p = getFinishParams(bn, angle, material);
                  const isHL = highlight === `${bn}-${angle}`;
                  return (
                    <td key={angle}
                      style={{ cursor: "pointer", background: isHL ? "rgba(0,212,255,0.08)" : undefined, transition: "background 0.15s" }}
                      onClick={() => setHighlight(isHL ? null : `${bn}-${angle}`)}>
                      {(() => {
                        const rpmRaw = Math.round((p.vc * 1000) / (Math.PI * bn));
                        const { rpm, vf, limited, vcActual } = calcFinishVf(p.fz, 2, rpmRaw, bn);
                        return (<>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                            <span style={{ color: "var(--text)", fontWeight: 600 }}>{p.vc}</span>
                            <span style={{ color: "var(--muted)", fontSize: 9 }}> m/min</span>
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: limited ? "var(--red)" : machineColor, fontWeight: 600 }}>
                            S {rpm.toLocaleString()}
                            {limited && vcActual && <span style={{ fontSize: 8, fontWeight: 400, marginLeft: 4 }}>({vcActual} m/min)</span>}
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--green)", fontWeight: 600 }}>
                            F {vf.toLocaleString()}
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted2)" }}>
                            fz {p.fz} · ae {p.ae}
                          </div>

                          {p.note && <div style={{ fontSize: 9, color: angle === "Flat" ? "var(--yellow)" : "var(--green)", marginTop: 1 }}>{p.note}</div>}
                        </>);
                      })()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
          ap = 0.3mm | S & F values for active machine | Click cell to highlight | Starting recommendations
        </div>
      </div>
      )}

      {/* ── SIDE FINISH EM Z3 ── */}
      {finishSubTab === "side" && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>ae:</span>
          {EM_AE_OPTIONS.map(o => (
            <button key={o.value}
              className={`btn ${emAe === o.value ? "btn-primary" : ""}`}
              onClick={() => setEmAe(o.value)}
              title={o.desc}>
              {o.label}
            </button>
          ))}
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", marginLeft: 8 }}>
            {EM_AE_OPTIONS.find(o => o.value === emAe)?.desc}
          </span>
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title">// Side Finish EM z3 — {MATERIALS[material].label} — ae {emAe}mm</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Vc m/min</th>
                <th>RPM</th>
                <th>fz mm</th>
                <th>ae mm</th>
                <th>ap safe</th>
                <th>ap max</th>
                <th>Vf mm/min</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {EM_FINISH_SIZES.map(d => {
                const p = getEmSideFinishParams(d, emAe, material);
                return (() => {
                    const { rpm, vf, limited, vcActual } = calcFinishVf(p.fz, 3, p.rpm, d);
                    return (
                    <tr key={d}>
                      <td><span style={{ color: "var(--cyan)", fontWeight: 700 }}>Ø{d} EM z3</span></td>
                      <td className="v-muted">{p.vc}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: limited ? "var(--red)" : machineColor, fontWeight: 700 }}>
                        {rpm.toLocaleString()}
                        {limited && vcActual && <span style={{ fontSize: 9, color: "var(--red)", marginLeft: 4 }}>({vcActual} m/min)</span>}
                      </td>
                      <td className="v-muted">{p.fz}</td>
                      <td><span style={{ color: "var(--green)", fontWeight: 600 }}>{p.ae}</span></td>
                      <td><span style={{ color: "var(--cyan)", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600 }}>{p.apSafe}</span></td>
                      <td><span style={{ color: "var(--yellow)", fontFamily: "var(--mono)", fontSize: 11 }}>{p.apMax}</span></td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--green)", fontWeight: 700 }}>{vf.toLocaleString()}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
                        {emAe <= 0.05 ? "⚑ Spring pass | new insert only" : emAe <= 0.1 ? "⚑ Spring pass viable" : emAe <= 0.3 ? "✓ Standard finish" : "Semi-finish"}
                      </td>
                    </tr>
                    );
                  })();
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
            ap safe (cyan) = stable | ap max (yellow) = careful with small Ø | z3 | Climb | Flood ALU
          </div>
        </div>
      </div>
      )}

      {/* ── BULLNOSE 3D ── */}
      {finishSubTab === "tr" && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>Strategy:</span>
          {TR_STRATEGIES.map(s => (
            <button key={s.id}
              className={`btn ${trStrategy === s.id ? "btn-primary" : ""}`}
              onClick={() => setTrStrategy(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title">// Bullnose TR z3 — {MATERIALS[material].label} — {TR_STRATEGIES.find(s=>s.id===trStrategy)?.label}</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Corner R</th>
                <th>Vc m/min</th>
                <th>RPM</th>
                <th>fz mm</th>
                <th>ae mm</th>
                <th>ap mm</th>
                <th>Vf mm/min</th>
              </tr>
            </thead>
            <tbody>
              {TR_SIZES.map(({ d, r }) =>
                r.map(radius => {
                  const strat = TR_STRATEGIES.find(s => s.id === trStrategy);
                  const p = getTrParams(d, radius, strat, material);
                  const rColor = radius === 1 ? "var(--cyan)" : radius === 1.5 ? "var(--green)" : "var(--yellow)";
                  return (() => {
                      const { rpm, vf, limited, vcActual } = calcFinishVf(p.fz, 3, p.rpm, d);
                      return (
                      <tr key={`${d}-${radius}`}>
                        <td><span style={{ color: "var(--text)", fontWeight: 700 }}>TR{d} z3</span></td>
                        <td><span style={{ color: rColor, fontFamily: "var(--mono)", fontWeight: 700 }}>R{radius}</span></td>
                        <td className="v-muted">{p.vc}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: limited ? "var(--red)" : machineColor, fontWeight: 700 }}>
                          {rpm.toLocaleString()}
                          {limited && vcActual && <span style={{ fontSize: 9, color: "var(--red)", marginLeft: 4 }}>({vcActual} m/min)</span>}
                        </td>
                        <td className="v-muted">{p.fz}</td>
                        <td><span style={{ color: "var(--green)", fontWeight: 600 }}>{p.ae}</span></td>
                        <td className="v-muted">{p.ap}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--green)", fontWeight: 700 }}>{vf.toLocaleString()}</td>
                      </tr>
                      );
                    })();
                })
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
            z3 | Vc ref to full Ø | Smaller R = tighter step-over for same Ra | Climb milling
          </div>
        </div>
      </div>
      )}

      {/* Save settings */}
      <div className="card-sm" style={{ marginBottom: 16 }}>
        <div className="sec-title">// Save Working Settings</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div className="inp-group" style={{ flex: 1 }}>
            <label className="inp-label">Label (describe what worked well)</label>
            <input className="inp" placeholder="e.g. BN6 60° wall ALU mirror finish — Vc720 fz0.038" value={saveLabel}
              onChange={e => setSaveLabel(e.target.value)} />
          </div>
          <button className="btn btn-green" onClick={saveCurrentView}>Save Note</button>
        </div>
        {savedSettings.length > 0 && (
          <div className="saved-chips">
            {savedSettings.map((s, i) => (
              <div key={i} className="saved-chip" title={s.timestamp}>
                <span>★ {s.label}</span>
                <span style={{ color: "var(--muted)", fontSize: 9 }}>{s.material}</span>
                <span className="del" onClick={(e) => { e.stopPropagation(); setSavedSettings(prev => prev.filter((_, j) => j !== i)); }}>✕</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── REAMERS TAB ───────────────────────────────────────────────────────────────
function ReamersTab({ activeMachine }) {
  const [mat, setMat] = useState("ALU");
  const maxRPM = MACHINES[activeMachine]?.maxRPM || 14000;

  const matColors = { ALU: "var(--cyan)", STEEL: "var(--purple)", BRASS: "var(--yellow)" };
  const chipClass = { ALU: "chip-alu", STEEL: "chip-steel", BRASS: "chip-brass" };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {REAMER_MATS.map(m => (
          <button key={m} className={`btn ${mat === m ? "btn-primary" : ""}`}
            style={mat === m ? { background: matColors[m], borderColor: matColors[m], color: "#000" } : {}}
            onClick={() => setMat(m)}>{m}</button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="sec-title">// Reamer Parameters — {mat}</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ø (mm)</th>
              <th>Vc (m/min)</th>
              <th>RPM</th>
              <th>fz (mm/tooth)</th>
              <th>Vf (mm/min)</th>
              <th>Tolerance</th>
              <th>Coolant</th>
              <th>Pre-drill Ø</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {REAMER_SIZES.map(d => {
              const p = getReamerParams(d, mat);
              const limited = p.rpm > maxRPM;
              const actualRPM = Math.min(p.rpm, maxRPM);
              const actualVf = limited ? Math.round(p.fz * actualRPM) : p.vf;
              return (
                <tr key={d}>
                  <td><span className={`chip ${chipClass[mat]}`}>Ø {d}</span></td>
                  <td className="v-muted">{p.vc}</td>
                  <td className={limited ? "v-warn" : "v-cyan"}>{actualRPM.toLocaleString()}</td>
                  <td className="v-muted">{p.fz}</td>
                  <td className="v-cyan">{actualVf.toLocaleString()}</td>
                  <td><span style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>{p.tolerance}</span></td>
                  <td className="v-muted" style={{ fontSize: 10 }}>{p.coolant}</td>
                  <td className="v-muted">{(d - 0.2).toFixed(1)} mm</td>
                  <td>{limited ? <span className="chip chip-warn">RPM LTD</span> : <span className="chip chip-ok">✓ OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-sm">
        <div className="sec-title">// General Notes</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Pre-drill", val: "Ø − 0.2mm", note: "Always leave stock for reaming" },
            { label: "Feed direction", val: "One-way", note: "Never feed back through hole" },
            { label: "H7 tolerance", val: "+0 / +IT7", note: "Standard fit for most applications" },
          ].map(item => (
            <div key={item.label} className="stat-box">
              <div className="stat-label">{item.label}</div>
              <div className="stat-val" style={{ fontSize: 16, color: "var(--cyan)" }}>{item.val}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", marginTop: 4 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DRILLS TAB ────────────────────────────────────────────────────────────────
function DrillsTab({ activeMachine }) {
  const [mat, setMat] = useState("ALU");
  const maxRPM = MACHINES[activeMachine]?.maxRPM || 14000;

  const matColors = { ALU: "var(--cyan)", STEEL: "var(--purple)", BRASS: "var(--yellow)" };
  const chipClass = { ALU: "chip-alu", STEEL: "chip-steel", BRASS: "chip-brass" };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {DRILL_MATS.map(m => (
          <button key={m} className={`btn ${mat === m ? "btn-primary" : ""}`}
            style={mat === m ? { background: matColors[m], borderColor: matColors[m], color: "#000" } : {}}
            onClick={() => setMat(m)}>{m}</button>
        ))}
      </div>

      {/* Spot drill */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="sec-title">// Spot Drill — {mat}</div>
        {(() => {
          const p = getSpotParams(mat);
          const limited = p.rpm > maxRPM;
          const actualRPM = Math.min(p.rpm, maxRPM);
          return (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Vc", val: `${p.vc} m/min`, color: "var(--text)" },
                { label: "RPM (Ø12 ref)", val: actualRPM.toLocaleString(), color: limited ? "var(--red)" : "var(--cyan)" },
                { label: "fz", val: `${p.fz} mm`, color: "var(--text)" },
                { label: "Angle", val: p.angle, color: "var(--green)" },
                { label: "Coolant", val: p.coolant, color: "var(--muted2)" },
                { label: "Note", val: p.note, color: "var(--yellow)" },
              ].map(s => (
                <div key={s.label} className="stat-box" style={{ flex: "1", minWidth: 120 }}>
                  <div className="stat-label">{s.label}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.val}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Twist drills */}
      <div className="card">
        <div className="sec-title">// Twist Drills — {mat}</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ø (mm)</th>
              <th>Vc (m/min)</th>
              <th>RPM</th>
              <th>fz (mm/rev)</th>
              <th>Vf (mm/min)</th>
              <th>Coolant</th>
              <th>Peck</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {DRILL_SIZES.map(d => {
              const p = getDrillParams(d, mat);
              const limited = p.rpm > maxRPM;
              const actualRPM = Math.min(p.rpm, maxRPM);
              const actualVf = Math.round(p.fz * actualRPM);
              const needsPeck = mat === "ALU" && d <= 6;
              return (
                <tr key={d}>
                  <td><span className={`chip ${chipClass[mat]}`}>Ø {d}</span></td>
                  <td className="v-muted">{p.vc}</td>
                  <td className={limited ? "v-warn" : "v-cyan"}>{actualRPM.toLocaleString()}</td>
                  <td className="v-muted">{p.fz}</td>
                  <td className="v-cyan">{actualVf.toLocaleString()}</td>
                  <td className="v-muted" style={{ fontSize: 10 }}>{p.coolant}</td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                    {needsPeck
                      ? <span style={{ color: "var(--yellow)" }}>Q {(d * 0.5).toFixed(1)}mm</span>
                      : <span style={{ color: "var(--muted)" }}>Full</span>}
                  </td>
                  <td>{limited ? <span className="chip chip-warn">RPM LTD</span> : <span className="chip chip-ok">✓ OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "mrr", label: "MRR", icon: "📊" },
  { id: "finish", label: "Finish", icon: "✨" },
  { id: "reamers", label: "Reamers", icon: "🔩" },
  { id: "drills", label: "Drills", icon: "🔧" },
];

export default function CncApp() {
  const [activeTab, setActiveTab] = useState("mrr");
  const [activeMachine, setActiveMachine] = useState("HURCO");

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="header-left">
            <div className="logo-box">
              <span className="logo-icon">⚙</span>
            </div>
            <div>
              <div className="logo-text">CNC Mill</div>
              <div className="logo-sub">Cutting Parameters Assistant</div>
            </div>
          </div>
          <MachineSelector activeMachine={activeMachine} onSelect={setActiveMachine} />
        </div>

        {/* TABS */}
        <div className="tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {activeTab === "mrr" && <MrrTab activeMachine={activeMachine} />}
        {activeTab === "finish" && <FinishTab activeMachine={activeMachine} />}
        {activeTab === "reamers" && <ReamersTab activeMachine={activeMachine} />}
        {activeTab === "drills" && <DrillsTab activeMachine={activeMachine} />}
      </div>
    </>
  );
}
