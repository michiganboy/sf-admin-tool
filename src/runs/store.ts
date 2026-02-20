import type { RunRecord } from "./types";
import {
  createRun,
  deleteAllRuns,
  deleteRun as deleteRunApi,
  fetchRunById,
  fetchRuns,
} from "../api/runsClient";

/** Returns all runs from API, newest first. */
export async function listRuns(): Promise<RunRecord[]> {
  return fetchRuns();
}

/** Returns a single run by id from API, or undefined. */
export async function getRunById(id: string): Promise<RunRecord | undefined> {
  const run = await fetchRunById(id);
  return run ?? undefined;
}

/** Creates a run via API; returns the created run. */
export async function addRun(run: RunRecord): Promise<RunRecord> {
  return createRun(run);
}

/** Deletes a single run via API. Throws if not found or on error. */
export async function deleteRun(id: string): Promise<void> {
  await deleteRunApi(id);
}

/** Deletes all runs via API. */
export async function clearRuns(): Promise<void> {
  await deleteAllRuns();
}
