import type { FastifyInstance } from "fastify";
import { discoverDefaultModules, discoverInstalledModules, mergeCatalogEntries } from "../../modules/catalog.js";

export async function registerCatalogRoute(fastify: FastifyInstance) {
  fastify.get("/api/module-catalog", async (_req, reply) => {
    try {
      const defaults = await discoverDefaultModules();
      const installed = await discoverInstalledModules();
      const merged = mergeCatalogEntries(defaults, installed);
      return reply.send(merged);
    } catch (err) {
      console.error("GET /api/module-catalog failed:", err);
      return reply.status(500).send({ error: "Failed to load catalog" });
    }
  });
}
