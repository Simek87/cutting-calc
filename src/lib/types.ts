export type ToolStatus =
  | "Management"
  | "CAD"
  | "CAM"
  | "Manufacturing"
  | "Toolmaking"
  | "Done"
  | "Cancelled";

export const FIXED_SECTIONS = ["MLD", "PLG", "CUT", "AVL", "PBX"] as const;

export const SECTION_FULL_NAMES: Record<string, string> = {
  MLD: "Moulding",
  PLG: "Plug Assist",
  CUT: "Cutter",
  AVL: "Anvil",
  PBX: "Pressure Box",
};

export interface Supplier {
  id: string;
  name: string;
  email: string;
  notes: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  createdAt: string;
}

export type PartStatus =
  | "NotOrdered"
  | "Ordered"
  | "InProgress"
  | "Ready"
  | "Installed";

export type PartType = "standard" | "custom" | "outsource";

export type OperationStatus =
  | "NotStarted"
  | "Ready"
  | "InProgress"
  | "Sent"
  | "Done"
  | "Blocked"
  | "NotOrdered"
  | "Ordered"
  | "Received"
  | "Pending";

export type OperationType = "procurement" | "internal" | "outsource" | "inspection" | "assembly";

export interface LinkedOrderInfo {
  id: string;
  supplier: string;
  status: OrderStatus;
  eta: string | null;
  poNumber: string | null;
}

export interface LinkedJobInfo {
  id: string;
  company: string;
  status: OutsourceStatus;
  eta: string | null;
}

export interface Operation {
  id: string;
  partId: string;
  name: string;
  order: number;
  type: OperationType;
  status: OperationStatus;
  dependsOnPrevious: boolean;
  machine: string | null;
  supplier: string | null;
  estimatedTime: number | null;
  actualTime: number | null;
  createdAt: string;
  orderId: string | null;
  outsourceJobId: string | null;
  linkedOrder?: LinkedOrderInfo | null;
  linkedJob?: LinkedJobInfo | null;
}

export interface Attachment {
  id: string;
  name: string;
  type: "DXF" | "PDF" | "STEP";
  filePath: string | null;
  url: string | null;
  partId: string | null;
  toolGroupId: string | null;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  toolId: string;
}

export interface ToolGroup {
  id: string;
  name: string;
  notes: string | null;
}

export interface Part {
  id: string;
  toolId: string;
  sectionId: string | null;
  name: string;
  type: PartType;
  quantity: number;
  /** @deprecated Legacy field. Not derived from operations and not shown in UI.
   *  Do not use in active logic. Schema retained for migration safety only. */
  status: PartStatus;
  supplier: string | null;
  notes: string | null;
  drawingRef: string | null;
  requiresLaser: boolean;
  isStandard: boolean;
  material: string | null;
  thickness: string | null;
  size: string | null;
  createdAt: string;
  operations: Operation[];
  outsourceJobs?: OutsourceJob[];
  attachments?: Attachment[];
}

export interface Tool {
  id: string;
  projectName: string;
  dueDate: string | null;
  status: ToolStatus;
  toolGroupId: string | null;
  toolGroup?: ToolGroup | null;
  createdAt: string;
  updatedAt: string;
  parts: Part[];
  sections?: Section[];
}

export const TOOL_STATUSES: ToolStatus[] = [
  "Management",
  "CAD",
  "CAM",
  "Manufacturing",
  "Toolmaking",
  "Done",
];

// Includes Cancelled for status selectors on tool detail page
export const ALL_TOOL_STATUSES: ToolStatus[] = [...TOOL_STATUSES, "Cancelled"];

export const STATUS_COLORS: Record<ToolStatus, string> = {
  Management: "bg-gray-100 text-gray-700 border-gray-300",
  CAD: "bg-blue-100 text-blue-700 border-blue-300",
  CAM: "bg-purple-100 text-purple-700 border-purple-300",
  Manufacturing: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Toolmaking: "bg-orange-100 text-orange-700 border-orange-300",
  Done: "bg-green-100 text-green-700 border-green-300",
  Cancelled: "bg-red-100 text-red-700 border-red-300",
};

export const OPERATION_STATUS_COLORS: Record<OperationStatus, string> = {
  // internal / generic
  NotStarted: "bg-gray-100 text-gray-600",
  Ready:      "bg-blue-100 text-blue-700",   // legacy
  InProgress: "bg-yellow-100 text-yellow-700",
  Sent:       "bg-purple-100 text-purple-700",
  Done:       "bg-green-100 text-green-700",
  Blocked:    "bg-red-100 text-red-700",
  // procurement
  NotOrdered: "bg-gray-100 text-gray-600",
  Ordered:    "bg-blue-100 text-blue-700",
  Received:   "bg-green-100 text-green-700",
  // outsource
  Pending:    "bg-gray-100 text-gray-600",
};

