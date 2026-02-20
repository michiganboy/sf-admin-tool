import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants/storageKeys";

const DEFAULT_CATEGORIES = [
  "Security",
  "Access & Identity",
  "Permissions",
  "Authentication",
  "Integrations",
  "Connected Apps",
  "Data Management",
  "Automation",
  "Monitoring",
  "Compliance & Audit",
  "Configuration",
  "Deployment & Change",
  "Performance",
  "User Management",
  "Reports & Analytics",
  "Orgs & Environments",
  "Other",
];

function loadUserCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODULE_CATEGORIES);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const loaded = parsed.filter((x): x is string => typeof x === "string");
    const defaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()));
    return loaded.filter((c) => !defaultSet.has(c.toLowerCase()));
  } catch {
    return [];
  }
}

function saveUserCategories(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MODULE_CATEGORIES, JSON.stringify(list));
}

function mergeCategories(base: string[], observed: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...base, ...observed]) {
    const t = typeof s === "string" ? s.trim() : "";
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function sameCategories(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Persisted category list for dropdown; merges defaults + user-added + observed. */
export function useModuleCategories(observedCategories?: string[]) {
  const [userCategories, setUserCategories] = useState<string[]>(() => loadUserCategories());

  const observed = observedCategories ?? [];
  const categories = useMemo(() => {
    return mergeCategories(mergeCategories(DEFAULT_CATEGORIES, userCategories), observed);
  }, [userCategories, observed]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const defaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()));
    if (defaultSet.has(trimmed.toLowerCase())) return;
    setUserCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      saveUserCategories(next);
      return next;
    });
  }, []);

  const deleteCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const defaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()));
    if (defaultSet.has(trimmed.toLowerCase())) return;
    setUserCategories((prev) => {
      if (!prev.includes(trimmed)) return prev;
      const next = prev.filter((c) => c !== trimmed);
      saveUserCategories(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ categories, userCategories, addCategory, deleteCategory }),
    [categories, userCategories, addCategory, deleteCategory]
  );
}
