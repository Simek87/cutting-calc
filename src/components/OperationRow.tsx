"use client";

import { Operation, OperationStatus, OPERATION_STATUS_COLORS, STATUS_OPTIONS_BY_TYPE, isOpEffectivelyComplete } from "@/lib/types";

interface OperationRowProps {
  operation: Operation;
  index: number;
  allOperations: Operation[];
  onUpdated: (op: Operation) => void;
  onDeleted: (id: string) => void;
}


export function OperationRow({
  operation,
  index,
  allOperations,
  onUpdated,
  onDeleted,
}: OperationRowProps) {
  const prevOp = allOperations[index - 1];
  const isLocked = prevOp && !isOpEffectivelyComplete(prevOp);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isLocked) return;
    const status = e.target.value as OperationStatus;
    const updated = { ...operation, status };
    onUpdated(updated);
    await fetch(`/api/operations/${operation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const handleCheckbox = async () => {
    if (isLocked) return;
    const isDone = isOpEffectivelyComplete(operation);
    const status: OperationStatus = isDone ? "NotStarted" : "Done";
    onUpdated({ ...operation, status });
    await fetch(`/api/operations/${operation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const isInternal = operation.type !== "procurement" && operation.type !== "outsource";

  const handleDelete = async () => {
    if (!confirm(`Delete operation "${operation.name}"?`)) return;
    await fetch(`/api/operations/${operation.id}`, { method: "DELETE" });
    onDeleted(operation.id);
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded text-sm border ${
        isLocked
          ? "bg-gray-100 border-gray-200 opacity-60"
          : "bg-white border-gray-200"
      }`}
    >
      <span className="text-gray-400 font-mono text-xs w-5 shrink-0">
        {operation.order}.
      </span>

      <div className="flex-1 min-w-0">
        <span className="text-gray-800 text-sm">{operation.name}</span>
        <div className="flex items-center gap-2 mt-0.5">
          {operation.machine && (
            <span className="text-xs text-gray-400">🖥 {operation.machine}</span>
          )}
          {operation.supplier && (
            <span className="text-xs text-gray-400">🏭 {operation.supplier}</span>
          )}
          {operation.estimatedTime && (
            <span className="text-xs text-gray-400">⏱ {operation.estimatedTime}h</span>
          )}
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              operation.type === "outsource"
                ? "bg-purple-100 text-purple-600"
                : operation.type === "inspection"
                ? "bg-orange-100 text-orange-600"
                : operation.type === "assembly"
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {operation.type}
          </span>
        </div>
      </div>

      {isLocked ? (
        <span className="text-xs text-gray-400">🔒 locked</span>
      ) : isInternal ? (
        <input
          type="checkbox"
          checked={isOpEffectivelyComplete(operation)}
          onChange={handleCheckbox}
          className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
          title={isOpEffectivelyComplete(operation) ? "Done — click to undo" : "Mark done"}
        />
      ) : (
        <select
          value={operation.status}
          onChange={handleStatusChange}
          className={`text-xs px-2 py-1 rounded border cursor-pointer ${
            OPERATION_STATUS_COLORS[operation.status]
          } border-current`}
        >
          {STATUS_OPTIONS_BY_TYPE[operation.type].map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleDelete}
        className="text-gray-300 hover:text-red-500 text-xs shrink-0"
        title="Delete operation"
      >
        ✕
      </button>
    </div>
  );
}
