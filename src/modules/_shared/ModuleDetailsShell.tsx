import { Button } from "@mui/material";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../contexts/ToastContext";
import ModuleRunForm from "../_runForm";
import { useStartRun } from "./useStartRun";

export interface ModuleDetailsShellProps {
  moduleId: string;
  moduleName: string;
  description: string;
  onBack: () => void;
  onNavigateToRun?: (runId: string) => void;
}

/** Standard module detail: header with Back, Run section, unified toast and optional nav to run. */
export default function ModuleDetailsShell({
  moduleId,
  moduleName,
  description,
  onBack,
  onNavigateToRun,
}: ModuleDetailsShellProps) {
  const { startRun } = useStartRun({ moduleId, moduleName });
  const toast = useToast();

  const handleRunQueued = (run: { id: string }) => {
    toast.success("Run queued");
    onNavigateToRun?.(run.id);
  };

  return (
    <>
      <PageHeader
        title={moduleName}
        subtitle={description}
        actions={
          <Button onClick={onBack} variant="outlined">
            Back to Modules
          </Button>
        }
      />
      <ModuleRunForm
        startRun={startRun}
        onRunQueued={handleRunQueued}
      />
    </>
  );
}
