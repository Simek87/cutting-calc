"use client";

import { useState, useCallback } from "react";
import type { Preset, Setup } from "./calc";

const STORAGE_KEY = "ct-presets-v1";

function loadFromStorage(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(presets: Preset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(loadFromStorage);

  const savePreset = useCallback((name: string, setup: Setup) => {
    const preset: Preset = {
      id:      `p${Date.now()}`,
      name:    name.trim() || setup.name || "Preset",
      toolId:  setup.toolId,
      D:       setup.D,
      R:       setup.R,
      z:       setup.z,
      machine: setup.machine,
      vc:      setup.vc,
      fz:      setup.fz,
      ap:      setup.ap,
      ae:      setup.ae,
    };
    setPresets((prev) => {
      const next = [...prev, preset];
      persist(next);
      return next;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}
