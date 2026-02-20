import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { ARTIFACTS_MODULES_ROOT } from "../../paths.js";
import { sanitizeModuleId, validateModulePath } from "../../modules/validator.js";

export async function registerBundleRoute(fastify: FastifyInstance) {
  fastify.get("/api/modules/:moduleId/bundle", async (req, reply) => {
    const { moduleId } = req.params as { moduleId: string };
    
    const sanitized = sanitizeModuleId(moduleId);
    if (!sanitized) {
      return reply.status(400).send({ error: "Invalid module ID" });
    }
    
    const bundlePath = path.join(ARTIFACTS_MODULES_ROOT, sanitized, "current", "bundle.mjs");
    
    if (!validateModulePath(bundlePath, ARTIFACTS_MODULES_ROOT)) {
      return reply.status(400).send({ error: "Invalid module path" });
    }
    
    try {
      await fs.access(bundlePath);
      const content = await fs.readFile(bundlePath, "utf-8");
      return reply
        .type("application/javascript")
        .header("Cache-Control", "public, max-age=3600")
        .send(content);
    } catch {
      return reply.status(404).send({ error: "Module bundle not found" });
    }
  });
}
