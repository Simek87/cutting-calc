// @react-pdf/renderer — server-side only (used from API routes)
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Register fonts ─────────────────────────────────────────────────────────
// Built-in PDF fonts — no embedding needed
// Helvetica = body, Courier = monospace IDs

// ── Types ──────────────────────────────────────────────────────────────────

export interface PdfOperation {
  order: number;
  name: string;
  type: string;
  status: string;
  changedBy: string | null;
  statusChangedAt: string | null;
  estimatedTime: number | null;
}

export interface PdfPart {
  id: string;
  name: string;
  material: string | null;
  materialType: string | null;
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  revModel: number;
  revProgram: number;
  revProgramNote: string | null;
  notes: string | null;
  operations: PdfOperation[];
  section: { name: string } | null;
}

export interface PdfTool {
  id: string;
  projectName: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function opNumber(order: number): string {
  return `OP${String(order * 10).padStart(2, "0")}`;
}

function calcOrderDims(p: PdfPart) {
  const isRaw = p.materialType === "RawStock";
  return {
    x: p.dimX != null ? +(p.dimX + 2.5).toFixed(1) : null,
    y: p.dimY != null ? +(p.dimY + 2.5).toFixed(1) : null,
    z: p.dimZ != null ? (isRaw ? +(p.dimZ + 2.5).toFixed(1) : p.dimZ) : null,
  };
}

function isDone(op: PdfOperation): boolean {
  return op.status === "Done" || op.status === "Received";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function printDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Styles ─────────────────────────────────────────────────────────────────

const AMBER = "#e8a020";
const DARK = "#1a1a1a";
const GRAY = "#555555";
const LIGHT_GRAY = "#f0f0f0";
const RULE_GRAY = "#cccccc";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 32,
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  headerBrand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: AMBER, letterSpacing: 1 },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GRAY, letterSpacing: 2 },
  headerLine: { height: 2, backgroundColor: AMBER, marginBottom: 10 },

  // Info rows
  infoRow: { flexDirection: "row", marginBottom: 6, gap: 16 },
  infoCell: { flex: 1 },
  infoLabel: { fontSize: 7, color: GRAY, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 10, color: DARK },
  infoValueMono: { fontSize: 10, color: AMBER, fontFamily: "Courier-Bold" },

  // Divider
  divider: { height: 0.5, backgroundColor: RULE_GRAY, marginVertical: 8 },

  // Operations table
  tableHeader: { flexDirection: "row", backgroundColor: LIGHT_GRAY, borderTopWidth: 0.5, borderTopColor: RULE_GRAY, borderBottomWidth: 0.5, borderBottomColor: RULE_GRAY, paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: RULE_GRAY, paddingVertical: 7, paddingHorizontal: 4, minHeight: 22 },
  tableRowAlt: { backgroundColor: "#fafafa" },

  // Column widths (% of usable width ~536pt for A4 - 64pt padding)
  colOp:      { width: 38 },
  colName:    { width: 150 },
  colStatus:  { width: 38 },
  colWho:     { width: 48 },
  colWhen:    { width: 62 },
  colEst:     { width: 40 },
  colActual:  { width: 50 },

  tableHeaderText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 },
  tableCell: { fontSize: 9, color: DARK },
  tableCellMono: { fontSize: 8, fontFamily: "Courier-Bold", color: AMBER },
  tableCellDone: { fontSize: 9, color: GRAY },
  tableCellBlankLine: { borderBottomWidth: 0.5, borderBottomColor: RULE_GRAY, height: 12, marginTop: 2 },

  // Notes
  notesSection: { marginTop: 12 },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  notesLine: { borderBottomWidth: 0.5, borderBottomColor: RULE_GRAY, height: 16, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: DARK, marginBottom: 8 },

  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },
});

// ── Single card component ──────────────────────────────────────────────────

