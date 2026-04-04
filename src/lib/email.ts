// ── Email generation utilities ─────────────────────────────────────────────

export interface EmailSupplier {
  id: string;
  name: string;
  email: string;
  category: string;
}

export interface MaterialPart {
  partId: string;   // part name / part ID string e.g. AFS700-MLD-FRAME
  toolName: string; // project name used as tool identifier, e.g. AFS700
  material: string | null;
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  materialType: string | null;
}

export interface ExternalOpData {
  partId: string;
  toolName: string; // project name used as tool identifier
  operationNotes?: string | null;
  supplierEmail?: string;
}

export type EmailType = "material" | "gundrilling" | "laser" | "waterjet";

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcOrderDims(p: {
  dimX: number | null;
  dimY: number | null;
  dimZ: number | null;
  materialType: string | null;
}) {
  const isRaw = p.materialType === "RawStock";
  return {
    x: p.dimX != null ? +(p.dimX + 2.5).toFixed(1) : null,
    y: p.dimY != null ? +(p.dimY + 2.5).toFixed(1) : null,
    z: p.dimZ != null ? (isRaw ? +(p.dimZ + 2.5).toFixed(1) : p.dimZ) : null,
  };
}

function dimsStr(od: { x: number | null; y: number | null; z: number | null }): string {
  return [od.x, od.y, od.z].map((v) => (v != null ? String(v) : "?")).join(" x ") + " mm";
}

/** Generate a mailto: link for batch material orders (multiple tools/parts). */
export function generateMaterialOrderMailto(
  parts: MaterialPart[],
  supplierEmail = ""
): string {
  const tools = [...new Set(parts.map((p) => p.toolName))];
  const subjectTool = tools.length === 1 ? tools[0] : "Multiple Tools";
  const subject = `Material Request — ${subjectTool} — ${today()}`;

  // Group by tool name
  const grouped: Record<string, MaterialPart[]> = {};
  parts.forEach((p) => {
    (grouped[p.toolName] ??= []).push(p);
  });

  const bodyBlocks = Object.entries(grouped).map(([tool, ps]) => {
    const lines = ps
      .map((p) => {
        const od = calcOrderDims(p);
        return `  ${p.partId} — ${p.material ?? "?"} — ${dimsStr(od)}`;
      })
      .join("\n");
    return `Tool: ${tool}\n\n${lines}`;
  });

  const body =
    `Please supply the following materials:\n\n` +
    bodyBlocks.join("\n\n") +
    `\n\nRegards,\nMA — Enviropax`;

  return `mailto:${encodeURIComponent(supplierEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Generate a mailto: link for a single external operation. */
export function generateExternalOpMailto(
  type: Exclude<EmailType, "material">,
  data: ExternalOpData
): string {
  const { partId, toolName, operationNotes, supplierEmail = "" } = data;
  const notes = operationNotes ? `\nNotes: ${operationNotes}` : "";
  const sig = `\n\nRegards,\nMA — Enviropax`;

  let subject: string;
  let body: string;

  if (type === "gundrilling") {
    subject = `Gundrilling Request — ${partId} — ${today()}`;
    body = `Please find attached drawing for gundrilling.\n\nPart: ${partId}\nTool: ${toolName}${notes}${sig}`;
  } else if (type === "laser") {
    subject = `Laser Cutting Request — ${partId} — ${today()}`;
    body = `Please find attached DXF for laser cutting.\n\nPart: ${partId}\nTool: ${toolName}${notes}${sig}`;
  } else {
    subject = `Water Jet Request — ${partId} — ${today()}`;
    body = `Please find attached DXF for water jet cutting.\n\nPart: ${partId}\nTool: ${toolName}${notes}${sig}`;
  }

  return `mailto:${encodeURIComponent(supplierEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Detect email type for outsource operations from operation name. */
export function inferOutsourceEmailType(
  opName: string
): Exclude<EmailType, "material"> {
  const l = opName.toLowerCase();
  if (l.includes("gundr") || l.includes("drill")) return "gundrilling";
  if (l.includes("laser")) return "laser";
  if (l.includes("water") || l.includes("jet")) return "waterjet";
  return "gundrilling";
}

/** Find the first supplier matching a category. */
export function findSupplierByCategory(
  suppliers: EmailSupplier[],
  category: string
): EmailSupplier | undefined {
  return suppliers.find((s) => s.category === category);
}
