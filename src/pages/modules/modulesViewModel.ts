import type { AdminModule } from "../../moduleEngine/types";

const MAX_VISIBLE_TAGS = 3;

/** Module with effective category and tags (from defaults + overrides). */
export interface ModuleWithEffectiveMeta extends AdminModule {
  effectiveCategory: string;
  effectiveTags: string[];
}

/** Case-insensitive match on id, name, or description. Shared for Modules and Settings. */
export function matchesModuleSearch(mod: AdminModule, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  return (
    mod.id.toLowerCase().includes(lower) ||
    mod.name.toLowerCase().includes(lower) ||
    mod.description.toLowerCase().includes(lower)
  );
}

function matchesSearch(mod: AdminModule, q: string): boolean {
  return matchesModuleSearch(mod, q);
}

/** Module has all of the selected tags (AND); uses effectiveTags. */
function matchesTags(mod: ModuleWithEffectiveMeta, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true;
  const modTags = new Set(mod.effectiveTags.map((t) => t.toLowerCase()));
  return selectedTags.every((t) => modTags.has(t.toLowerCase()));
}

export interface ModuleGroup {
  categoryName: string;
  modules: ModuleWithEffectiveMeta[];
}

export interface ModulesViewModelResult {
  groups: ModuleGroup[];
  availableTags: string[];
  counts: { filteredCount: number; totalCount: number };
}

/**
 * Filter by search and tags, group by effectiveCategory with favorites first.
 * Category order: categories with any favorite first, then alphabetical.
 * Within category: favorites first (registry order), then non-favorites.
 * Tag options from effectiveTags only (no auto-inferred tags).
 */
export function getModulesViewModel(
  modules: ModuleWithEffectiveMeta[],
  searchQuery: string,
  selectedTags: string[],
  favoritesSet: Set<string>
): ModulesViewModelResult {
  const totalCount = modules.length;

  const searchFiltered = modules.filter((mod) => matchesSearch(mod, searchQuery));
  const filtered =
    selectedTags.length === 0
      ? searchFiltered
      : searchFiltered.filter((mod) => matchesTags(mod, selectedTags));
  const filteredCount = filtered.length;

  const availableTags = Array.from(
    new Set(modules.flatMap((mod) => mod.effectiveTags))
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const byCategory = new Map<string, ModuleWithEffectiveMeta[]>();
  for (const mod of filtered) {
    const cat = mod.effectiveCategory.trim() || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(mod);
  }

  const categoryNames = Array.from(byCategory.keys());
  const hasFavorite = (cat: string) =>
    (byCategory.get(cat) ?? []).some((m) => favoritesSet.has(m.id));
  const sortedCategories = categoryNames.sort((a, b) => {
    const aFav = hasFavorite(a);
    const bFav = hasFavorite(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  const groups: ModuleGroup[] = sortedCategories.map((categoryName) => {
    const list = byCategory.get(categoryName)!;
    const fav: ModuleWithEffectiveMeta[] = [];
    const rest: ModuleWithEffectiveMeta[] = [];
    for (const m of list) {
      if (favoritesSet.has(m.id)) fav.push(m);
      else rest.push(m);
    }
    return { categoryName, modules: [...fav, ...rest] };
  });

  return { groups, availableTags, counts: { filteredCount, totalCount } };
}

/** Visible tags for card (first N) and overflow count; overflow labels for tooltip. "+N" is display-only. */
export function getVisibleTagsAndOverflow(
  tags: string[]
): { visible: string[]; overflow: number; overflowLabels: string[] } {
  if (tags.length <= MAX_VISIBLE_TAGS)
    return { visible: tags, overflow: 0, overflowLabels: [] };
  return {
    visible: tags.slice(0, MAX_VISIBLE_TAGS),
    overflow: tags.length - MAX_VISIBLE_TAGS,
    overflowLabels: tags.slice(MAX_VISIBLE_TAGS),
  };
}
