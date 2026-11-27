import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import {
  brotliDecompressSync,
  gunzipSync,
  inflateSync,
  zstdDecompressSync,
} from "node:zlib";

export const ACCEPT_ENCODING = "gzip, deflate, br, zstd";

export interface Fetched {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  rawHeaders: string[];
  statusMessage: string;
  body: Buffer;
}

export function baseUrl(): string {
  const base = process.env["PAGES_BASE_URL"] ?? "https://carakan.fiatcode.dev/";
  return base.endsWith("/") ? base : `${base}/`;
}

/** GET without any automatic decompression. */
export function get(url: string): Promise<Fetched> {
  const request = url.startsWith("https:") ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        agent: false,
        headers: { "Accept-Encoding": ACCEPT_ENCODING },
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

/** The response body with its content-encoding undone. */
export function decodedBody(res: Fetched): Buffer {
  const enc = res.headers["content-encoding"];
  if (enc === undefined || enc === "identity") return res.body;
  if (enc === "gzip") return gunzipSync(res.body);
  if (enc === "deflate") return inflateSync(res.body);
  if (enc === "br") return brotliDecompressSync(res.body);
  if (enc === "zstd") return zstdDecompressSync(res.body);
  throw new Error(`unsupported content-encoding ${String(enc)}`);
}

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
