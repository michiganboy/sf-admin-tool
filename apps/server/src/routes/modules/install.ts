import type { FastifyInstance } from "fastify";
import { installModule } from "../../modules/installer.js";
import { sanitizeModuleId } from "../../modules/validator.js";

export async function registerInstallRoute(fastify: FastifyInstance) {
  fastify.post("/api/module-catalog/install", async (req, reply) => {
    try {
      const body = req.body as unknown;
      if (!body || typeof body !== "object") {
        return reply.status(400).send({ error: "Invalid request body" });
      }
      
      const { moduleIds } = body as { moduleIds?: unknown };
      if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
        return reply.status(400).send({ error: "moduleIds must be a non-empty array" });
      }
      
      if (moduleIds.length > 100) {
        return reply.status(400).send({ error: "Too many moduleIds (max 100)" });
      }
      
      const sanitized = moduleIds
        .map((id) => (typeof id === "string" ? sanitizeModuleId(id) : null))
        .filter((id): id is string => id !== null);
      
      if (sanitized.length !== moduleIds.length) {
        return reply.status(400).send({ error: "Invalid module IDs in array" });
      }
      
      const installed: string[] = [];
      const skipped: string[] = [];
      
      for (const moduleId of sanitized) {
        try {
          await installModule(moduleId);
          installed.push(moduleId);
        } catch (err) {
          console.warn(`Failed to install module ${moduleId}:`, err);
          skipped.push(moduleId);
        }
      }
      
      return reply.send({ installed, skipped });
    } catch (err) {
      console.error("POST /api/module-catalog/install failed:", err);
      return reply.status(500).send({ error: err instanceof Error ? err.message : "Failed to install modules" });
    }
  });
}
