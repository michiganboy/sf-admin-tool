import { useCallback, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants/storageKeys";

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(ids));
}

/** Persisted favorite module IDs; exposes set and toggle. */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(loadFavorites);

  const favoritesSet = useMemo(() => new Set(ids), [ids]);

  const toggleFavorite = useCallback((moduleId: string) => {
    setIds((prev) => {
      const next = prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId];
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favoritesSet, toggleFavorite };
}
