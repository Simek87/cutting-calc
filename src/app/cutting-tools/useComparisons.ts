"use client";

import { useState, useCallback } from "react";
import type { ComparatorSlot } from "./calc";

const STORAGE_KEY = "ct-comparisons-v1";

export interface SavedComparison {
  id:      string;
  name:    string;
  slots:   ComparatorSlot[];
  savedAt: string;
}

function loadFromStorage(): SavedComparison[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(comparisons: SavedComparison[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisons));
}

export function useComparisons() {
  const [comparisons, setComparisons] = useState<SavedComparison[]>(loadFromStorage);

  const saveComparison = useCallback((name: string, slots: ComparatorSlot[]) => {
    const entry: SavedComparison = {
      id:      `cmp${Date.now()}`,
      name:    name.trim() || `Comparison ${new Date().toLocaleDateString()}`,
      slots,
      savedAt: new Date().toISOString(),
    };
    setComparisons((prev) => {
      const next = [...prev, entry];
      persist(next);
      return next;
    });
  }, []);

  const deleteComparison = useCallback((id: string) => {
    setComparisons((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { comparisons, saveComparison, deleteComparison };
}
