import { useCallback, useMemo, useState } from "react";
import type { RunRecord } from "../../runs/types";

export type TimeRange = "all" | "24h" | "7d" | "30d";
export type SortOption = "timeDesc" | "timeAsc" | "module" | "org" | "status";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_ROWS_PER_PAGE = 25;

function matchesSearch(run: RunRecord, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const fields = [
    run.id,
    run.moduleName,
    run.orgLabel,
    run.notes ?? "",
    run.status,
  ];
  return fields.some((f) => f.toLowerCase().includes(lower));
}

function inTimeRange(run: RunRecord, range: TimeRange): boolean {
  if (range === "all") return true;
  const t = new Date(run.createdAt).getTime();
  const now = Date.now();
  const ms =
    range === "24h"
      ? 24 * 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  return t >= now - ms;
}

function compareRuns(a: RunRecord, b: RunRecord, sort: SortOption): number {
  switch (sort) {
    case "timeDesc":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "timeAsc":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "module":
      return a.moduleName.localeCompare(b.moduleName);
    case "org":
      return a.orgLabel.localeCompare(b.orgLabel);
    case "status":
      return a.status.localeCompare(b.status);
    default:
      return 0;
  }
}

export interface RunsTableState {
  search: string;
  setSearch: (v: string) => void;
  selectedModules: string[];
  setSelectedModules: (v: string[]) => void;
  selectedOrgs: string[];
  setSelectedOrgs: (v: string[]) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (v: string[]) => void;
  timeRange: TimeRange;
  setTimeRange: (v: TimeRange) => void;
  sort: SortOption;
  setSort: (v: SortOption) => void;
  page: number;
  setPage: (v: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (v: number) => void;
  clearFilters: () => void;
  moduleOptions: string[];
  orgOptions: string[];
  statusOptions: string[];
  filteredSortedRuns: RunRecord[];
  pagedRuns: RunRecord[];
  totalFiltered: number;
  rowsPerPageOptions: number[];
}

export function useRunsTableState(runs: RunRecord[]): RunsTableState {
  const [search, setSearch] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sort, setSort] = useState<SortOption>("timeDesc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const setSearchAndResetPage = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);
  const setSelectedModulesAndResetPage = useCallback((v: string[]) => {
    setSelectedModules(v);
    setPage(0);
  }, []);
  const setSelectedOrgsAndResetPage = useCallback((v: string[]) => {
    setSelectedOrgs(v);
    setPage(0);
  }, []);
  const setSelectedStatusesAndResetPage = useCallback((v: string[]) => {
    setSelectedStatuses(v);
    setPage(0);
  }, []);
  const setTimeRangeAndResetPage = useCallback((v: TimeRange) => {
    setTimeRange(v);
    setPage(0);
  }, []);
  const setSortAndResetPage = useCallback((v: SortOption) => {
    setSort(v);
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedModules([]);
    setSelectedOrgs([]);
    setSelectedStatuses([]);
    setTimeRange("all");
    setSort("timeDesc");
    setPage(0);
  }, []);

  const moduleOptions = useMemo(() => {
    const set = new Set(runs.map((r) => r.moduleName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [runs]);

  const orgOptions = useMemo(() => {
    const set = new Set(runs.map((r) => r.orgLabel));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [runs]);

  const statusOptions = useMemo(() => {
    const set = new Set(runs.map((r) => r.status));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [runs]);

  const filteredSortedRuns = useMemo(() => {
    let list = runs.filter(
      (r) =>
        matchesSearch(r, search) &&
        inTimeRange(r, timeRange) &&
        (selectedModules.length === 0 || selectedModules.includes(r.moduleName)) &&
        (selectedOrgs.length === 0 || selectedOrgs.includes(r.orgLabel)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(r.status))
    );
    list = [...list].sort((a, b) => compareRuns(a, b, sort));
    return list;
  }, [
    runs,
    search,
    timeRange,
    selectedModules,
    selectedOrgs,
    selectedStatuses,
    sort,
  ]);

  const totalFiltered = filteredSortedRuns.length;

  const pagedRuns = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSortedRuns.slice(start, start + rowsPerPage);
  }, [filteredSortedRuns, page, rowsPerPage]);

  return {
    search,
    setSearch: setSearchAndResetPage,
    selectedModules,
    setSelectedModules: setSelectedModulesAndResetPage,
    selectedOrgs,
    setSelectedOrgs: setSelectedOrgsAndResetPage,
    selectedStatuses,
    setSelectedStatuses: setSelectedStatusesAndResetPage,
    timeRange,
    setTimeRange: setTimeRangeAndResetPage,
    sort,
    setSort: setSortAndResetPage,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    clearFilters,
    moduleOptions,
    orgOptions,
    statusOptions,
    filteredSortedRuns,
    pagedRuns,
    totalFiltered,
    rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
  };
}
