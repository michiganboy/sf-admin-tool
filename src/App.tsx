import * as React from "react";
import { Box, Button, Toolbar } from "@mui/material";
import SideNav, { type NavKey } from "./components/SideNav";
import TopBar from "./components/TopBar";
import DashboardPage from "./pages/DashboardPage";
import { getModuleById } from "./modules/registry";
import ModulesPage from "./pages/ModulesPage";
import RunDetailsPage from "./pages/RunDetailsPage";
import RunsPage from "./pages/RunsPage";
import SettingsPage from "./pages/SettingsPage";
import PageHeader from "./components/PageHeader";
import { ColorModeProvider } from "./contexts/ColorModeContext";
import { ToastProvider } from "./contexts/ToastContext";

// Persisted left-nav selection.
const activeViewStorageKey = "sf-admin-tool:active-view";

function getStoredActiveView(): NavKey {
  const raw = typeof window !== "undefined" ? localStorage.getItem(activeViewStorageKey) : null;
  return raw === "dashboard" || raw === "modules" || raw === "runs" || raw === "settings" ? raw : "dashboard";
}

export default function App() {
  const [active, setActive] = React.useState<NavKey>(getStoredActiveView);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);

  const setActiveView = (key: NavKey) => {
    setActive(key);
    localStorage.setItem(activeViewStorageKey, key);
    setSelectedModuleId(null);
    setSelectedRunId(null);
  };

  const navigateToRun = (runId: string) => {
    setActive("runs");
    localStorage.setItem(activeViewStorageKey, "runs");
    setSelectedModuleId(null);
    setSelectedRunId(runId);
  };

  return (
    <ColorModeProvider>
      <ToastProvider>
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
      </ToastProvider>
    </ColorModeProvider>
  );
}
