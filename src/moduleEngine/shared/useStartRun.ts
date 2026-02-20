import { useCallback } from "react";
import { addRun } from "../../runs/store";
import type { RunRecord } from "../../runs/types";

function generateRunId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UseStartRunOptions {
  moduleId: string;
  moduleName: string;
}

export function useStartRun({ moduleId, moduleName }: UseStartRunOptions) {
  const startRun = useCallback(
    async (payload: { orgLabel: string; notes?: string }): Promise<RunRecord> => {
      const run: RunRecord = {
        id: generateRunId(),
        createdAt: new Date().toISOString(),
        moduleId,
        moduleName,
        orgLabel: payload.orgLabel.trim(),
        notes: payload.notes?.trim() || undefined,
        status: "queued",
      };
      return addRun(run);
    },
    [moduleId, moduleName]
  );
  return { startRun };
}
