"use client";

import { useState } from "react";
import { Part, Section } from "@/lib/types";

interface LaserEmailModalProps {
  toolName: string;
  parts: Part[];
  sections: Section[];
  onClose: () => void;
}

export function LaserEmailModal({ toolName, parts, sections, onClose }: LaserEmailModalProps) {
  const laserParts = parts.filter((p) => p.requiresLaser);
  const [selected, setSelected] = useState<Set<string>>(new Set(laserParts.map((p) => p.id)));
  const [supplier, setSupplier] = useState("");

  const selectedParts = laserParts.filter((p) => selected.has(p.id));

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return null;
    return sections.find((s) => s.id === sectionId)?.name ?? null;
  };

  const sectionNames = [...new Set(selectedParts.map((p) => getSectionName(p.sectionId)).filter(Boolean))];
  const sectionLabel = sectionNames.length === 1 ? sectionNames[0] : sectionNames.join(", ") || "";

  const subject = `Laser parts request – ${toolName}${sectionLabel ? ` – ${sectionLabel}` : ""}`;

  const bodyLines: string[] = [];
  bodyLines.push(`Dear ${supplier || "[Supplier]"},`);
  bodyLines.push("");
  bodyLines.push(`Please find below the laser cutting request for tool: ${toolName}`);
  if (sectionLabel) bodyLines.push(`Section(s): ${sectionLabel}`);
  bodyLines.push("");
  bodyLines.push("Parts:");
  bodyLines.push("");

  selectedParts.forEach((p, i) => {
    const sec = getSectionName(p.sectionId);
    const dxfFiles = (p.attachments ?? []).filter((a) => a.type === "DXF").map((a) => a.name);
    bodyLines.push(`${i + 1}. ${p.name}`);
    if (sec) bodyLines.push(`   Section: ${sec}`);
    bodyLines.push(`   Qty: ${p.quantity}`);
    if (p.material) bodyLines.push(`   Material: ${p.material}`);
    if (p.thickness) bodyLines.push(`   Thickness: ${p.thickness}`);
    if (p.drawingRef) bodyLines.push(`   Drawing ref: ${p.drawingRef}`);
    if (dxfFiles.length > 0) bodyLines.push(`   DXF files: ${dxfFiles.join(", ")}`);
    bodyLines.push("");
  });

  bodyLines.push("Please see attached DXF files.");
  bodyLines.push("");
  bodyLines.push("Kind regards");

  const body = bodyLines.join("\n");

  const copyText = (text: string) => navigator.clipboard.writeText(text);

  const togglePart = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Compose Laser Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {laserParts.length === 0 && (
            <p className="text-sm text-gray-500">No parts marked as requiring laser. Enable "Requires Laser" on parts first.</p>
          )}

          {laserParts.length > 0 && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Supplier / Company</label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. LaserCut Sp. z o.o."
                  className="border rounded px-2 py-1.5 text-sm w-full max-w-xs"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Select Parts</p>
                <div className="space-y-1">
                  {laserParts.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => togglePart(p.id)}
                        className="rounded"
                      />
                      <span>{p.name}</span>
                      {p.material && <span className="text-xs text-gray-400">{p.material}</span>}
                      {p.thickness && <span className="text-xs text-gray-400">t={p.thickness}</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500 uppercase tracking-wider font-medium">Subject</label>
                  <button
                    onClick={() => copyText(subject)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Copy Subject
                  </button>
                </div>
                <div className="bg-gray-50 border rounded px-3 py-2 text-sm font-mono break-all">
                  {subject}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500 uppercase tracking-wider font-medium">Body</label>
                  <button
                    onClick={() => copyText(body)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Copy Body
                  </button>
                </div>
                <pre className="bg-gray-50 border rounded px-3 py-2 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {body}
                </pre>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end">
          <button onClick={onClose} className="text-sm border rounded px-4 py-1.5 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
