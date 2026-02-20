import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { ARTIFACTS_MODULES_ROOT } from "../../paths.js";
import { sanitizeModuleId, validateModulePath } from "../../modules/validator.js";

export async function registerUninstallRoute(fastify: FastifyInstance) {
  fastify.delete("/api/modules/:moduleId", async (req, reply) => {
    const { moduleId } = req.params as { moduleId: string };
    
    const sanitized = sanitizeModuleId(moduleId);
    if (!sanitized) {
      return reply.status(400).send({ error: "Invalid module ID" });
    }
    
    const moduleDir = path.join(ARTIFACTS_MODULES_ROOT, sanitized);
    
    if (!validateModulePath(moduleDir, ARTIFACTS_MODULES_ROOT)) {
      return reply.status(400).send({ error: "Invalid module path" });
    }
    
    try {
      await fs.access(moduleDir);
      await fs.rm(moduleDir, { recursive: true, force: true });
      return reply.status(204).send();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.status(404).send({ error: "Module not found" });
      }
      console.error("DELETE /api/modules/:moduleId failed:", err);
      return reply.status(500).send({ error: "Failed to uninstall module" });
    }
  });
}
