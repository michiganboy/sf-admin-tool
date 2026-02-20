import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** App-specific data roots; defaults are OS-specific user-writable folders. */
const APP_NAME = "sf-admin-tool";

function getAppDataRoot(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(process.env.HOME ?? process.cwd(), "Library", "Application Support");
  }
  return process.env.XDG_DATA_HOME ?? path.join(process.env.HOME ?? process.cwd(), ".local", "share");
}

const APP_DATA_DIR = path.join(getAppDataRoot(), APP_NAME);

const ARTIFACTS_ROOT = process.env.ARTIFACTS_ROOT ?? path.join(APP_DATA_DIR, "artifacts");
const SECRETS_ROOT = process.env.SECRETS_ROOT ?? path.join(APP_DATA_DIR, "secrets");

/** Runs stored as JSON files under ARTIFACTS_ROOT. */
const RUNS_DIR = path.join(ARTIFACTS_ROOT, "runs");

const RUN_STATUSES = ["queued", "running", "completed", "failed"] as const;

type RunRecord = {
  id: string;
  createdAt: string;
  moduleId: string;
  moduleName: string;
  orgLabel: string;
  notes?: string;
  status: string;
};

function isValidRunRecord(body: unknown): body is RunRecord {
  if (body == null || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.moduleId === "string" &&
    typeof o.moduleName === "string" &&
    typeof o.orgLabel === "string" &&
    (o.notes === undefined || typeof o.notes === "string") &&
    typeof o.status === "string" &&
    RUN_STATUSES.includes(o.status as (typeof RUN_STATUSES)[number])
  );
}

async function ensureRunsDir(): Promise<void> {
  await fs.mkdir(RUNS_DIR, { recursive: true });
}

async function listRunIds(): Promise<string[]> {
  try {
    await ensureRunsDir();
    const names = await fs.readdir(RUNS_DIR);
    return names.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5));
  } catch (err) {
    console.warn("listRunIds failed:", RUNS_DIR, err);
    return [];
  }
}

// Only log errors and warnings, not every HTTP request.
const fastify = Fastify({
  logger: { level: "warn" },
});

fastify.register(fastifyMultipart, { limits: { fileSize: 64 * 1024 } });

fastify.setErrorHandler((err, _req, reply) => {
  console.error("Unhandled error:", err);
  const message = err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
    ? (err as Error).message
    : "Internal Server Error";
  void reply.status(500).send({ error: message });
});

fastify.get("/api/health", async () => ({ ok: true }));

fastify.get("/api/runs", async (_req, reply) => {
  try {
    const ids = await listRunIds();
    const runs: RunRecord[] = [];
    for (const id of ids) {
      try {
        const raw = await fs.readFile(path.join(RUNS_DIR, `${id}.json`), "utf-8");
        const run = JSON.parse(raw) as RunRecord;
        runs.push(run);
      } catch {
        // Skip corrupt or missing file.
      }
    }
    runs.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return reply.send(runs);
  } catch (err) {
    console.warn("GET /api/runs failed:", err);
    return reply.send([]);
  }
});

fastify.get("/api/runs/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!id || id.includes("..") || id.includes("/")) {
    return reply.status(400).send({ error: "Invalid id" });
  }
  const filePath = path.join(RUNS_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const run = JSON.parse(raw) as RunRecord;
    return reply.send(run);
  } catch {
    return reply.status(404).send({ error: "Not found" });
  }
});

