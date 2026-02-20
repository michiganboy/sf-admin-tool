import { useCallback, useEffect, useState } from "react";
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { RunRecord } from "../runs/types";
import { health } from "../api/runsClient";
import PageHeader from "../components/PageHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { clearRuns, deleteRun, listRuns } from "../runs/store";
import {
  useRunsTableState,
  type SortOption,
  type TimeRange,
} from "./runs/useRunsTableState";

export interface RunsPageProps {
  onSelectRun: (runId: string) => void;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  all: "All time",
  "24h": "Last 24h",
  "7d": "Last 7d",
  "30d": "Last 30d",
};

const SORT_LABELS: Record<SortOption, string> = {
  timeDesc: "Time (newest first)",
  timeAsc: "Time (oldest first)",
  module: "Module",
  org: "Org",
  status: "Status",
};

/** Historical runs and diffs view. */
export default function RunsPage({ onSelectRun }: RunsPageProps) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const toast = useToast();
  const tableState = useRunsTableState(runs);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await health();
    } catch {
      setLoading(false);
      setError("API server not reachable. From the project root run: npm run dev");
      return;
    }
    try {
      const data = await listRuns();
      setRuns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load runs");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClearClick = () => setClearDialogOpen(true);
  const handleClearDialogClose = () => setClearDialogOpen(false);

  const handleClearConfirm = async () => {
    setClearDialogOpen(false);
    try {
      await clearRuns();
      await load();
      toast.success("Runs cleared");
    } catch {
      setError("Failed to clear runs");
      toast.error("Failed to clear runs");
    }
  };

  const handleDeleteRunClick = useCallback((runId: string) => {
    setDeleteRunId(runId);
  }, []);
  const handleDeleteRunCancel = useCallback(() => setDeleteRunId(null), []);

  const handleDeleteRunConfirm = useCallback(async () => {
    const id = deleteRunId;
    setDeleteRunId(null);
    if (!id) return;
    try {
      await deleteRun(id);
      await load();
      toast.success("Run deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete run");
    }
  }, [deleteRunId, load, toast]);

  const handlePageChange = useCallback(
    (_: unknown, newPage: number) => tableState.setPage(newPage),
    [tableState]
  );
  const handleRowsPerPageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      tableState.setRowsPerPage(parseInt(e.target.value, 10));
      tableState.setPage(0);
    },
    [tableState]
  );

  return (
    <>
      <PageHeader
        title="Runs"
        subtitle="This will show historical runs loaded from local JSON artifacts, plus diffs between runs."
        actions={
          <Button
            onClick={handleClearClick}
            variant="outlined"
            disabled={runs.length === 0 || loading}
          >
            Clear runs
          </Button>
        }
      />

      <ConfirmDialog
        open={clearDialogOpen}
        onClose={handleClearDialogClose}
        title="Clear all runs?"
        body="This will permanently delete all saved run artifacts from your local machine. This cannot be undone."
        confirmLabel="Clear runs"
        cancelLabel="Cancel"
        onConfirm={handleClearConfirm}
        confirmColor="error"
      />

      <ConfirmDialog
        open={!!deleteRunId}
        onClose={handleDeleteRunCancel}
        title="Delete this run?"
        body="This will permanently delete this run artifact from your local machine. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteRunConfirm}
        confirmColor="error"
      />

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {loading && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading…
        </Typography>
      )}
      {!loading && !error && runs.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No runs yet. Start a run from a module to see it here.
        </Typography>
      )}

      {!loading && !error && runs.length > 0 && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Filters
            </Typography>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <TextField
                size="small"
                label="Search"
                placeholder="Module, org, notes, status, id…"
                value={tableState.search}
                onChange={(e) => tableState.setSearch(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Module</InputLabel>
                <Select<string[]>
                  multiple
                  label="Module"
                  value={tableState.selectedModules}
                  onChange={(e) => {
                    const v = e.target.value;
                    tableState.setSelectedModules(
                      typeof v === "string" ? (v ? [v] : []) : v
                    );
                  }}
                  renderValue={(v) => (v.length ? v.join(", ") : "All")}
                >
                  {tableState.moduleOptions.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Org</InputLabel>
                <Select<string[]>
                  multiple
                  label="Org"
                  value={tableState.selectedOrgs}
                  onChange={(e) => {
                    const v = e.target.value;
                    tableState.setSelectedOrgs(
                      typeof v === "string" ? (v ? [v] : []) : v
                    );
                  }}
                  renderValue={(v) => (v.length ? v.join(", ") : "All")}
                >
                  {tableState.orgOptions.map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select<string[]>
                  multiple
                  label="Status"
                  value={tableState.selectedStatuses}
                  onChange={(e) => {
                    const v = e.target.value;
                    tableState.setSelectedStatuses(
                      typeof v === "string" ? (v ? [v] : []) : v
                    );
                  }}
                  renderValue={(v) => (v.length ? v.join(", ") : "All")}
                >
                  {tableState.statusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Time range</InputLabel>
                <Select
                  label="Time range"
                  value={tableState.timeRange}
                  onChange={(e) =>
                    tableState.setTimeRange(e.target.value as TimeRange)
                  }
                >
                  {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
                    <MenuItem key={r} value={r}>
                      {TIME_RANGE_LABELS[r]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Sort</InputLabel>
                <Select
                  label="Sort"
                  value={tableState.sort}
                  onChange={(e) =>
                    tableState.setSort(e.target.value as SortOption)
                  }
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                    <MenuItem key={s} value={s}>
                      {SORT_LABELS[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                onClick={tableState.clearFilters}
              >
                Clear filters
              </Button>
            </div>
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>Org</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" padding="checkbox">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableState.pagedRuns.map((run) => (
                  <TableRow
                    key={run.id}
                    onClick={() => onSelectRun(run.id)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <TableCell>
                      {new Date(run.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{run.moduleName}</TableCell>
                    <TableCell>{run.orgLabel}</TableCell>
                    <TableCell>{run.notes ?? "—"}</TableCell>
                    <TableCell>{run.status}</TableCell>
                    <TableCell align="right" padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete run ${run.id}`}
                          onClick={() => handleDeleteRunClick(run.id)}
                          disabled={loading}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={tableState.totalFiltered}
              page={tableState.page}
              onPageChange={handlePageChange}
              rowsPerPage={tableState.rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={tableState.rowsPerPageOptions}
              showFirstButton
              showLastButton
            />
          </TableContainer>
        </>
      )}
    </>
  );
}
