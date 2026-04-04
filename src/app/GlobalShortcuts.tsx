"use client";

import { useState, useEffect } from "react";
import { GlobalSearch } from "./GlobalSearch";

/**
 * Registers global keyboard shortcuts and renders the global search modal.
 * Uses capture phase so Ctrl+F takes priority over page-level bubble handlers.
 */
export function GlobalShortcuts() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
      }
    };
    // Capture phase: fires before any bubble-phase listeners on the page
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  if (!searchOpen) return null;
  return <GlobalSearch onClose={() => setSearchOpen(false)} />;
}
