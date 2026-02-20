import type { ComponentType } from "react";

export type ModuleId = string;

export interface AdminModule {
  id: ModuleId;
  name: string;
  description: string;
  /** Not used in UI; kept for compatibility. */
  status?: "alpha" | "beta" | "stable";
  /** Legacy; for grouping on Modules page use sectionCategory + overrides. */
  category: "admin" | "hygiene" | "diagnostics";
  /** Optional section category (defaults). Effective value comes from overrides ?? sectionCategory ?? "Other". */
  sectionCategory?: string;
  /** Optional tags (defaults). Effective value from overrides ?? tags; normalized when stored. */
  tags?: string[];
  render: {
    DetailsPage: ComponentType<{
      onBack: () => void;
      onNavigateToRun?: (runId: string) => void;
    }>;
  };
}
