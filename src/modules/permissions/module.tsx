import type { AdminModule } from "../_types";
import ModuleDetailsShell from "../_shared/ModuleDetailsShell";

function DetailsPage({
  onBack,
  onNavigateToRun,
}: {
  onBack: () => void;
  onNavigateToRun?: (runId: string) => void;
}) {
  return (
    <ModuleDetailsShell
      moduleId="permissions"
      moduleName="Permissions"
      description="Inspect and compare permission sets and profiles."
      onBack={onBack}
      onNavigateToRun={onNavigateToRun}
    />
  );
}

const module: AdminModule = {
  id: "permissions",
  name: "Permissions",
  description: "Inspect and compare permission sets and profiles.",
  status: "alpha",
  category: "admin",
  sectionCategory: "Permissions",
  tags: ["profiles", "permission-sets", "audit"],
  render: { DetailsPage },
};

export default module;
