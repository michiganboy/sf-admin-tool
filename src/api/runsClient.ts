import type { RunRecord } from "../runs/types";

const API = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const hasBody = options?.body !== undefined && options?.body !== null;
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    if (res.status === 500 && !text) {
      message = "Server error (500). Is the API server running? Start with: npm run dev";
    } else if (text.startsWith("{")) {
      try {
        const json = JSON.parse(text) as { error?: string };
        if (json.error) message = json.error;
      } catch {
        // use text as-is
      }
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Health check. */
export async function health(): Promise<{ ok: boolean }> {
  return request("/health");
}

/** List all run manifests, newest first. */
export async function fetchRuns(): Promise<RunRecord[]> {
  return request<RunRecord[]>("/runs");
}

/** Fetch a single run by id. */
export async function fetchRunById(id: string): Promise<RunRecord | null> {
  try {
    return await request<RunRecord>(`/runs/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

/** Create a run manifest; returns the created run. */
export async function createRun(run: RunRecord): Promise<RunRecord> {
  return request<RunRecord>("/runs", {
    method: "POST",
    body: JSON.stringify(run),
  });
}

/** Delete a single run by id. Throws on 404 or other error. */
export async function deleteRun(id: string): Promise<void> {
  await request(`/runs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Delete all run manifests. */
export async function deleteAllRuns(): Promise<void> {
  await request("/runs", { method: "DELETE" });
}
