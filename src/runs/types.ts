export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface RunRecord {
  id: string;
  createdAt: string;
  moduleId: string;
  moduleName: string;
  orgLabel: string;
  notes?: string;
  status: RunStatus;
}
