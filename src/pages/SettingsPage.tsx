import { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ConfirmDialog from "../components/ConfirmDialog";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FolderIcon from "@mui/icons-material/Folder";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import PageHeader from "../components/PageHeader";
import SettingsSectionHeader from "../components/SettingsSectionHeader";
import { useToast } from "../contexts/ToastContext";
import { useModuleCategories } from "../hooks/useModuleCategories";
import { useModuleOverrides } from "../hooks/useModuleOverrides";
import { getEffectiveModuleMeta, normalizeTags } from "../modules/getEffectiveModuleMeta";
import { matchesModuleSearch } from "./modules/modulesViewModel";
import {
  getAllModules,
  getEnabledIds,
  setEnabledIds,
} from "../modules/registry";
import {
  type JwtKeyEntry,
  deleteJwtKey,
  getOrgSecretsPath,
  listJwtKeys,
  openOrgSecretsFolder,
  uploadJwtKey,
} from "../api/secretsClient";

/** Add-tag: circular IconButton (+); opens popover to enter tag name. */
function ModuleTagAdder({
  existing,
  onAdd,
}: {
  existing: string[];
  onAdd: (tag: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [input, setInput] = useState("");
  const open = Boolean(anchor);

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith("+") || existing.includes(trimmed)) {
      setInput("");
      setAnchor(null);
      return;
    }
    const normalized = normalizeTags([trimmed]);
    if (normalized.length > 0) {
      onAdd(normalized[0]);
      setInput("");
      setAnchor(null);
    }
  };

  return (
    <>
      <Tooltip title="Add tag">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Add tag"
          sx={{
            width: 28,
            height: 28,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "50%",
            "&:hover": { borderColor: "action.active", bgcolor: "action.hover" },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => { setAnchor(null); setInput(""); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, minWidth: 180 }}>
          <TextField
            size="small"
            placeholder="Tag name"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            fullWidth
            autoFocus
            slotProps={{ input: { sx: { fontSize: "0.875rem" } } }}
          />
          <Button size="small" onClick={handleAdd} sx={{ mt: 1 }}>Add</Button>
        </Box>
      </Popover>
    </>
  );
}

/** Settings view: modules toggles and per-org JWT key inventory. */
export default function SettingsPage() {
  const all = getAllModules();
  const [enabledSet, setEnabledSet] = useState<Set<string>>(() => {
    const stored = getEnabledIds();
    if (stored === null) return new Set(all.map((m) => m.id));
    return new Set(stored);
  });

  const [tab, setTab] = useState(0);
  const toast = useToast();
  const { overrides, setCategoryOverride, setTagsOverride, resetModuleOverrides } =
    useModuleOverrides();
  const { categories, addCategory } = useModuleCategories();

  // Modules tab: expandable row, search, filter
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Auth tab: inventory, add-key dialog, row replace, delete confirm
  const [inventory, setInventory] = useState<JwtKeyEntry[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [addOrgLabel, setAddOrgLabel] = useState("");
  const [addOrgFile, setAddOrgFile] = useState<File | null>(null);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState<string | null>(null);
  const [uploadTargetOrg, setUploadTargetOrg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const list = await listJwtKeys();
      setInventory(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load list");
    } finally {
      setInventoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 1) void loadInventory();
  }, [tab, loadInventory]);

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      const next = new Set(enabledSet);
      if (enabled) next.add(id);
      else next.delete(id);
      setEnabledSet(next);
      setEnabledIds([...next]);
    },
    [enabledSet]
  );

  /** Upload for an org, reload list, show toast; throws on error so caller can keep dialog open. */
  const doUpload = useCallback(
    async (label: string, file: File) => {
      setInventoryLoading(true);
      try {
        await uploadJwtKey(label, file);
        await loadInventory();
        toast.success("Key uploaded");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
        throw e;
      } finally {
        setInventoryLoading(false);
      }
    },
    [loadInventory, toast]
  );

  const handleAddKeyDialogUpload = useCallback(async () => {
    const label = addOrgLabel.trim();
    if (!label || !addOrgFile) return;
    try {
      await doUpload(label, addOrgFile);
      setAddKeyDialogOpen(false);
      setAddOrgLabel("");
      setAddOrgFile(null);
    } catch {
      // Error snack already set; dialog stays open
    }
  }, [addOrgLabel, addOrgFile, doUpload]);

  const handleAddKeyDialogClose = useCallback(() => {
    setAddKeyDialogOpen(false);
    setAddOrgLabel("");
    setAddOrgFile(null);
  }, []);

  const handleRowUploadClick = useCallback((orgLabel: string) => {
    setUploadTargetOrg(orgLabel);
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !uploadTargetOrg) return;
      void doUpload(uploadTargetOrg, file);
      setUploadTargetOrg(null);
    },
    [uploadTargetOrg, doUpload]
  );

  const handleDeleteClick = useCallback((orgLabel: string) => {
    setDeleteConfirmOrg(orgLabel);
  }, []);

  /** Open org secrets folder via server; on failure fall back to copy path to clipboard. */
  const handleOpenKeyFolder = useCallback(async (orgLabel: string) => {
    const result = await openOrgSecretsFolder(orgLabel);
    if (result.ok) {
      toast.success("Opened folder");
      return;
    }
    try {
      const { path: folderPath } = await getOrgSecretsPath(orgLabel);
      await navigator.clipboard.writeText(folderPath);
      toast.success("Path copied to clipboard");
    } catch {
      toast.error(result.error || "Failed to open folder");
    }
  }, [toast]);

  const handleDeleteConfirm = useCallback(async () => {
    const org = deleteConfirmOrg;
    if (!org) return;
    setInventoryLoading(true);
    try {
      await deleteJwtKey(org);
      await loadInventory();
      toast.success("Key deleted");
      setDeleteConfirmOrg(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setInventoryLoading(false);
    }
  }, [deleteConfirmOrg, loadInventory, toast]);

  const handleDeleteCancel = useCallback(() => setDeleteConfirmOrg(null), []);

  const addKeyUploadDisabled = !addOrgLabel.trim() || !addOrgFile || inventoryLoading;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace and preferences"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2 }}>
        <Tab label="Modules" />
        <Tab label="Auth" />
      </Tabs>

      {tab === 0 && (
        <>
          <SettingsSectionHeader
            title="Modules"
            subtitle="Enable or disable modules and customize category and tags for the Modules page."
          />
          {all.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No modules discovered.
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                <TextField
                  size="small"
                  placeholder="Search modules"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: { xs: "100%", sm: 240 } }}
                />
                <ToggleButtonGroup
                  size="small"
                  value={moduleFilter}
                  exclusive
                  onChange={(_, v) => v != null && setModuleFilter(v)}
                  aria-label="Filter modules"
                >
                  <ToggleButton value="all" aria-label="All">All</ToggleButton>
                  <ToggleButton value="enabled" aria-label="Enabled">Enabled</ToggleButton>
                  <ToggleButton value="disabled" aria-label="Disabled">Disabled</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Stack spacing={0}>
                {(() => {
                  const filtered = all.filter((mod) => {
                    const enabled = enabledSet.has(mod.id);
                    if (moduleFilter === "enabled" && !enabled) return false;
                    if (moduleFilter === "disabled" && enabled) return false;
                    return matchesModuleSearch(mod, moduleSearch);
                  });
                  if (filtered.length === 0) {
                    return (
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No modules match your search or filter.
                      </Typography>
                    );
                  }
                  return filtered.map((mod) => {
                    const enabled = enabledSet.has(mod.id);
                    const { effectiveCategory, effectiveTags } = getEffectiveModuleMeta(
                      mod,
                      overrides
                    );
                    const currentOverride = overrides[mod.id];
                    const hasOverrides =
                      currentOverride &&
                      (currentOverride.category !== undefined ||
                        (currentOverride.tags !== undefined &&
                          currentOverride.tags.length > 0));
                    const expanded = expandedModuleId === mod.id;

                    return (
                      <Box
                        key={mod.id}
                        sx={{
                          borderBottom: 1,
                          borderColor: "divider",
                          "&:last-of-type": { borderBottom: 0 },
                          "&:before": { display: "none" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            py: 1.5,
                            px: 0,
                            opacity: enabled ? 1 : 0.7,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedModuleId((id) => (id === mod.id ? null : mod.id))
                            }
                            aria-expanded={expanded}
                            aria-label={expanded ? "Collapse" : "Configure"}
                            sx={{ mr: 0.5 }}
                          >
                            {expanded ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </IconButton>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body1"
                              fontWeight={500}
                              noWrap
                              sx={{ color: enabled ? "text.primary" : "text.secondary" }}
                            >
                              {mod.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ fontSize: "0.8125rem", mt: 0.25 }}
                            >
                              {mod.description}
                            </Typography>
                          </Box>
                          {expanded && hasOverrides && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e) => {
                                e.stopPropagation();
                                resetModuleOverrides(mod.id);
                                toast.success("Reset to defaults");
                              }}
                              sx={{ minWidth: 0, py: 0, fontSize: "0.8125rem" }}
                            >
                              Reset
                            </Button>
                          )}
                          <Switch
                            checked={enabled}
                            onChange={(_, checked) => handleToggle(mod.id, checked)}
                            inputProps={{ "aria-label": `Enable ${mod.name}` }}
                            size="small"
                          />
                        </Box>

                        <Collapse
                          in={expanded}
                          unmountOnExit
                          timeout={{ enter: 300, exit: 0 }}
                          sx={{
                            overflow: "hidden",
                            "& > div": {
                              border: "none",
                              boxShadow: "none",
                              outline: "none",
                              minHeight: 0,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              pl: 5,
                              pr: 0,
                              pb: 2,
                              pt: 0,
                              overflow: "hidden",
                            }}
                          >
                            <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                                <Typography variant="body2" color="text.secondary" sx={{ width: 72 }}>
                                  Category
                                </Typography>
                                <Autocomplete
                                  freeSolo
                                  size="small"
                                  options={["(Use default)", ...categories]}
                                  value={effectiveCategory}
                                  onInputChange={(_, value) => {
                                    const v = value?.trim();
                                    if (v && v !== "(Use default)" && !categories.includes(v))
                                      addCategory(v);
                                  }}
                                  onChange={(_, value) => {
                                    const v =
                                      typeof value === "string" ? value.trim() : value ?? "";
                                    if (v === "" || v === "(Use default)") {
                                      setCategoryOverride(mod.id, undefined);
                                    } else {
                                      addCategory(v);
                                      setCategoryOverride(mod.id, v);
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField {...params} placeholder="Default or select" size="small" />
                                  )}
                                  sx={{ minWidth: 180 }}
                                />
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="body2" color="text.secondary" sx={{ width: 72, pt: 0.5 }}>
                                  Tags
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                                  {effectiveTags.map((tag) => (
                                    <Chip
                                      key={tag}
                                      label={tag}
                                      size="small"
                                      variant="outlined"
                                      onDelete={() => {
                                        const next = effectiveTags.filter((t) => t !== tag);
                                        setTagsOverride(
                                          mod.id,
                                          next.length > 0 ? next : undefined
                                        );
                                      }}
                                    />
                                  ))}
                                  <ModuleTagAdder
                                    existing={effectiveTags}
                                    onAdd={(tag) => {
                                      const added = normalizeTags([...effectiveTags, tag]);
                                      setTagsOverride(mod.id, added);
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  });
                })()}
              </Stack>
            </Stack>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          <SettingsSectionHeader
            title="JWT Keys"
            subtitle="Per-org private keys used for JWT auth."
            actions={
              <Button variant="contained" size="small" onClick={() => setAddKeyDialogOpen(true)}>
                Add key
              </Button>
            }
          />
          <TableContainer sx={{ maxHeight: 360, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Org label</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" sx={{ width: 160, minWidth: 160, whiteSpace: "nowrap", pr: 2, verticalAlign: "middle" }}>
                      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>Actions</Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryLoading && inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>Loading…</TableCell>
                    </TableRow>
                  ) : inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          No keys saved. Click Add key to add one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((row) => (
                      <TableRow key={row.orgLabel}>
                        <TableCell>{row.orgLabel}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.hasJwtKey ? "Key present" : "Key missing"}
                            color={row.hasJwtKey ? "success" : "warning"}
                            variant="outlined"
                            size="small"
                          />
                          {row.updatedAt && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {new Date(row.updatedAt).toLocaleString()}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ width: 160, minWidth: 160, whiteSpace: "nowrap", pr: 1, verticalAlign: "middle" }}>
                          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                            <Tooltip title="Open key folder">
                              <IconButton
                                onClick={() => handleOpenKeyFolder(row.orgLabel)}
                                aria-label={`Open key folder for ${row.orgLabel}`}
                                size="small"
                              >
                                <FolderIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Replace key">
                              <IconButton
                                onClick={() => handleRowUploadClick(row.orgLabel)}
                                disabled={inventoryLoading}
                                aria-label={`Replace key for ${row.orgLabel}`}
                                size="small"
                              >
                                <UploadFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(row.orgLabel);
                                }}
                                disabled={inventoryLoading}
                                aria-label={`Delete key for ${row.orgLabel}`}
                                size="small"
                                color="error"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pem,.key"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
        </>
      )}

      <Dialog open={addKeyDialogOpen} onClose={handleAddKeyDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add key</DialogTitle>
        <DialogContent>
          <TextField
            label="Org label"
            value={addOrgLabel}
            onChange={(e) => setAddOrgLabel(e.target.value)}
            placeholder="e.g. QA, UAT, Prod"
            size="small"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            inputProps={{ maxLength: 64 }}
            autoFocus
          />
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <Button variant="outlined" component="label" disabled={inventoryLoading} size="small">
              Choose PEM
              <input
                type="file"
                accept=".pem,.key"
                hidden
                onChange={(e) => setAddOrgFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 0.5,
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {addOrgFile ? addOrgFile.name : "No file selected"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddKeyDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleAddKeyDialogUpload} disabled={addKeyUploadDisabled}>
            Upload key
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirmOrg}
        onClose={handleDeleteCancel}
        title="Delete this key?"
        body="This will permanently delete the JWT private key for this org from your local machine. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        confirmColor="error"
        loading={inventoryLoading}
      />
    </>
  );
}
