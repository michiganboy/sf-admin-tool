import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_MODULES_ROOT, ARTIFACTS_MODULES_ROOT } from "../paths.js";
import { loadModuleManifest, type Manifest } from "./loader.js";

export interface CatalogEntry {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
  source: "default" | "installed";
  manifest?: Manifest;
}

export async function discoverDefaultModules(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  
  try {
    const dirs = await fs.readdir(DEFAULT_MODULES_ROOT, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      
      const modulePath = path.join(DEFAULT_MODULES_ROOT, dir.name);
      const manifestPath = path.join(modulePath, "manifest.json");
      
      try {
        await fs.access(manifestPath);
        const manifest = await loadModuleManifest(modulePath);
        
        const installedPath = path.join(ARTIFACTS_MODULES_ROOT, dir.name, "current");
        let installed = false;
        try {
          await fs.access(installedPath);
          installed = true;
        } catch {
          // Not installed
        }
        
        entries.push({
          moduleId: manifest.moduleId,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          installed,
          source: "default",
        });
      } catch {
        // Skip modules without valid manifest
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      // default-modules directory doesn't exist yet
      return [];
    }
    throw err;
  }
  
  return entries;
}

export async function discoverInstalledModules(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  
  try {
    const dirs = await fs.readdir(ARTIFACTS_MODULES_ROOT, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      
      const modulePath = path.join(ARTIFACTS_MODULES_ROOT, dir.name, "current");
      try {
        const manifest = await loadModuleManifest(modulePath);
        entries.push({
          moduleId: manifest.moduleId,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          installed: true,
          source: "installed",
          manifest,
        });
      } catch {
        // Skip modules without valid manifest
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      // artifacts/modules directory doesn't exist yet
      return [];
    }
    throw err;
  }
  
  return entries;
}

export function mergeCatalogEntries(defaults: CatalogEntry[], installed: CatalogEntry[]): CatalogEntry[] {
  const map = new Map<string, CatalogEntry>();
  
  for (const entry of defaults) {
    map.set(entry.moduleId, entry);
  }
  
  for (const entry of installed) {
    map.set(entry.moduleId, entry);
  }
  
  const merged = Array.from(map.values());
  merged.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  
  return merged;
}
