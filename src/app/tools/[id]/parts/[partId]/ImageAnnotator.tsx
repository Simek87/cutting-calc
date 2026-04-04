"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "arrow" | "rect" | "text" | "crop";

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string | null;
  operationId: string | null;
}

interface Props {
  imageUrl: string;
  imageName: string;
  partId: string;
  onSave: (attachment: Attachment) => void;
  onClose: () => void;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const T = {
  bg: "#0d0f10",
  surface: "#141618",
  border: "#2a2d30",
  text: "#e2e4e6",
  textDim: "#8b9196",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.08)",
  accentBorder: "rgba(232,160,32,0.3)",
};
const ACCENT = "#e8a020";

// ── Component ──────────────────────────────────────────────────────────────

export function ImageAnnotator({ imageUrl, imageName, partId, onSave, onClose }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);

  const [tool, setTool] = useState<Tool>("select");
  const toolRef = useRef<Tool>("select");
  const [saving, setSaving] = useState(false);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  const [cropReady, setCropReady] = useState(false);

  // Drawing state (refs to avoid stale closures in fabric event handlers)
  const isDrawing = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewObjs = useRef<any[]>([]);

  // Undo / redo stacks
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  // ── Serialise canvas objects for undo/redo ────────────────────────────────

  const saveState = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const state = JSON.stringify(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.getObjects().map((o: any) => o.toObject()),
    );
    undoStack.current = [...undoStack.current.slice(-19), state];
    redoStack.current = [];
    setUndoLen(undoStack.current.length);
    setRedoLen(0);
  }, []);

  // ── Restore canvas objects ────────────────────────────────────────────────

  const restoreState = useCallback(async (state: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { util } = await import("fabric");
    const objs = canvas.getObjects();
    if (objs.length > 0) canvas.remove(...objs);
    const parsed = JSON.parse(state);
    if (parsed.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const revived = await (util as any).enlivenObjects(parsed);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      revived.forEach((o: any) => canvas.add(o));
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  // ── Init Fabric canvas ────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasElRef.current) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let canvas: any = null;

    (async () => {
      const fab = await import("fabric");
      if (cancelled) return;

      const { Canvas, FabricImage, Rect, Line, Triangle, Group, IText } = fab;

      const container = canvasElRef.current!.parentElement!;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight - 48; // minus toolbar

      canvas = new Canvas(canvasElRef.current!, {
        width: w,
        height: h,
        selection: true,
        defaultCursor: "default",
      });
      fabricRef.current = canvas;

      // ── Load background image ──────────────────────────────────────────────

      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        if (cancelled) return;
        const scale =
          Math.min(w / (img.width ?? 1), h / (img.height ?? 1)) * 0.95;
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (w - (img.width ?? 0) * scale) / 2,
          top: (h - (img.height ?? 0) * scale) / 2,
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = img;
        canvas.requestRenderAll();
      } catch {
        /* image load failed — annotate on blank canvas */
      }

      saveState(); // initial empty state for undo baseline

      // ── Mouse: down ────────────────────────────────────────────────────────

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on("mouse:down", (opt: any) => {
        const t = toolRef.current;
        if (t === "select") return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ptr = (opt as any).scenePoint ?? (opt as any).absolutePointer ?? (opt as any).pointer;
        if (!ptr) return;

        if (t === "text") {
          const text = new IText("Text", {
            left: ptr.x,
            top: ptr.y,
            fontSize: 14,
            fill: ACCENT,
            backgroundColor: "rgba(0,0,0,0.65)",
            padding: 4,
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
          canvas.requestRenderAll();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          text.once("editing:exited", () => {
            if (!text.text?.trim()) {
              canvas.remove(text);
            }
            saveState();
          });
          return;
        }

        isDrawing.current = true;
        startPt.current = { x: ptr.x, y: ptr.y };
      });

      // ── Mouse: move ────────────────────────────────────────────────────────

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on("mouse:move", (opt: any) => {
        if (!isDrawing.current) return;
        const t = toolRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ptr = (opt as any).scenePoint ?? (opt as any).absolutePointer ?? (opt as any).pointer;
        if (!ptr) return;
        const start = startPt.current;

        // Remove previous preview
        if (previewObjs.current.length > 0) {
          canvas.remove(...previewObjs.current);
          previewObjs.current = [];
        }

        if (t === "rect" || t === "crop") {
          const r = new Rect({
            left: Math.min(ptr.x, start.x),
            top: Math.min(ptr.y, start.y),
            width: Math.abs(ptr.x - start.x),
            height: Math.abs(ptr.y - start.y),
            stroke: ACCENT,
            strokeWidth: 2,
            fill: "transparent",
            strokeDashArray: t === "crop" ? [6, 4] : undefined,
            selectable: false,
            evented: false,
          });
          canvas.add(r);
          previewObjs.current = [r];
        }

        if (t === "arrow") {
          const line = new Line([start.x, start.y, ptr.x, ptr.y], {
            stroke: ACCENT,
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          canvas.add(line);
          previewObjs.current = [line];
        }

        canvas.requestRenderAll();
      });

      // ── Mouse: up ──────────────────────────────────────────────────────────

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on("mouse:up", (opt: any) => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        const t = toolRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ptr = (opt as any).scenePoint ?? (opt as any).absolutePointer ?? (opt as any).pointer;
        if (!ptr) return;
        const start = startPt.current;

        // ── Finalise rect ────────────────────────────────────────────────────

        if (t === "rect") {
          const preview = previewObjs.current[0];
          previewObjs.current = [];
          if (!preview) return;

          const w = Math.abs(ptr.x - start.x);
          const h = Math.abs(ptr.y - start.y);
          if (w < 4 || h < 4) {
            canvas.remove(preview);
          } else {
            // Make the finalised rect selectable
            preview.set({ selectable: true, evented: true });
            canvas.setActiveObject(preview);
          }
          saveState();
          canvas.requestRenderAll();
          return;
        }

        // ── Finalise crop rect ───────────────────────────────────────────────

        if (t === "crop") {
          const preview = previewObjs.current[0];
          if (!preview) return;

          const w = Math.abs(ptr.x - start.x);
          const h = Math.abs(ptr.y - start.y);
          if (w < 10 || h < 10) {
            canvas.remove(preview);
            previewObjs.current = [];
            setCropReady(false);
          } else {
            // Keep in previewObjs for applyCrop; don't save state yet
            setCropReady(true);
          }
          canvas.requestRenderAll();
          return;
        }

        // ── Finalise arrow ───────────────────────────────────────────────────

        if (t === "arrow") {
          // Remove preview line
          if (previewObjs.current.length > 0) {
            canvas.remove(...previewObjs.current);
            previewObjs.current = [];
          }

          const dx = ptr.x - start.x;
          const dy = ptr.y - start.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          if (len < 6) {
            saveState();
            return;
          }

          const arrowSize = 14;
          const nx = dx / len;
          const ny = dy / len;

          // Shorten line so it doesn't overlap the arrowhead
          const lineEndX = ptr.x - nx * arrowSize * 0.65;
          const lineEndY = ptr.y - ny * arrowSize * 0.65;

          const line = new Line([start.x, start.y, lineEndX, lineEndY], {
            stroke: ACCENT,
            strokeWidth: 2,
          });

          const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          const tri = new Triangle({
            left: ptr.x,
            top: ptr.y,
            width: arrowSize,
            height: arrowSize,
            fill: ACCENT,
            stroke: ACCENT,
            angle: angleDeg,
            originX: "center",
            originY: "center",
          });

          const group = new Group([line, tri]);
          canvas.add(group);
          saveState();
          canvas.requestRenderAll();
          return;
        }
      });

      // ── Delete key ─────────────────────────────────────────────────────────

      const handleKey = (e: KeyboardEvent) => {
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        const active = canvas.getActiveObject();
        // Don't delete while a text field is in editing mode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!active || (active as any).isEditing) return;
        canvas.remove(active);
        canvas.discardActiveObject();
        saveState();
        canvas.requestRenderAll();
      };
      window.addEventListener("keydown", handleKey);
      // Store for cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (canvas as any).__keyHandler = handleKey;
    })();

    return () => {
      cancelled = true;
      const kh = canvas?.__keyHandler;
      if (kh) window.removeEventListener("keydown", kh);
      canvas?.dispose();
      fabricRef.current = null;
    };
    // saveState is stable (no deps that change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // ── Sync tool ref + update canvas interaction mode ────────────────────────

  useEffect(() => {
    toolRef.current = tool;
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Cancel any in-progress drawing
    if (previewObjs.current.length > 0) {
      canvas.remove(...previewObjs.current);
      previewObjs.current = [];
    }
    isDrawing.current = false;

    // Only show crop-apply button when still in crop mode with a rect drawn
    if (tool !== "crop") {
      setCropReady(false);
    }

    canvas.selection = tool === "select";
    if (tool !== "select") canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [tool]);

  // ── Undo ──────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (undoStack.current.length <= 1) return;
    const cur = undoStack.current.pop()!;
    redoStack.current = [...redoStack.current, cur];
    setUndoLen(undoStack.current.length);
    setRedoLen(redoStack.current.length);
    await restoreState(undoStack.current[undoStack.current.length - 1]);
  }, [restoreState]);

  // ── Redo ──────────────────────────────────────────────────────────────────

  const handleRedo = useCallback(async () => {
    if (redoStack.current.length === 0) return;
    const state = redoStack.current.pop()!;
    undoStack.current = [...undoStack.current, state];
    setUndoLen(undoStack.current.length);
    setRedoLen(redoStack.current.length);
    await restoreState(state);
  }, [restoreState]);

  // ── Clear all annotations ─────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (objs.length > 0) canvas.remove(...objs);
    previewObjs.current = [];
    isDrawing.current = false;
    setCropReady(false);
    saveState();
    canvas.requestRenderAll();
  }, [saveState]);

  // ── Apply crop ────────────────────────────────────────────────────────────

  const handleApplyCrop = useCallback(async () => {
    const canvas = fabricRef.current;
    const cropRect = previewObjs.current[0];
    if (!canvas || !cropRect) return;

    const { FabricImage } = await import("fabric");

    const cx = cropRect.left ?? 0;
    const cy = cropRect.top ?? 0;
    const cw = cropRect.width ?? 0;
    const ch = cropRect.height ?? 0;
    if (cw < 10 || ch < 10) return;

    // Export the crop region including background + annotations
    const dataUrl = canvas.toDataURL({
      left: cx,
      top: cy,
      width: cw,
      height: ch,
      format: "png",
      multiplier: 1,
    });

    // Remove crop rect + all annotations (crop is destructive)
    canvas.remove(cropRect);
    previewObjs.current = [];
    const objs = canvas.getObjects();
    if (objs.length > 0) canvas.remove(...objs);

    // Load the cropped region as the new background
    const img = await FabricImage.fromURL(dataUrl);
    const w = canvas.width ?? cw;
    const h = canvas.height ?? ch;
    const scale = Math.min(w / (img.width ?? 1), h / (img.height ?? 1)) * 0.95;
    img.set({
      scaleX: scale,
      scaleY: scale,
      left: (w - (img.width ?? 0) * scale) / 2,
      top: (h - (img.height ?? 0) * scale) / 2,
      selectable: false,
      evented: false,
    });
    canvas.backgroundImage = img;
    setCropReady(false);
    saveState();
    canvas.requestRenderAll();
  }, [saveState]);

  // ── Save (export PNG → upload → callback) ─────────────────────────────────

  const handleSave = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob: Blob | null = await canvas.toBlob({ format: "png", multiplier: 1 });
      if (!blob) throw new Error("toBlob returned null");

      const baseName = imageName.replace(/\.[^.]+$/, "");
      const fileName = `${baseName}-annotated.png`;

      const fd = new FormData();
      fd.append("file", blob, fileName);
      fd.append("partId", partId);

      const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const att: Attachment = await res.json();
      onSave(att);
    } catch (err) {
      console.error("Annotation save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [imageName, partId, onSave]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Don't trigger shortcuts while an IText is being edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((fabricRef.current?.getActiveObject() as any)?.isEditing) return;

      if (e.key === "Escape") { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, handleUndo, handleRedo]);

  // ── Render ────────────────────────────────────────────────────────────────

  const TOOLS: { id: Tool; label: string }[] = [
    { id: "select", label: "Select" },
    { id: "arrow", label: "Arrow" },
    { id: "rect", label: "Rectangle" },
    { id: "text", label: "Text" },
    { id: "crop", label: "Crop" },
  ];

  const btnBase: React.CSSProperties = { color: T.textDim, border: `1px solid ${T.border}` };
  const btnActive: React.CSSProperties = { color: "#000", backgroundColor: T.accent, fontWeight: 600 };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: T.bg }}>
      {/* ── Top toolbar ── */}
      <div
        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 flex-wrap"
        style={{ backgroundColor: T.surface, borderBottom: `1px solid ${T.border}` }}
      >
        {/* Tool selector buttons */}
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className="text-xs px-3 py-1.5 rounded transition-colors hover:opacity-90"
            style={tool === t.id ? btnActive : btnBase}
          >
            {t.label}
          </button>
        ))}

        {/* Apply Crop — only visible when crop rect is drawn */}
        {tool === "crop" && cropReady && (
          <button
            onClick={handleApplyCrop}
            className="text-xs px-3 py-1.5 rounded hover:opacity-80"
            style={{ color: T.accent, border: `1px solid ${T.accentBorder}`, backgroundColor: T.accentDim }}
          >
            Apply Crop
          </button>
        )}

        {/* Separator */}
        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: T.border }} />

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={undoLen <= 1}
          className="text-xs px-2.5 py-1.5 rounded disabled:opacity-30 hover:opacity-80"
          style={btnBase}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={redoLen === 0}
          className="text-xs px-2.5 py-1.5 rounded disabled:opacity-30 hover:opacity-80"
          style={btnBase}
          title="Redo (Ctrl+Y)"
        >
          ↪ Redo
        </button>
        <button
          onClick={handleClearAll}
          className="text-xs px-2.5 py-1.5 rounded hover:opacity-80"
          style={{ color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Clear All
        </button>

        <div className="flex-1" />

        {/* Cancel / Save */}
        <button
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded hover:opacity-80"
          style={btnBase}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-4 py-1.5 rounded disabled:opacity-50 hover:opacity-90"
          style={{ color: "#000", backgroundColor: T.accent, fontWeight: 600 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ── Canvas container ── */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: T.bg }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