export const STATUS_OPTIONS_BY_TYPE: Record<OperationType, { value: OperationStatus; label: string }[]> = {
  internal: [
    { value: "NotStarted", label: "Not Started" },
    { value: "Done",       label: "Done" },
  ],
  procurement: [
    { value: "NotOrdered", label: "Not Ordered" },
    { value: "Ordered",    label: "Ordered" },
    { value: "Received",   label: "Received" },
  ],
  outsource: [
    { value: "Pending",    label: "Pending" },
    { value: "Sent",       label: "Sent" },
    { value: "InProgress", label: "In Progress" },
    { value: "Done",       label: "Done" },
  ],
  inspection: [
    { value: "NotStarted", label: "Not Started" },
    { value: "Done",       label: "Done" },
  ],
  assembly: [
    { value: "NotStarted", label: "Not Started" },
    { value: "Done",       label: "Done" },
  ],
};

// Minimal shape required by completion helpers — intentionally omits `eta`, `id`, and
// other fields that the completion logic never reads. This allows raw Prisma operation
// objects (where eta is Date | null) to be passed without conversion.
type OpCompletionInput = {
  status: OperationStatus;
  linkedOrder?: { status: OrderStatus } | null;
  linkedJob?: { status: OutsourceStatus } | null;
};

// Derive the real status for an operation that may be linked to an Order or OutsourceJob.
// Order takes priority because procurement ops are controlled by the linked order.
export function getEffectiveStatus(op: OpCompletionInput): OperationStatus {
  if (op.linkedOrder) {
    const s = op.linkedOrder.status;
    if (s === "Received") return "Received";
    if (s === "Sent")     return "Ordered";
    return "NotOrdered"; // Draft or Cancelled
  }
  if (op.linkedJob) {
    const s = op.linkedJob.status;
    if (s === "Cancelled") return "Pending";
    return s as OperationStatus;
  }
  return op.status;
}

export function isOperationComplete(op: Pick<OpCompletionInput, "status">): boolean {
  return op.status === "Done" || op.status === "Received";
}

// Single source of truth for operation completion — works with both serialized (string eta)
// and raw Prisma (Date eta) operation objects. Use this everywhere; do not add local variants.
export function isOpEffectivelyComplete(op: OpCompletionInput): boolean {
  return isOperationComplete({ status: getEffectiveStatus(op) });
}

export const OP_STATUS_LABELS: Record<OperationStatus, string> = {
  NotStarted: "Not Started",
  Ready:      "Ready",
  InProgress: "In Progress",
  Sent:       "Sent",
  Done:       "Done",
  Blocked:    "Blocked",
  NotOrdered: "Not Ordered",
  Ordered:    "Ordered",
  Received:   "Received",
  Pending:    "Pending",
};

/** @deprecated Part.status is legacy; this map is retained only for completeness. Do not use. */
export const PART_STATUS_COLORS: Record<PartStatus, string> = {
  NotOrdered: "bg-gray-100 text-gray-600",
  Ordered: "bg-blue-100 text-blue-700",
  InProgress: "bg-yellow-100 text-yellow-700",
  Ready: "bg-green-100 text-green-700",
  Installed: "bg-emerald-100 text-emerald-700",
};

export type OrderStatus = "Draft" | "Sent" | "Received" | "Cancelled";

export interface OrderPartContext {
  id: string;
  name: string;
  tool: { id: string; projectName: string } | null;
  section: { id: string; name: string } | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  partId: string;
  qty: number;
  notes: string | null;
  part?: OrderPartContext | null;
}

export interface Order {
  id: string;
  supplier: string;
  supplierId: string | null;
  partId: string | null;
  part?: OrderPartContext | null;
  status: OrderStatus;
  eta: string | null;
  notes: string | null;
  poNumber: string | null;
  supplierQuoteRef: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export type OutsourceStatus = "Pending" | "Sent" | "InProgress" | "Done" | "Cancelled";

export interface OutsourceJob {
  id: string;
  partId: string;
  partName?: string;
  toolName?: string;
  toolId?: string;
  company: string;
  supplierId: string | null;
  status: OutsourceStatus;
  sentDate: string | null;
  eta: string | null;
  notes: string | null;
  externalJobRef: string | null;
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  Draft:     "bg-yellow-900/20 text-yellow-400 border border-yellow-600/30",
  Sent:      "bg-blue-900/20 text-blue-400 border border-blue-600/30",
  Received:  "bg-green-900/20 text-green-400 border border-green-600/30",
  Cancelled: "bg-[#1a1c1f] text-[#4e5560] border border-[#2a2d30]",
};

export const OUTSOURCE_STATUS_COLORS: Record<OutsourceStatus, string> = {
  Pending:    "bg-[#1a1c1f] text-[#8b9196] border border-[#2a2d30]",
  Sent:       "bg-blue-900/20 text-blue-400 border border-blue-600/30",
  InProgress: "bg-amber-900/20 text-amber-400 border border-amber-600/30",
  Done:       "bg-green-900/20 text-green-400 border border-green-600/30",
  Cancelled:  "bg-[#1a1c1f] text-[#4e5560] border border-[#2a2d30]",
};
