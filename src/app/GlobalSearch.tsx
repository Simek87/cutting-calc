"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchGroup, SearchResult } from "@/app/api/search/route";

// ── Theme ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d0f10",
  surface: "#141618",
  surface2: "#1a1d20",
  border: "#2a2d30",
  accent: "#e8a020",
  accentDim: "rgba(232,160,32,0.12)",
  accentBorder: "rgba(232,160,32,0.3)",
  text: "#e2e4e6",
  textDim: "#8b9196",
  textMuted: "#4e5560",
};

// ── Main component ─────────────────────────────────────────────────────────

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data: { groups: SearchGroup[] }) => {
          setGroups(data.groups);
          setSelectedIndex(0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Flat list for keyboard nav
  const flat = groups.flatMap((g) => g.results);

  const navigate = useCallback(
    (result: SearchResult) => {
      if (result.openInNewTab) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        router.push(result.url);
      }
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation (bubble phase, inside modal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = flat[selectedIndex];
        if (r) navigate(r);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flat, selectedIndex, navigate, onClose]);

  const hasResults = groups.some((g) => g.results.length > 0);
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  // Track flat index across group render
  let flatCursor = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", paddingTop: "10vh" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full rounded-xl overflow-hidden shadow-2xl"
        style={{
          maxWidth: 560,
          backgroundColor: C.surface,
          border: `2px solid ${C.accent}`,
        }}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: hasResults || showEmpty ? `1px solid ${C.border}` : "none",
          }}
        >
          <span style={{ color: C.textMuted, fontSize: 18, lineHeight: 1 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, parts, operations, files, issues…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: C.text }}
          />
          {loading && (
            <span className="text-xs" style={{ color: C.textMuted }}>
              …
            </span>
          )}
          <span
            className="text-xs px-1.5 py-0.5 rounded select-none"
            style={{ color: C.textMuted, border: `1px solid ${C.border}` }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {showEmpty && (
            <p className="text-sm text-center py-8" style={{ color: C.textMuted }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {groups.map((group) => {
            if (group.results.length === 0) return null;
            return (
              <div key={group.label}>
                {/* Group label */}
                <div
                  className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider sticky top-0"
                  style={{
                    color: C.textMuted,
                    backgroundColor: C.surface2,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {group.label}
                </div>

                {/* Group results */}
                {group.results.map((result) => {
                  const thisIdx = flatCursor++;
                  const isSelected = thisIdx === selectedIndex;
                  return (
                    <div
                      key={result.key}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(thisIdx)}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? C.accentDim : "transparent",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {/* Title — monospace amber */}
                      <span
                        className="text-sm font-semibold truncate flex-shrink-0"
                        style={{
                          color: C.accent,
                          fontFamily: "var(--font-jetbrains-mono)",
                          maxWidth: 200,
                        }}
                      >
                        {result.title}
                      </span>

                      {/* Subtitle */}
                      <span
                        className="flex-1 text-xs truncate"
                        style={{ color: C.textDim }}
                      >
                        {result.subtitle}
                      </span>

                      {/* Type label */}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: result.type === "archive" ? "#fca5a5" : C.textMuted,
                          border: `1px solid ${result.type === "archive" ? "rgba(239,68,68,0.3)" : C.border}`,
                          fontFamily: "var(--font-jetbrains-mono)",
                          fontSize: 10,
                        }}
                      >
                        {result.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Hint when idle */}
          {query.trim().length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: C.textMuted }}>
                Type at least 2 characters to search
              </p>
              <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                ↑↓ navigate · Enter open · Esc close
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
