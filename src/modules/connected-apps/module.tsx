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
      moduleId="connected-apps"
      moduleName="Connected Apps"
      description="Manage connected app definitions and OAuth clients."
      onBack={onBack}
      onNavigateToRun={onNavigateToRun}
    />
  );
}

const module: AdminModule = {
  id: "connected-apps",
  name: "Connected Apps",
  description: "Manage connected app definitions and OAuth clients.",
  category: "admin",
  sectionCategory: "Connected Apps",
  tags: ["oauth", "jwt", "audit"],
  render: { DetailsPage },
};

export default module;
