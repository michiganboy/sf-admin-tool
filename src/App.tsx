import * as React from "react";
import { Box, Button, Toolbar } from "@mui/material";
import SideNav, { type NavKey } from "./components/SideNav";
import TopBar from "./components/TopBar";
import DashboardPage from "./pages/DashboardPage";
import { useAllModules } from "./moduleEngine/useAllModules";
import ModulesPage from "./pages/ModulesPage";
import RunDetailsPage from "./pages/RunDetailsPage";
import RunsPage from "./pages/RunsPage";
import SettingsPage from "./pages/SettingsPage";
import PageHeader from "./components/PageHeader";
import { STORAGE_KEYS } from "./constants/storageKeys";
import { ColorModeProvider } from "./contexts/ColorModeContext";
import { ToastProvider } from "./contexts/ToastContext";
import FirstRunWizard from "./pages/FirstRunWizard";
import { listModules } from "./api/modulesClient";

function getStoredActiveView(): NavKey {
  const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.ACTIVE_VIEW) : null;
  return raw === "dashboard" || raw === "modules" || raw === "runs" || raw === "settings" ? raw : "dashboard";
}

const FIRST_RUN_COMPLETE_KEY = "sf-admin-tool:first-run-complete";

function isFirstRunComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(FIRST_RUN_COMPLETE_KEY) === "true";
}

function setFirstRunComplete(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(FIRST_RUN_COMPLETE_KEY, "true");
  }
}

function AppContent() {
  const [active, setActive] = React.useState<NavKey>(getStoredActiveView);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const { modules } = useAllModules();
  
  const getModuleById = React.useCallback((id: string) => {
    return modules.find((m) => m.id === id);
  }, [modules]);

  const setActiveView = (key: NavKey) => {
    setActive(key);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, key);
    setSelectedModuleId(null);
    setSelectedRunId(null);
  };

  const navigateToRun = (runId: string) => {
    setActive("runs");
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, "runs");
    setSelectedModuleId(null);
    setSelectedRunId(runId);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <TopBar title="Salesforce Admin Tool" />

      <SideNav active={active} onChange={setActiveView} />

      <Box component="main" sx={{ flexGrow: 1, px: 3, pt: 0, pb: 3 }}>
        <Toolbar />

        {active === "dashboard" && <DashboardPage />}
        {active === "modules" &&
          (selectedModuleId ? (() => {
            const module = getModuleById(selectedModuleId);
            if (!module) {
              return (
                <PageHeader
                  title="Module not found"
                  subtitle={`No module with id "${selectedModuleId}".`}
                  actions={
                    <Button onClick={() => setSelectedModuleId(null)} variant="outlined">
                      Back to Modules
                    </Button>
                  }
                />
              );
            }
            const DetailsPage = module.render.DetailsPage;
            return (
              <DetailsPage
                key={module.id}
                onBack={() => setSelectedModuleId(null)}
                onNavigateToRun={navigateToRun}
              />
            );
          })() : (
            <ModulesPage onSelectModule={setSelectedModuleId} />
          ))}
        {active === "runs" &&
          (selectedRunId ? (
            <RunDetailsPage
              runId={selectedRunId}
              onBack={() => setSelectedRunId(null)}
            />
          ) : (
            <RunsPage onSelectRun={setSelectedRunId} />
          ))}
        {active === "settings" && <SettingsPage />}
      </Box>
    </Box>
  );
}

export default function App() {
  const [showWizard, setShowWizard] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    async function checkFirstRun() {
      if (isFirstRunComplete()) {
        setShowWizard(false);
        return;
      }

      try {
        const installed = await listModules();
        if (installed.length === 0) {
          setShowWizard(true);
        } else {
          setFirstRunComplete();
          setShowWizard(false);
        }
      } catch {
        setShowWizard(false);
      }
    }
    void checkFirstRun();
  }, []);

  const handleWizardComplete = React.useCallback(() => {
    setFirstRunComplete();
    setShowWizard(false);
  }, []);

  if (showWizard === null) {
    return (
      <ColorModeProvider>
        <ToastProvider>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            Loading...
          </Box>
        </ToastProvider>
      </ColorModeProvider>
    );
  }

  if (showWizard) {
    return (
      <ColorModeProvider>
        <ToastProvider>
          <Box sx={{ display: "flex", px: 3, pt: 3, pb: 3 }}>
            <Box component="main" sx={{ flexGrow: 1, maxWidth: 1200, mx: "auto" }}>
              <FirstRunWizard onComplete={handleWizardComplete} />
            </Box>
          </Box>
        </ToastProvider>
      </ColorModeProvider>
    );
  }

  return (
    <ColorModeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ColorModeProvider>
  );
}
