const API = "/api";

export type JwtKeyStatus = { orgLabel: string; hasJwtKey: boolean };

export type JwtKeyEntry = { orgLabel: string; hasJwtKey: boolean; updatedAt?: string };

/** List all orgs with JWT key status (no key contents). */
export async function listJwtKeys(): Promise<JwtKeyEntry[]> {
  const res = await fetch(`${API}/secrets/orgs`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<JwtKeyEntry[]>;
}

/** Whether jwt.pem exists for the org; does not return key contents. */
export async function getJwtKeyStatus(orgLabel: string): Promise<JwtKeyStatus> {
  const label = orgLabel.trim();
  if (!label) throw new Error("Org label is required");
  const res = await fetch(`${API}/secrets/orgs/${encodeURIComponent(label)}/status`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<JwtKeyStatus>;
}

/** Upload a single file as jwt.pem for the org (overwrites if present). */
export async function uploadJwtKey(orgLabel: string, file: File): Promise<{ ok: boolean }> {
  const label = orgLabel.trim();
  if (!label) throw new Error("Org label is required");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/secrets/orgs/${encodeURIComponent(label)}/jwt-key`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean }>;
}

/** Absolute path to the org secrets folder (e.g. for copy-to-clipboard fallback). */
export async function getOrgSecretsPath(orgLabel: string): Promise<{ path: string }> {
  const label = orgLabel.trim();
  if (!label) throw new Error("Org label is required");
  const res = await fetch(`${API}/secrets/orgs/${encodeURIComponent(label)}/path`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ path: string }>;
}

/** Ask server to open the org secrets folder in the OS file manager. */
export async function openOrgSecretsFolder(orgLabel: string): Promise<{ ok: boolean; error?: string }> {
  const label = orgLabel.trim();
  if (!label) return { ok: false, error: "Org label is required" };
  const res = await fetch(`${API}/secrets/orgs/${encodeURIComponent(label)}/open-folder`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
  return { ok: data.ok === true, error: data.error };
}

/** Delete jwt.pem for the org if present. */
export async function deleteJwtKey(orgLabel: string): Promise<{ ok: boolean }> {
  const label = orgLabel.trim();
  if (!label) throw new Error("Org label is required");
  const res = await fetch(`${API}/secrets/orgs/${encodeURIComponent(label)}/jwt-key`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean }>;
}
