import { readdirSync, readFileSync, statSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, join, relative } from "node:path";

export const ACCEPT_ENCODING = "gzip, deflate, br, zstd";

export interface Fetched {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  rawHeaders: string[];
  statusMessage: string;
  body: Buffer;
}

export function baseUrl(): string {
  const base = process.env["SERVED_BASE_URL"] ?? "http://localhost:8090/";
  return base.endsWith("/") ? base : `${base}/`;
}

/** GET without any automatic decompression. */
export function get(url: string, acceptEncoding?: string): Promise<Fetched> {
  const request = url.startsWith("https:") ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        agent: false,
        headers: acceptEncoding ? { "Accept-Encoding": acceptEncoding } : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            rawHeaders: res.rawHeaders,
            statusMessage: res.statusMessage ?? "",
            body: Buffer.concat(chunks),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export interface DistFile {
  /** Path relative to dist/, with `/` separators. */
  rel: string;
  /** Request path: `/` for the index, `/<rel>` otherwise. */
  urlPath: string;
  size: number;
  ext: string;
}

export function distFiles(dist = "dist"): DistFile[] {
  const out: DistFile[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const rel = relative(dist, full).split("\\").join("/");
      out.push({
        rel,
        urlPath: rel === "index.html" ? "/" : `/${rel}`,
        size: statSync(full).size,
        ext: extname(rel),
      });
    }
  };
  walk(dist);
  return out;
}

export function readDist(rel: string, dist = "dist"): Buffer {
  return readFileSync(join(dist, rel));
}

/** Extensions sws compresses (text types and non-woff2 fonts). */
export const COMPRESSIBLE = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".webmanifest",
  ".svg",
  ".txt",
  ".ttf",
]);

export const MIN_COMPRESS_BYTES = 200;

export function urlFor(base: string, urlPath: string): string {
  return new URL(urlPath.slice(1), base).toString();
}

/** Status line + headers + blank line, as sent on the wire (HTTP/1.1). */
export function headerBytes(res: Fetched): number {
  let text = `HTTP/1.1 ${res.status} ${res.statusMessage}\r\n`;
  for (let i = 0; i < res.rawHeaders.length; i += 2) {
    text += `${res.rawHeaders[i]}: ${res.rawHeaders[i + 1]}\r\n`;
  }
  text += "\r\n";
  return Buffer.byteLength(text);
}
