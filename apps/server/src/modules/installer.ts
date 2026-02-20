import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_MODULES_ROOT, ARTIFACTS_MODULES_ROOT } from "../paths.js";
import { loadModuleManifest, type Manifest } from "./loader.js";
import { sanitizeModuleId } from "./validator.js";

const MAX_BUNDLE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MANIFEST_SIZE = 64 * 1024; // 64KB

export async function validateModuleStructure(sourcePath: string): Promise<boolean> {
  const manifestPath = path.join(sourcePath, "manifest.json");
  const bundlePath = path.join(sourcePath, "bundle.mjs");
  
  try {
    const manifestStat = await fs.stat(manifestPath);
    const bundleStat = await fs.stat(bundlePath);
    
    if (manifestStat.size > MAX_MANIFEST_SIZE) return false;
    if (bundleStat.size > MAX_BUNDLE_SIZE) return false;
    
    await loadModuleManifest(sourcePath);
    return true;
  } catch {
    return false;
  }
}

export async function installModule(moduleId: string): Promise<void> {
  const sanitized = sanitizeModuleId(moduleId);
  if (!sanitized) {
    throw new Error(`Invalid module ID: ${moduleId}`);
  }
  
  const sourcePath = path.join(DEFAULT_MODULES_ROOT, sanitized);
  
  try {
    await fs.access(sourcePath);
  } catch {
    throw new Error(`Module not found: ${sanitized}`);
  }
  
  if (!(await validateModuleStructure(sourcePath))) {
    throw new Error(`Invalid module structure: ${sanitized}`);
  }
  
  const targetDir = path.join(ARTIFACTS_MODULES_ROOT, sanitized);
  const targetPath = path.join(targetDir, "current");
  
  await fs.mkdir(targetPath, { recursive: true });
  
  const manifestPath = path.join(sourcePath, "manifest.json");
  const bundlePath = path.join(sourcePath, "bundle.mjs");
  
  const manifestContent = await fs.readFile(manifestPath, "utf-8");
  const bundleContent = await fs.readFile(bundlePath, "utf-8");
  
  await fs.writeFile(path.join(targetPath, "manifest.json"), manifestContent, "utf-8");
  await fs.writeFile(path.join(targetPath, "bundle.mjs"), bundleContent, "utf-8");
}
