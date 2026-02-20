import type { AdminModule } from "./types";

export interface ModuleOverrides {
  [moduleId: string]: {
    category?: string;
    tags?: string[];
  };
}

const DEFAULT_CATEGORY = "Other";

/** Normalize tags: trim, lowercase, dedupe, remove empty. Never allow "+N" as a tag. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const s = typeof t === "string" ? t.trim().toLowerCase() : "";
    if (s === "" || s.startsWith("+") || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Effective category and tags for a module: overrides take precedence, then module defaults.
 * Tags are normalized (trim, lowercase, dedupe; "+N" never stored).
 */
export function getEffectiveModuleMeta(
  module: AdminModule,
  overrides: ModuleOverrides
): { effectiveCategory: string; effectiveTags: string[] } {
  const o = overrides[module.id];
  const effectiveCategory =
    (o?.category?.trim() || module.sectionCategory?.trim() || DEFAULT_CATEGORY) || DEFAULT_CATEGORY;
  const rawTags = o?.tags ?? module.tags ?? [];
  const effectiveTags = normalizeTags(rawTags);
  return { effectiveCategory, effectiveTags };
}
