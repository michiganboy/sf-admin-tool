import type { FastifyInstance } from "fastify";
import { registerCatalogRoute } from "./modules/catalog.js";
import { registerInstallRoute } from "./modules/install.js";
import { registerListRoute } from "./modules/list.js";
import { registerBundleRoute } from "./modules/bundle.js";
import { registerUninstallRoute } from "./modules/uninstall.js";

export async function registerRoutes(fastify: FastifyInstance) {
  await registerCatalogRoute(fastify);
  await registerInstallRoute(fastify);
  await registerListRoute(fastify);
  await registerBundleRoute(fastify);
  await registerUninstallRoute(fastify);
}
