import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const REPO_ROOT = path.resolve(__dirname, "../../..");
export const DEFAULT_MODULES_ROOT = path.join(REPO_ROOT, "default-modules");
export const ARTIFACTS_MODULES_ROOT = path.join(ARTIFACTS_ROOT, "modules");
