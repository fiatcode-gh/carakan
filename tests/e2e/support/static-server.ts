import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, normalize } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

export interface StaticServer {
  readonly origin: string;
  /** Serves another build from the next request on. */
  setRoot(dir: string): void;
  close(): Promise<void>;
}

/**
 * Minimal static server for a directory that can be swapped at runtime, so a
 * test can publish a new build under the same origin. No compression, and
 * `no-cache` like the production image so worker updates never read a stale
 * HTTP cache.
 */
export async function startStaticServer(
  root: string,
  port: number,
): Promise<StaticServer> {
  let current = root;
  const server: Server = createServer((request, response) => {
    void (async () => {
      const path = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const file = normalize(
        join(current, path.endsWith("/") ? `${path}index.html` : path),
      );
      if (!file.startsWith(normalize(current))) {
        response.writeHead(403).end();
        return;
      }
      try {
        const body = await readFile(file);
        response.writeHead(200, {
          "content-type": types[extname(file)] ?? "application/octet-stream",
          "cache-control": "no-cache",
        });
        response.end(body);
      } catch {
        response.writeHead(404).end();
      }
    })();
  });
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return {
    origin: `http://127.0.0.1:${port}`,
    setRoot(dir) {
      current = dir;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
