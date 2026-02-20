import { getModuleBundleUrl } from "../api/modulesClient";
import { createHostSdk, type CreateModuleFunction } from "./sdk";
import { useToast } from "../contexts/ToastContext";
import type { AdminModule } from "./types";

const moduleCache = new Map<string, AdminModule>();

export async function loadModuleBundle(
  moduleId: string,
  hostSdk: ReturnType<typeof createHostSdk>
): Promise<AdminModule> {
  if (moduleCache.has(moduleId)) {
    return moduleCache.get(moduleId)!;
  }

  const bundleUrl = getModuleBundleUrl(moduleId);
  
  try {
    const module = await import(/* @vite-ignore */ bundleUrl);
    
    if (!module.default || typeof module.default !== "function") {
      throw new Error(`Module ${moduleId} does not export a default function`);
    }
    
    const createModule = module.default as CreateModuleFunction;
    const adminModule = createModule(hostSdk);
    
    if (!adminModule || typeof adminModule.id !== "string" || typeof adminModule.name !== "string") {
      throw new Error(`Module ${moduleId} returned invalid AdminModule`);
    }
    
    moduleCache.set(moduleId, adminModule);
    return adminModule;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load module ${moduleId}: ${message}`);
  }
}

export function clearModuleCache(): void {
  moduleCache.clear();
}

export function getCachedModule(moduleId: string): AdminModule | undefined {
  return moduleCache.get(moduleId);
}
