/** Same-origin relative clip files only: no scheme, host, parent or subfolder. */
const clipPath = /^audio\/[A-Za-z0-9._-]+\.(ogg|opus|mp3|m4a|wav)$/;

/**
 * Parses `audio/clips.json`: reading text (PUJL) to the clip's path relative to
 * the app base. One invalid entry rejects the whole manifest.
 */
export function parseClipManifest(text: string): ReadonlyMap<string, string> {
  const data: unknown = JSON.parse(text);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("clip manifest is not an object");
  }
  const { version, clips } = data as Record<string, unknown>;
  if (version !== 1) throw new Error(`unsupported clip manifest ${version}`);
  if (typeof clips !== "object" || clips === null || Array.isArray(clips)) {
    throw new Error("clip manifest has no clips object");
  }
  const map = new Map<string, string>();
  for (const [key, path] of Object.entries(clips)) {
    if (key === "") throw new Error("clip manifest has an empty key");
    if (typeof path !== "string" || !clipPath.test(path)) {
      throw new Error(`clip manifest path for "${key}" is not allowed`);
    }
    map.set(key, path);
  }
  return map;
}
