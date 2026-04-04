"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { IEntity, IPoint } from "dxf-parser";
import type { ILineEntity } from "dxf-parser/dist/entities/line";
import type { IArcEntity } from "dxf-parser/dist/entities/arc";
import type { ICircleEntity } from "dxf-parser/dist/entities/circle";
import type { ILwpolylineEntity } from "dxf-parser/dist/entities/lwpolyline";
import type { IPolylineEntity } from "dxf-parser/dist/entities/polyline";

// ── SVG Helpers ────────────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Build an SVG arc path from a DXF ARC entity (Y-flipped coords). */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  // DXF angles are CCW from +X in Y-up space.
  // After flipping Y (svgY = −dxfY) the arc direction reverses → CW in SVG → sweep=1.
  let span = endDeg - startDeg;
  if (span <= 0) span += 360;
  const largeArc = span > 180 ? 1 : 0;

  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = -(cy + r * Math.sin(toRad(startDeg)));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = -(cy + r * Math.sin(toRad(endDeg)));

  // Full circle: start === end after normalization → split into two half-arcs.
  if (Math.hypot(x2 - x1, y2 - y1) < 1e-6) {
    const mx = cx + r * Math.cos(toRad(startDeg + 180));
    const my = -(cy + r * Math.sin(toRad(startDeg + 180)));
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${mx} ${my} A${r} ${r} 0 0 1 ${x1} ${y1}`;
  }
  return `M${x1} ${y1} A${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ── Bounding box ───────────────────────────────────────────────────────────

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

function computeBBox(entities: IEntity[], visibleLayers: Set<string>): BBox | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const expand = (x: number, y: number) => {
    const sy = -y; // flip Y
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  };

  const expandPt = (p: IPoint) => expand(p.x, p.y);

  for (const e of entities) {
    if (!visibleLayers.has(e.layer ?? "0")) continue;
    switch (e.type) {
      case "LINE": {
        const l = e as unknown as ILineEntity;
        l.vertices?.forEach(expandPt);
        break;
      }
      case "ARC":
      case "CIRCLE": {
        const a = e as unknown as IArcEntity;
        if (a.center && a.radius != null) {
          expand(a.center.x - a.radius, a.center.y - a.radius);
          expand(a.center.x + a.radius, a.center.y + a.radius);
        }
        break;
      }
      case "LWPOLYLINE": {
        const p = e as unknown as ILwpolylineEntity;
        p.vertices?.forEach(expandPt);
        break;
      }
      case "POLYLINE": {
        const p = e as unknown as IPolylineEntity;
        p.vertices?.forEach((v) => expandPt(v));
        break;
      }
    }
  }

  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ── Entity renderer ────────────────────────────────────────────────────────

function renderEntity(
  e: IEntity,
  key: string,
  sw: number,
): React.ReactElement | null {
  const stroke = "#e8a020";
  const base = { stroke, strokeWidth: sw, fill: "none" as const };

  switch (e.type) {
    case "LINE": {
      const l = e as unknown as ILineEntity;
      if (!l.vertices || l.vertices.length < 2) return null;
      const [s, en] = l.vertices;
      return <line key={key} x1={s.x} y1={-s.y} x2={en.x} y2={-en.y} {...base} />;
    }
    case "CIRCLE": {
      const c = e as unknown as ICircleEntity;
      if (!c.center || c.radius == null) return null;
      return (
        <circle key={key} cx={c.center.x} cy={-c.center.y} r={c.radius} {...base} />
      );
    }
    case "ARC": {
      const a = e as unknown as IArcEntity;
      if (!a.center || a.radius == null || a.startAngle == null || a.endAngle == null)
        return null;
      return (
        <path
          key={key}
          d={arcPath(a.center.x, a.center.y, a.radius, a.startAngle, a.endAngle)}
          {...base}
        />
      );
    }
    case "LWPOLYLINE": {
      const p = e as unknown as ILwpolylineEntity;
      if (!p.vertices || p.vertices.length < 2) return null;
      const pts = p.vertices.map((v) => `${v.x},${-v.y}`).join(" ");
      return (
        <polyline
          key={key}
          points={p.shape ? pts + ` ${p.vertices[0].x},${-p.vertices[0].y}` : pts}
          strokeLinejoin="round"
          {...base}
        />
      );
    }
    case "POLYLINE": {
      const p = e as unknown as IPolylineEntity;
      if (!p.vertices || p.vertices.length < 2) return null;
      const pts = p.vertices.map((v) => `${v.x},${-v.y}`).join(" ");
      return (
        <polyline
          key={key}
          points={p.shape ? pts + ` ${p.vertices[0].x},${-p.vertices[0].y}` : pts}
          strokeLinejoin="round"
          {...base}
        />
      );
    }
    default:
      return null; // unsupported entities skipped silently
  }
}

// ── Theme constants ────────────────────────────────────────────────────────

const T = {
  bg: "#0d0f10",
  surface: "#141618",
  border: "#2a2d30",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.08)",
  accentBorder: "rgba(232,160,32,0.3)",
};

// ── Main component ─────────────────────────────────────────────────────────

interface Tf {
  tx: number;
  ty: number;
  scale: number;
}

export function DxfViewer({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<IEntity[]>([]);
  const [allLayers, setAllLayers] = useState<string[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [tf, setTf] = useState<Tf>({ tx: 0, ty: 0, scale: 1 });

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // ── Load & parse ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const mod = await import("dxf-parser");
        // Handles both ESM default and CJS exports
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Parser = (mod as any).default ?? mod;
        const parsed = new Parser().parseSync(text);
        if (cancelled) return;

        const ents: IEntity[] = parsed?.entities ?? [];
        const layerSet = new Set(ents.map((e) => e.layer ?? "0"));
        const layerList = Array.from(layerSet).sort();
        setEntities(ents);
        setAllLayers(layerList);
        setVisibleLayers(new Set(layerList));
      } catch (err) {
        if (cancelled) return;
        console.error("DXF parse error:", err);
        setError("Could not render DXF — download file to view in CAD software");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // ── Fit to screen ─────────────────────────────────────────────────────────

  const fitToScreen = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || entities.length === 0) return;
    const bbox = computeBBox(entities, visibleLayers);
    if (!bbox || bbox.w === 0 || bbox.h === 0) return;
    const cw = svg.clientWidth;
    const ch = svg.clientHeight;
    const scale = Math.min(cw / bbox.w, ch / bbox.h) * 0.9;
    setTf({
      scale,
      tx: (cw - bbox.w * scale) / 2 - bbox.minX * scale,
      ty: (ch - bbox.h * scale) / 2 - bbox.minY * scale,
    });
  }, [entities, visibleLayers]);

  // Auto-fit once loaded
  useEffect(() => {
    if (!loading && entities.length > 0) {
      const t = setTimeout(fitToScreen, 50);
      return () => clearTimeout(t);
    }
  }, [loading, entities, fitToScreen]);

  // ── Keyboard (Esc) ────────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────

  const zoomAround = useCallback((factor: number, pivotX: number, pivotY: number) => {
    setTf((prev) => ({
      scale: prev.scale * factor,
      tx: pivotX - (pivotX - prev.tx) * factor,
      ty: pivotY - (pivotY - prev.ty) * factor,
    }));
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      zoomAround(factor, svg.clientWidth / 2, svg.clientHeight / 2);
    },
    [zoomAround],
  );

  // ── Scroll wheel ──────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect = svgRef.current!.getBoundingClientRect();
      zoomAround(factor, e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoomAround],
  );

  // ── Pan ───────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setTf((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // ── Layer toggle ──────────────────────────────────────────────────────────

  const toggleLayer = (layer: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Keep stroke 1 px on screen regardless of zoom
  const strokeWidth = 1 / tf.scale;
  const showLayers = allLayers.length > 1;

  const btnStyle: React.CSSProperties = {
    color: T.textDim,
    border: `1px solid ${T.border}`,
    backgroundColor: "transparent",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: T.bg }}>
      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
        style={{ backgroundColor: T.surface, borderBottom: `1px solid ${T.border}` }}
      >
        <span
          className="text-sm font-medium flex-1 truncate"
          style={{ color: T.text, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {name}
        </span>

        <button
          onClick={() => zoomCenter(1.25)}
          className="text-xs px-2.5 py-1 rounded hover:opacity-80"
          style={btnStyle}
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomCenter(1 / 1.25)}
          className="text-xs px-2.5 py-1 rounded hover:opacity-80"
          style={btnStyle}
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => setTf({ tx: 0, ty: 0, scale: 1 })}
          className="text-xs px-2.5 py-1 rounded hover:opacity-80"
          style={btnStyle}
          title="Reset zoom"
        >
          Reset
        </button>
        <button
          onClick={fitToScreen}
          className="text-xs px-2.5 py-1 rounded hover:opacity-80"
          style={btnStyle}
          title="Fit to screen"
        >
          Fit
        </button>

        <button
          onClick={onClose}
          className="text-sm px-2.5 py-1 rounded hover:opacity-80 ml-2"
          style={{ color: T.text, border: `1px solid ${T.border}` }}
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* SVG canvas */}
        <div className="relative flex-1 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm" style={{ color: T.textMuted }}>
                Loading DXF…
              </span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm max-w-sm" style={{ color: T.textDim }}>
                {error}
              </p>
              <a
                href={url}
                download
                className="text-xs px-3 py-1.5 rounded hover:opacity-80"
                style={{
                  color: T.accent,
                  border: `1px solid ${T.accentBorder}`,
                  backgroundColor: T.accentDim,
                }}
              >
                Download File
              </a>
            </div>
          )}

          {!loading && !error && (
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{
                cursor: dragging.current ? "grabbing" : "grab",
                display: "block",
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${tf.tx}, ${tf.ty}) scale(${tf.scale})`}>
                {entities.map((e, i) => {
                  if (!visibleLayers.has(e.layer ?? "0")) return null;
                  return renderEntity(e, `${e.type}-${i}`, strokeWidth);
                })}
              </g>
            </svg>
          )}
        </div>

        {/* Layer panel — only when multiple layers present */}
        {showLayers && !loading && !error && (
          <div
            className="flex-shrink-0 w-36 overflow-y-auto"
            style={{ backgroundColor: T.surface, borderLeft: `1px solid ${T.border}` }}
          >
            <div
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: T.textMuted, borderBottom: `1px solid ${T.border}` }}
            >
              Layers
            </div>
            <div className="py-1">
              {allLayers.map((layer) => (
                <label
                  key={layer}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={visibleLayers.has(layer)}
                    onChange={() => toggleLayer(layer)}
                    style={{ accentColor: T.accent }}
                  />
                  <span
                    className="text-xs truncate"
                    style={{
                      color: visibleLayers.has(layer) ? T.textDim : T.textMuted,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {layer}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
