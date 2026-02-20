import fs from "node:fs/promises";
import path from "node:path";
import { ARTIFACTS_MODULES_ROOT } from "../paths.js";

export interface Manifest {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  category: "admin" | "hygiene" | "diagnostics";
  sectionCategory?: string;
  tags?: string[];
}

export interface ModuleMetadata {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installedAt: string;
  manifest: Manifest;
}

export async function loadModuleManifest(modulePath: string): Promise<Manifest> {
  const manifestPath = path.join(modulePath, "manifest.json");
  const raw = await fs.readFile(manifestPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Manifest).moduleId !== "string" ||
    typeof (parsed as Manifest).name !== "string" ||
    typeof (parsed as Manifest).description !== "string" ||
    typeof (parsed as Manifest).version !== "string" ||
    typeof (parsed as Manifest).category !== "string"
  ) {
    throw new Error("Invalid manifest.json structure");
  }
  
  return parsed as Manifest;
}

export async function getModuleMetadata(moduleId: string): Promise<ModuleMetadata | null> {
  const modulePath = path.join(ARTIFACTS_MODULES_ROOT, moduleId, "current");
  try {
    const stat = await fs.stat(modulePath);
    const manifest = await loadModuleManifest(modulePath);
    return {
      moduleId,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      installedAt: stat.birthtime.toISOString(),
      manifest,
    };
  } catch {
    return null;
  }
}
