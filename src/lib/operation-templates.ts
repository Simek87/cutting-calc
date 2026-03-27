import type { OperationType } from "./types";

export interface TemplateOperation {
  name: string;
  type: OperationType;
  order: number;
  dependsOnPrevious?: boolean; // default true if omitted
}

export interface OperationTemplate {
  id: string;
  label: string;
  operations: TemplateOperation[];
}

export const OPERATION_TEMPLATES: OperationTemplate[] = [
  {
    id: "none",
    label: "No operations",
    operations: [],
  },
  {
    id: "standard",
    label: "Standard Part",
    operations: [
      { name: "Order material", type: "procurement", order: 1 },
      { name: "CAM",            type: "internal",    order: 2, dependsOnPrevious: false },
      { name: "Milling",        type: "internal",    order: 3 },
      { name: "Assembly",       type: "assembly",    order: 4 },
      { name: "Inspection",     type: "inspection",  order: 5 },
    ],
  },
  {
    id: "milled",
    label: "Milled Part",
    operations: [
      { name: "CAM",        type: "internal",   order: 1 },
      { name: "Mill",       type: "internal",   order: 2 },
      { name: "Gundrill",   type: "internal",   order: 3 },
      { name: "Finish",     type: "internal",   order: 4 },
      { name: "Inspection", type: "inspection", order: 5 },
      { name: "Assembly",   type: "assembly",   order: 6 },
    ],
  },
  {
    id: "laser",
    label: "Laser Part",
    operations: [
      { name: "Order material", type: "procurement", order: 1 },
      { name: "Laser cutting",  type: "outsource",   order: 2 },
      { name: "Deburr",         type: "internal",    order: 3 },
      { name: "Inspection",     type: "inspection",  order: 4 },
      { name: "Assembly",       type: "assembly",    order: 5 },
    ],
  },
  {
    id: "outsourced",
    label: "Outsourced Part",
    operations: [
      { name: "Send to supplier", type: "outsource",   order: 1 },
      { name: "Inspection",       type: "inspection",  order: 2 },
      { name: "Assembly",         type: "assembly",    order: 3 },
    ],
  },
];
