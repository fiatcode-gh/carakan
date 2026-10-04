import {
  ACCEPT_ENCODING,
  baseUrl,
  COMPRESSIBLE,
  distFiles,
  get,
  MIN_COMPRESS_BYTES,
  urlFor,
} from "./http.ts";

const types: Record<string, RegExp> = {
  ".html": /^text\/html\b/,
  ".js": /^(text|application)\/javascript\b/,
  ".css": /^text\/css\b/,
  ".json": /^application\/json\b/,
  ".webmanifest": /^application\/manifest\+json\b/,
  ".woff2": /^font\/woff2\b/,
  ".ttf": /^font\/ttf\b/,
  ".png": /^image\/png\b/,
  ".svg": /^image\/svg\+xml\b/,
  ".txt": /^text\/plain\b/,
};

const base = baseUrl();
const failures: string[] = [];
let checks = 0;

function expect(ok: boolean, path: string, message: string): void {
  checks++;
  if (!ok) failures.push(`FAIL ${path}: ${message}`);
}

const targets: Array<{ path: string; ext: string; size: number }> = [];
for (const f of distFiles()) {
  targets.push({ path: f.urlPath, ext: f.ext, size: f.size });
  if (f.rel === "index.html") {
    targets.push({ path: "/index.html", ext: f.ext, size: f.size });
  }
}

let indexBody = "";
for (const t of targets) {
  const res = await get(urlFor(base, t.path), ACCEPT_ENCODING);
  const h = res.headers;
  expect(res.status === 200, t.path, `status ${res.status}`);

  const type = String(h["content-type"] ?? "");
  const typeRe = types[t.ext];
  expect(
    typeRe !== undefined && typeRe.test(type),
    t.path,
    `content-type ${JSON.stringify(type)} for ${t.ext}`,
  );

  const wantCache = t.path.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
  expect(
    h["cache-control"] === wantCache,
    t.path,
    `cache-control ${JSON.stringify(h["cache-control"])}, want ${JSON.stringify(wantCache)}`,
  );

  const encoding = h["content-encoding"];
  if (COMPRESSIBLE.has(t.ext) && t.size >= MIN_COMPRESS_BYTES) {
    expect(encoding !== undefined, t.path, "missing content-encoding");
  } else if (t.ext === ".woff2" || t.ext === ".png") {
    expect(
      encoding === undefined,
      t.path,
      `unexpected content-encoding ${String(encoding)}`,
    );
  }

  // Traefik's headers middleware sets STS only on TLS (or X-Forwarded-Proto: https),
  // so over plain http it is absent by design; Task 21 proves it on https.
  if (base.startsWith("https:")) {
    expect(
      h["strict-transport-security"] === "max-age=31536000",
      t.path,
      `strict-transport-security ${JSON.stringify(h["strict-transport-security"])}`,
    );
  }

  if (t.path === "/") indexBody = await decodedIndex(base);
}

async function decodedIndex(url: string): Promise<string> {
  return (await get(url)).body.toString("utf8");
}

const expectBuild = process.env["EXPECT_BUILD"];
if (expectBuild !== undefined && expectBuild !== "") {
  const m = /<meta name="carakan-build" content="([^"]*)"/.exec(indexBody);
  expect(
    m?.[1] === expectBuild,
    "/",
    `carakan-build ${JSON.stringify(m?.[1])}, want ${JSON.stringify(expectBuild)}`,
  );
}

const missing = await get(urlFor(base, "/no-such-path"), ACCEPT_ENCODING);
expect(missing.status === 404, "/no-such-path", `status ${missing.status}`);

for (const line of failures) console.log(line);
console.log(
  `served:headers ${base} — ${targets.length + 1} requests, ${checks} checks, ${failures.length} failure(s)`,
);
process.exit(failures.length === 0 ? 0 : 1);
