import { STORAGE_KEYS } from "../constants/storageKeys";

const ENABLED_KEY = STORAGE_KEYS.ENABLED_MODULES;

/** Returns enabled module IDs from storage; null means all enabled (no key or invalid). */
export function getEnabledIds(): string[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(ENABLED_KEY) : null;
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((x): x is string => typeof x === "string");
    return ids;
  } catch {
    return null;
  }
}

/** Persists enabled module IDs. */
export function setEnabledIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, JSON.stringify(ids));
}