function ProcessCardPage({
  part,
  tool,
  pageIndex,
  pageTotal,
}: {
  part: PdfPart;
  tool: PdfTool;
  pageIndex: number;
  pageTotal: number;
}) {
  const od = calcOrderDims(part);
  const hasMaterial = part.material || part.materialType || part.dimX || part.dimY || part.dimZ;

  return (
    <Page size="A4" style={S.page}>
      {/* ── Header ── */}
      <View style={S.header}>
        <Text style={S.headerBrand}>ENVIROPAX</Text>
        <Text style={S.headerTitle}>PROCESS CARD</Text>
      </View>
      <View style={S.headerLine} />

      {/* ── Part info row ── */}
      <View style={S.infoRow}>
        <View style={S.infoCell}>
          <Text style={S.infoLabel}>Project</Text>
          <Text style={[S.infoValue, { fontFamily: "Courier-Bold", color: DARK }]}>{tool.projectName}</Text>
        </View>
        <View style={[S.infoCell, { flex: 2 }]}>
          <Text style={S.infoLabel}>Part ID</Text>
          <Text style={S.infoValueMono}>{part.name}</Text>
        </View>
        {part.section && (
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>Section</Text>
            <Text style={S.infoValue}>{part.section.name}</Text>
          </View>
        )}
        <View style={S.infoCell}>
          <Text style={S.infoLabel}>Model Rev</Text>
          <Text style={S.infoValue}>M{String(part.revModel).padStart(2, "0")}</Text>
        </View>
        <View style={S.infoCell}>
          <Text style={S.infoLabel}>Prog Rev</Text>
          <Text style={S.infoValue}>R{String(part.revProgram).padStart(2, "0")}</Text>
        </View>
      </View>

      {/* ── Material row ── */}
      {hasMaterial && (
        <View style={[S.infoRow, { marginBottom: 4 }]}>
          {part.materialType && (
            <View style={S.infoCell}>
              <Text style={S.infoLabel}>Type</Text>
              <Text style={S.infoValue}>{part.materialType}</Text>
            </View>
          )}
          {part.material && (
            <View style={S.infoCell}>
              <Text style={S.infoLabel}>Grade</Text>
              <Text style={S.infoValue}>{part.material}</Text>
            </View>
          )}
          {(part.dimX || part.dimY || part.dimZ) && (
            <View style={[S.infoCell, { flex: 2 }]}>
              <Text style={S.infoLabel}>Finished (mm)</Text>
              <Text style={S.infoValue}>
                {part.dimX ?? "—"} × {part.dimY ?? "—"} × {part.dimZ ?? "—"}
              </Text>
            </View>
          )}
          {(od.x || od.y || od.z) && (
            <View style={[S.infoCell, { flex: 2 }]}>
              <Text style={S.infoLabel}>
                Order size ({part.materialType === "RawStock" ? "+2.5 X/Y/Z" : "+2.5 X/Y"})
              </Text>
              <Text style={[S.infoValue, { fontFamily: "Courier-Bold" }]}>
                {od.x ?? "—"} × {od.y ?? "—"} × {od.z ?? "—"} mm
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={S.divider} />

      {/* ── Operations table ── */}
      {/* Header */}
      <View style={S.tableHeader}>
        <View style={S.colOp}><Text style={S.tableHeaderText}>Op</Text></View>
        <View style={S.colName}><Text style={S.tableHeaderText}>Operation</Text></View>
        <View style={S.colStatus}><Text style={S.tableHeaderText}>Status</Text></View>
        <View style={S.colWho}><Text style={S.tableHeaderText}>Who</Text></View>
        <View style={S.colWhen}><Text style={S.tableHeaderText}>When</Text></View>
        <View style={S.colEst}><Text style={S.tableHeaderText}>Est.</Text></View>
        <View style={S.colActual}><Text style={S.tableHeaderText}>Actual</Text></View>
      </View>

      {/* Rows */}
      {part.operations.map((op, idx) => {
        const done = isDone(op);
        const isAlt = idx % 2 === 1;
        return (
          <View key={op.order} style={[S.tableRow, isAlt ? S.tableRowAlt : {}]} wrap={false}>
            {/* Op number */}
            <View style={S.colOp}>
              <Text style={S.tableCellMono}>{opNumber(op.order)}</Text>
            </View>

            {/* Operation name */}
            <View style={S.colName}>
              <Text style={done ? S.tableCellDone : S.tableCell}>{op.name}</Text>
            </View>

            {/* Status */}
            <View style={S.colStatus}>
              {done ? (
                <Text style={[S.tableCell, { color: "#22c55e", fontFamily: "Helvetica-Bold" }]}>✓</Text>
              ) : (
                <Text style={[S.tableCell, { color: RULE_GRAY }]}>□</Text>
              )}
            </View>

            {/* Who */}
            <View style={S.colWho}>
              {done && op.changedBy ? (
                <Text style={S.tableCellDone}>{op.changedBy}</Text>
              ) : (
                <View style={S.tableCellBlankLine} />
              )}
            </View>

            {/* When */}
            <View style={S.colWhen}>
              {done && op.statusChangedAt ? (
                <Text style={S.tableCellDone}>{fmtDate(op.statusChangedAt)}</Text>
              ) : (
                <View style={S.tableCellBlankLine} />
              )}
            </View>

            {/* Est. Time */}
            <View style={S.colEst}>
              {op.estimatedTime != null ? (
                <Text style={S.tableCellDone}>{op.estimatedTime}h</Text>
              ) : (
                <Text style={[S.tableCell, { color: RULE_GRAY }]}>—</Text>
              )}
            </View>

            {/* Actual Time — always blank */}
            <View style={S.colActual}>
              <View style={S.tableCellBlankLine} />
            </View>
          </View>
        );
      })}

      {part.operations.length === 0 && (
        <View style={[S.tableRow, { paddingVertical: 10 }]}>
          <Text style={[S.tableCell, { color: GRAY }]}>No operations defined.</Text>
        </View>
      )}

      {/* ── Notes ── */}
      <View style={S.notesSection}>
        <Text style={S.notesLabel}>Notes</Text>
        {part.notes ? (
          <Text style={S.notesText}>{part.notes}</Text>
        ) : null}
        {/* Blank lines for manual writing */}
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={S.notesLine} />
        ))}
      </View>

      {/* ── Footer ── */}
      <View style={S.footer} fixed>
        <Text style={S.footerText}>Enviropax — Haydock</Text>
        <Text style={S.footerText}>Printed: {printDate()}</Text>
        {pageTotal > 1 && (
          <Text style={S.footerText}>
            {pageIndex + 1} / {pageTotal}
          </Text>
        )}
      </View>
    </Page>
  );
}

// ── Exported document components ───────────────────────────────────────────

export function SinglePartDocument({
  part,
  tool,
}: {
  part: PdfPart;
  tool: PdfTool;
}) {
  return (
    <Document
      title={`Process Card — ${part.name}`}
      author="Enviropax"
      creator="Toolroom MES"
    >
      <ProcessCardPage part={part} tool={tool} pageIndex={0} pageTotal={1} />
    </Document>
  );
}

export function BatchDocument({
  parts,
  tool,
}: {
  parts: PdfPart[];
  tool: PdfTool;
}) {
  return (
    <Document
      title={`Process Cards — ${tool.projectName}`}
      author="Enviropax"
      creator="Toolroom MES"
    >
      {parts.map((part, idx) => (
        <ProcessCardPage
          key={part.id}
          part={part}
          tool={tool}
          pageIndex={idx}
          pageTotal={parts.length}
        />
      ))}
    </Document>
  );
}