fastify.post("/api/runs", async (req, reply) => {
  try {
    const body = req.body as unknown;
    if (!isValidRunRecord(body)) {
      return reply.status(400).send({ error: "Invalid run manifest" });
    }
    if (!body.orgLabel?.trim()) return reply.status(400).send({ error: "orgLabel is required" });
    if (!body.moduleId?.trim()) return reply.status(400).send({ error: "moduleId is required" });
    if (!body.moduleName?.trim()) return reply.status(400).send({ error: "moduleName is required" });

    await ensureRunsDir();
    const filePath = path.join(RUNS_DIR, `${body.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf-8");
    console.log(`[RUN] Created: ${body.id} (${body.moduleName}, ${body.orgLabel}, status: ${body.status})`);
    return reply.status(201).send(body);
  } catch (err) {
    console.error("POST /api/runs failed:", err);
    return reply.status(500).send({ error: err instanceof Error ? err.message : "Failed to create run" });
  }
});

fastify.delete("/api/runs/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!id || id.includes("..") || id.includes("/")) {
    return reply.status(400).send({ error: "Invalid id" });
  }
  const filePath = path.join(RUNS_DIR, `${id}.json`);
  try {
    await fs.unlink(filePath);
    console.log(`[RUN] Deleted: ${id}`);
    return reply.status(204).send();
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT") {
      return reply.status(404).send({ error: "Not found" });
    }
    console.warn("DELETE /api/runs/:id failed:", err);
    return reply.status(500).send({ error: err instanceof Error ? err.message : "Failed to delete run" });
  }
});

fastify.delete("/api/runs", async (_req, reply) => {
  try {
    const ids = await listRunIds();
    const count = ids.length;
    for (const id of ids) {
      await fs.unlink(path.join(RUNS_DIR, `${id}.json`)).catch(() => {});
    }
    console.log(`[RUN] Deleted ${count} run(s)`);
    return reply.status(204).send();
  } catch (err) {
    console.warn("DELETE /api/runs failed:", err);
    return reply.status(204).send();
  }
});

/** orgLabel: trimmed, 1–64 chars, no path separators or .. */
function isValidOrgLabel(orgLabel: string): boolean {
  const t = orgLabel.trim();
  if (t.length < 1 || t.length > 64) return false;
  if (t.includes("..") || t.includes("/") || t.includes("\\")) return false;
  return true;
}

/** List orgs with JWT key status and optional jwt.pem mtime (no key contents). */
fastify.get("/api/secrets/orgs", async (_req, reply) => {
  try {
    const entries = await fs.readdir(SECRETS_ROOT, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    const list: { orgLabel: string; hasJwtKey: boolean; updatedAt?: string }[] = [];
    for (const d of dirs) {
      const jwtPemPath = path.join(SECRETS_ROOT, d.name, "jwt.pem");
      let hasJwtKey = false;
      let updatedAt: string | undefined;
      try {
        const stat = await fs.stat(jwtPemPath);
        hasJwtKey = true;
        updatedAt = stat.mtime.toISOString();
      } catch {
        // file missing or not readable
      }
      list.push({ orgLabel: d.name, hasJwtKey, ...(updatedAt && { updatedAt }) });
    }
    list.sort((a, b) => a.orgLabel.localeCompare(b.orgLabel));
    return reply.send(list);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return reply.send([]);
    }
    throw err;
  }
});

/** Absolute path to the org secrets folder (for open-folder / copy); same orgLabel validation. */
fastify.get("/api/secrets/orgs/:orgLabel/path", async (req, reply) => {
  const { orgLabel } = req.params as { orgLabel: string };
  if (!isValidOrgLabel(orgLabel)) {
    return reply.status(400).send({ error: "Invalid orgLabel" });
  }
  const label = orgLabel.trim();
  const orgDir = path.resolve(path.join(SECRETS_ROOT, label));
  return reply.send({ path: orgDir });
});

/** Open the org secrets folder in the OS file manager (explorer / open / xdg-open). */
fastify.post("/api/secrets/orgs/:orgLabel/open-folder", async (req, reply) => {
  const { orgLabel } = req.params as { orgLabel: string };
  if (!isValidOrgLabel(orgLabel)) {
    return reply.status(400).send({ ok: false, error: "Invalid orgLabel" });
  }
  const label = orgLabel.trim();
  const orgDir = path.resolve(path.join(SECRETS_ROOT, label));
  const platform = process.platform;
  const cmd = platform === "win32" ? "explorer" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? [orgDir] : [orgDir];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.on("error", (err) => {
      console.warn(`[secrets] open-folder failed: ${orgDir}`, err.message);
    });
    child.unref();
    return reply.send({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.send({ ok: false, error: message });
  }
});

/** JWT key present if jwt.pem exists in org folder; never returns key contents. */
fastify.get("/api/secrets/orgs/:orgLabel/status", async (req, reply) => {
  const { orgLabel } = req.params as { orgLabel: string };
  if (!isValidOrgLabel(orgLabel)) {
    return reply.status(400).send({ error: "Invalid orgLabel" });
  }
  const label = orgLabel.trim();
  const orgDir = path.join(SECRETS_ROOT, label);
  const jwtPemPath = path.join(orgDir, "jwt.pem");
  let hasJwtKey = false;
  try {
    await fs.access(jwtPemPath);
    hasJwtKey = true;
  } catch {
    // file does not exist
  }
  return reply.send({ orgLabel: label, hasJwtKey });
});

/** Accept one file via multipart; save as jwt.pem in org folder (overwrite allowed). */
fastify.post("/api/secrets/orgs/:orgLabel/jwt-key", async (req, reply) => {
  const { orgLabel } = req.params as { orgLabel: string };
  if (!isValidOrgLabel(orgLabel)) {
    return reply.status(400).send({ error: "Invalid orgLabel" });
  }
  const label = orgLabel.trim();
  const data = await req.file();
  if (!data) {
    return reply.status(400).send({ error: "No file uploaded" });
  }
  const buf = await data.toBuffer();
  const orgDir = path.join(SECRETS_ROOT, label);
  await fs.mkdir(orgDir, { recursive: true });
  const jwtPemPath = path.join(orgDir, "jwt.pem");
  await fs.writeFile(jwtPemPath, buf);
  return reply.send({ ok: true });
});

/** Delete jwt.pem for the org if it exists; remove org dir if empty so list no longer shows it. */
fastify.delete("/api/secrets/orgs/:orgLabel/jwt-key", async (req, reply) => {
  const { orgLabel } = req.params as { orgLabel: string };
  if (!isValidOrgLabel(orgLabel)) {
    return reply.status(400).send({ error: "Invalid orgLabel" });
  }
  const label = orgLabel.trim();
  const orgDir = path.join(SECRETS_ROOT, label);
  const jwtPemPath = path.join(orgDir, "jwt.pem");
  try {
    await fs.unlink(jwtPemPath);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      // already missing
    } else {
      throw err;
    }
  }
  try {
    await fs.rmdir(orgDir);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY") {
        // dir already gone or has other files
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }
  return reply.send({ ok: true });
});

// Static assets built by Vite under repoRoot/dist.
// __dirname is apps/server/dist at runtime, so go up three levels.
const WEB_ROOT = path.resolve(__dirname, "../../../dist");

fastify.register(fastifyStatic, {
  root: WEB_ROOT,
  prefix: "/",
  index: "index.html",
});

fastify.get("/", async (_req, reply) => {
  try {
    const html = await fs.readFile(path.join(WEB_ROOT, "index.html"), "utf-8");
    return reply.type("text/html").send(html);
  } catch {
    return reply.status(404).send({ error: "index.html not found" });
  }
});

fastify.setNotFoundHandler((_, reply) => {
  return reply.type("text/html").sendFile("index.html");
});

const PORT = 4387;
fastify.listen({ port: PORT, host: "127.0.0.1" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server at ${address}`);
  console.log(`RUNS_DIR=${RUNS_DIR}`);
  console.log(`ARTIFACTS_ROOT=${ARTIFACTS_ROOT}`);
  console.log(`SECRETS_ROOT=${SECRETS_ROOT}`);
  console.log(`WEB_ROOT=${WEB_ROOT}`);
});
