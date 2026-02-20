import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import PageHeader from "../components/PageHeader";
import { getCatalog, installModules, type CatalogEntry } from "../api/modulesClient";
import { useToast } from "../contexts/ToastContext";

export interface FirstRunWizardProps {
  onComplete: () => void;
}

export default function FirstRunWizard({ onComplete }: FirstRunWizardProps) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    async function loadCatalog() {
      try {
        const entries = await getCatalog();
        const defaults = entries.filter((e) => e.source === "default" && !e.installed);
        setCatalog(defaults);
        setSelectedIds(new Set(defaults.map((e) => e.moduleId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load catalog");
        toast.error("Failed to load module catalog");
      } finally {
        setLoading(false);
      }
    }
    void loadCatalog();
  }, [toast]);

  const handleToggle = (moduleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(catalog.map((e) => e.moduleId)));
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  const handleInstall = async () => {
    if (selectedIds.size === 0) {
      toast.info("Please select at least one module");
      return;
    }

    setInstalling(true);
    setError(null);

    try {
      const moduleIds = Array.from(selectedIds);
      const result = await installModules(moduleIds);

      if (result.skipped.length > 0) {
        toast.error(`Some modules failed to install: ${result.skipped.join(", ")}`);
      }

      if (result.installed.length > 0) {
        toast.success(`Installed ${result.installed.length} module(s)`);
        onComplete();
      } else {
        setError("No modules were installed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to install modules";
      setError(message);
      toast.error(message);
    } finally {
      setInstalling(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="Welcome to SF Admin Tool"
        subtitle="Select modules to install, or skip to continue."
      />
      <Stack spacing={3} sx={{ mt: 3, maxWidth: 800 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button size="small" onClick={handleSelectAll} variant="outlined">
              Select All
            </Button>
            <Button size="small" onClick={handleSelectNone} variant="outlined">
              Select None
            </Button>
          </Stack>

          {catalog.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No default modules available.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {catalog.map((entry) => (
                <Card key={entry.moduleId} variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedIds.has(entry.moduleId)}
                          onChange={() => handleToggle(entry.moduleId)}
                          disabled={installing}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="h6" component="div">
                            {entry.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.description}
                          </Typography>
                          {entry.sectionCategory && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                              Category: {entry.sectionCategory}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={handleSkip} disabled={installing} variant="outlined">
            Skip for now
          </Button>
          <Button
            onClick={handleInstall}
            disabled={installing || selectedIds.size === 0}
            variant="contained"
          >
            {installing ? "Installing..." : `Install Selected (${selectedIds.size})`}
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
