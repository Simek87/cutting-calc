"use client";

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;

  status: string;
  onStatus: (v: string) => void;
  statusOptions: { value: string; label: string }[];

  supplier?: string;
  onSupplier?: (v: string) => void;
  supplierOptions?: string[];
  supplierLabel?: string;

  overdueOnly: boolean;
  onOverdueOnly: (v: boolean) => void;

  onReset: () => void;
  isFiltered: boolean;
}

export function FilterBar({
  search, onSearch, searchPlaceholder = "Search...",
  status, onStatus, statusOptions,
  supplier, onSupplier, supplierOptions, supplierLabel = "All suppliers",
  overdueOnly, onOverdueOnly,
  onReset, isFiltered,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="border rounded px-3 py-1.5 text-sm flex-1 min-w-40"
      />
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="border rounded px-2 py-1.5 text-sm bg-white"
      >
        <option value="">All statuses</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {supplierOptions && supplierOptions.length > 1 && onSupplier !== undefined && (
        <select
          value={supplier ?? ""}
          onChange={(e) => onSupplier(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm bg-white"
        >
          <option value="">{supplierLabel}</option>
          {supplierOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-1.5 text-sm text-gray-600 border rounded px-2 py-1.5 cursor-pointer select-none bg-white">
        <input
          type="checkbox"
          checked={overdueOnly}
          onChange={(e) => onOverdueOnly(e.target.checked)}
        />
        Overdue only
      </label>
      {isFiltered && (
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-700 border rounded px-2 py-1.5 bg-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}
