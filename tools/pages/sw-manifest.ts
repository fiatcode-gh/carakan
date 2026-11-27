export interface PrecacheEntry {
  url: string;
  revision: string | null;
}

const ENTRY = /\{url:"([^"]+)",revision:(null|"([0-9a-f]{32})")\}/g;
const WORKBOX = /define\(\["\.\/(workbox-[0-9a-f]+)"/;

/** Precache entries from a generated sw.js, deduplicated by url, first-seen order. */
export function parsePrecache(sw: string): PrecacheEntry[] {
  const byUrl = new Map<string, PrecacheEntry>();
  for (const [, url, , hex] of sw.matchAll(ENTRY)) {
    const revision = hex ?? null;
    const seen = byUrl.get(url!);
    if (seen === undefined) byUrl.set(url!, { url: url!, revision });
    else if (seen.revision !== revision) {
      throw new Error(`conflicting revisions for ${url}`);
    }
  }
  if (byUrl.size === 0) throw new Error("sw.js lists no precache entries");
  if (!byUrl.has("index.html")) throw new Error("index.html is not precached");
  return [...byUrl.values()];
}

/** File name of the workbox runtime sw.js imports, e.g. "workbox-2fbc6a65.js". */
export function workboxScript(sw: string): string {
  const match = WORKBOX.exec(sw);
  if (match === null) throw new Error("sw.js imports no workbox-<hash> script");
  return `${match[1]}.js`;
}
