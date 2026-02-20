const API = "/api";

export interface Manifest {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  category: "admin" | "hygiene" | "diagnostics";
  sectionCategory?: string;
  tags?: string[];
}

export interface CatalogEntry {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
  source: "default" | "installed";
  manifest?: Manifest;
}

export interface InstalledModule {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installedAt: string;
  manifest: Manifest;
}

export interface InstallResponse {
  installed: string[];
  skipped: string[];
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  const res = await fetch(`${API}/module-catalog`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<CatalogEntry[]>;
}

export async function installModules(moduleIds: string[]): Promise<InstallResponse> {
  const res = await fetch(`${API}/module-catalog/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleIds }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<InstallResponse>;
}

export async function listModules(): Promise<InstalledModule[]> {
  const res = await fetch(`${API}/modules`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<InstalledModule[]>;
}

export function getModuleBundleUrl(moduleId: string): string {
  return `${API}/modules/${encodeURIComponent(moduleId)}/bundle`;
}

export async function uninstallModule(moduleId: string): Promise<void> {
  const res = await fetch(`${API}/modules/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  if (res.status !== 204) {
    await res.json();
  }
}
