/**
 * Validates and sanitizes module IDs.
 * Module IDs must be: alphanumeric, dash, underscore only; 1-64 chars.
 */

export function isValidModuleId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return false;
  return /^[a-z0-9_-]+$/i.test(trimmed);
}

export function sanitizeModuleId(id: string): string | null {
  if (!id || typeof id !== "string") return null;
  const trimmed = id.trim();
  if (!isValidModuleId(trimmed)) return null;
  return trimmed;
}

export function validateModulePath(filePath: string, allowedRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const root = path.resolve(allowedRoot);
  return resolved.startsWith(root + path.sep) || resolved === root;
}

import path from "node:path";
