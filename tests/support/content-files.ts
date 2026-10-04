import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Reads a shipped content file (`public/content/v1/<name>`) from disk. */
export function readContentText(name: string): string {
  return readFileSync(join("public", "content", "v1", name), "utf8");
}

export function readContentJson(name: string): Record<string, unknown> {
  return JSON.parse(readContentText(name)) as Record<string, unknown>;
}

/** The `load` the repository takes, reading `public/` from disk. */
export async function loadFromPublic(path: string): Promise<string> {
  return readFileSync(join("public", path), "utf8");
}
