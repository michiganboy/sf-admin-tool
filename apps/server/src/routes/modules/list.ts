import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { ARTIFACTS_MODULES_ROOT } from "../../paths.js";
import { getModuleMetadata } from "../../modules/loader.js";

export async function registerListRoute(fastify: FastifyInstance) {
  fastify.get("/api/modules", async (_req, reply) => {
    try {
      const modules = [];
      
      try {
        const dirs = await fs.readdir(ARTIFACTS_MODULES_ROOT, { withFileTypes: true });
        for (const dir of dirs) {
          if (!dir.isDirectory()) continue;
          
          const metadata = await getModuleMetadata(dir.name);
          if (metadata) {
            modules.push(metadata);
          }
        }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
          return reply.send([]);
        }
        throw err;
      }
      
      modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
      return reply.send(modules);
    } catch (err) {
      console.error("GET /api/modules failed:", err);
      return reply.status(500).send({ error: "Failed to list modules" });
    }
  });
}
