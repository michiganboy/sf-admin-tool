import { STORAGE_KEYS } from "../constants/storageKeys";
import type { AdminModule } from "./_types";

const ENABLED_KEY = STORAGE_KEYS.ENABLED_MODULES;

type ModuleModule = { default: AdminModule };

const modulesMap = import.meta.glob<ModuleModule>("./*/module.tsx", { eager: true });

function loadAll(): AdminModule[] {
  const list = Object.values(modulesMap)
    .map((m) => m.default)
    .filter((m): m is AdminModule => m != null && typeof m.id === "string" && typeof m.name === "string");
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

let cached: AdminModule[] | null = null;

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

/** Returns all discovered modules, sorted by name. */
export function getAllModules(): AdminModule[] {
  if (cached === null) cached = loadAll();
  return cached;
}

/** Returns only enabled modules; when no setting exists, all are enabled. */
export function getModules(): AdminModule[] {
  const all = getAllModules();
  const enabled = getEnabledIds();
  if (enabled === null) return all;
  const set = new Set(enabled);
  return all.filter((m) => set.has(m.id));
}

/** Returns a module by id if it exists and is enabled, or undefined. */
export function getModuleById(id: string): AdminModule | undefined {
  return getModules().find((m) => m.id === id);
}
