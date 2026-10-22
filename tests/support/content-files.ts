import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  contentFor,
  readContent,
  type ContentData,
} from "../../src/content/content-repository.ts";
import type { RulesetId } from "../../src/engine/index.ts";

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

/** The content for one ruleset, from an arbitrary `load`. */
export async function loadContent(
  load: (path: string) => Promise<string>,
  rulesetId: RulesetId,
): Promise<ContentData> {
  return contentFor(await readContent(load), rulesetId);
}

/** The shipped content for one ruleset, read from disk. */
export function loadView(rulesetId: RulesetId): Promise<ContentData> {
  return loadContent(loadFromPublic, rulesetId);
}
