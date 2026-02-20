import { useCallback, useMemo, useState } from "react";
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

function loadCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODULE_CATEGORIES);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter((x): x is string => typeof x === "string");
    return list.length > 0 ? list : DEFAULT_CATEGORIES.slice();
  } catch {
    return DEFAULT_CATEGORIES.slice();
  }
}

function saveCategories(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MODULE_CATEGORIES, JSON.stringify(list));
}

/** Persisted category list for dropdown; seeds defaults once if empty. */
export function useModuleCategories() {
  const [categories, setCategories] = useState<string[]>(() => {
    const loaded = loadCategories();
    if (loaded.length === 0) {
      const seeded = DEFAULT_CATEGORIES.slice();
      saveCategories(seeded);
      return seeded;
    }
    return loaded;
  });

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      saveCategories(next);
      return next;
    });
  }, []);

  return useMemo(() => ({ categories, addCategory }), [categories, addCategory]);
}
