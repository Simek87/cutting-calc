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
  const inputCls = "bg-[#0d0f10] border border-[#2a2d30] text-[#e2e4e6] placeholder-[#4e5560] rounded px-3 py-1.5 text-sm outline-none focus:border-[#4e5560]";
  const selectCls = "bg-[#0d0f10] border border-[#2a2d30] text-[#8b9196] rounded px-2 py-1.5 text-sm outline-none focus:border-[#4e5560]";

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className={`${inputCls} flex-1 min-w-40`}
      />
      <select value={status} onChange={(e) => onStatus(e.target.value)} className={selectCls}>
        <option value="">All statuses</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {supplierOptions && supplierOptions.length > 1 && onSupplier !== undefined && (
        <select value={supplier ?? ""} onChange={(e) => onSupplier(e.target.value)} className={selectCls}>
          <option value="">{supplierLabel}</option>
          {supplierOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
      <label className={`flex items-center gap-1.5 text-sm text-[#8b9196] border border-[#2a2d30] rounded px-2 py-1.5 cursor-pointer select-none bg-[#0d0f10]`}>
        <input type="checkbox" checked={overdueOnly} onChange={(e) => onOverdueOnly(e.target.checked)} />
        Overdue only
      </label>
      {isFiltered && (
        <button
          onClick={onReset}
          className="text-sm text-[#4e5560] hover:text-[#8b9196] border border-[#2a2d30] rounded px-2 py-1.5 bg-[#0d0f10]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
