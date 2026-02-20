import { useCallback, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { ModuleOverrides } from "../moduleEngine/getEffectiveModuleMeta";
import { normalizeTags } from "../moduleEngine/getEffectiveModuleMeta";

function loadOverrides(): ModuleOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODULE_OVERRIDES);
    if (raw == null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object") return {};
    const out: ModuleOverrides = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof id !== "string") continue;
      if (v == null || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      if (o.category !== undefined && typeof o.category === "string") {
        out[id] = out[id] ?? {};
        out[id].category = o.category;
      }
      if (Array.isArray(o.tags)) {
        const tags = o.tags.filter((t): t is string => typeof t === "string");
        out[id] = out[id] ?? {};
        out[id].tags = normalizeTags(tags);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveOverrides(data: ModuleOverrides): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MODULE_OVERRIDES, JSON.stringify(data));
}

/** Persisted per-module category/tags overrides. */
export function useModuleOverrides() {
  const [overrides, setOverrides] = useState<ModuleOverrides>(loadOverrides);

  const setCategoryOverride = useCallback((moduleId: string, category: string | undefined) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const cur = next[moduleId];
      if (category === undefined || category.trim() === "") {
        if (cur) {
          const { tags } = cur;
          if (tags !== undefined && tags.length > 0) next[moduleId] = { tags };
          else delete next[moduleId];
        }
      } else {
        next[moduleId] = { ...cur, category: category.trim() };
      }
      saveOverrides(next);
      return next;
    });
  }, []);

  const setTagsOverride = useCallback((moduleId: string, tags: string[] | undefined) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const cur = next[moduleId];
      const normalized = tags === undefined ? undefined : normalizeTags(tags);
      if (normalized === undefined || normalized.length === 0) {
        if (cur) {
          const { category } = cur;
          if (category !== undefined) next[moduleId] = { category };
          else delete next[moduleId];
        }
      } else {
        next[moduleId] = { ...cur, tags: normalized };
      }
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetModuleOverrides = useCallback((moduleId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      saveOverrides(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      overrides,
      setCategoryOverride,
      setTagsOverride,
      resetModuleOverrides,
    }),
    [overrides, setCategoryOverride, setTagsOverride, resetModuleOverrides]
  );
}
