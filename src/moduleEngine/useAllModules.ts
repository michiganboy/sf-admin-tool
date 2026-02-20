import { useState, useEffect, useCallback, useRef } from "react";
import { listModules } from "../api/modulesClient";
import { loadModuleBundle } from "./runtimeLoader";
import { createHostSdk } from "./sdk";
import { useToast } from "../contexts/ToastContext";
import { getEnabledIds } from "./moduleEnablement";
import type { AdminModule } from "./types";

export interface UseAllModulesResult {
  modules: AdminModule[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAllModules(): UseAllModulesResult {
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToast();
  const hostSdkRef = useRef(createHostSdk({ toast }));
  hostSdkRef.current = createHostSdk({ toast });

  const loadModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sdk = hostSdkRef.current;

    try {
      const installed = await listModules();
      const loadedModules: AdminModule[] = [];

      for (const installedModule of installed) {
        try {
          const adminModule = await loadModuleBundle(installedModule.moduleId, sdk);
          loadedModules.push(adminModule);
        } catch (err) {
          console.error(`Failed to load module ${installedModule.moduleId}:`, err);
          toast.error(`Failed to load module ${installedModule.name}`);
        }
      }

      loadedModules.sort((a, b) => a.name.localeCompare(b.name));
      setModules(loadedModules);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  return {
    modules,
    loading,
    error,
    refresh: loadModules,
  };
}
