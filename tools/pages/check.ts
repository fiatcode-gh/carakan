import { createHash } from "node:crypto";
import { baseUrl, decodedBody, get, headerBytes, urlFor } from "./http.ts";
import { parsePrecache, workboxScript } from "./sw-manifest.ts";

const CACHE_CONTROL = "max-age=600";
const BUDGET = 1_000_000;
const HTML = /^text\/html\b/;

/** Content types browsers enforce; other extensions are left unchecked. */
const types: Record<string, RegExp> = {
  ".html": HTML,
  ".js": /^(text|application)\/javascript\b/,
  ".css": /^text\/css\b/,
};

const expectBuild = process.env["EXPECT_BUILD"] ?? "";
if (expectBuild === "") {
  console.error(
    "pages:check: set EXPECT_BUILD to the 7-character commit the deploy was built from",
  );
  process.exit(1);
}

const base = baseUrl();
const failures: string[] = [];
let checks = 0;
let requests = 0;

function expect(ok: boolean, path: string, message: string): void {
  checks++;
  if (!ok) failures.push(`FAIL ${path}: ${message}`);
}

async function fetchPath(urlPath: string) {
  requests++;
  return get(urlFor(base, urlPath));
}

function contentType(res: { headers: Record<string, unknown> }): string {
  return String(res.headers["content-type"] ?? "");
}

const swRes = await fetchPath("/sw.js");
const sw = decodedBody(swRes).toString("utf8");
const entries = parsePrecache(sw);
const files: Array<{ url: string; revision: string | null | undefined }> = [
  ...entries,
  { url: "sw.js", revision: undefined },
  { url: workboxScript(sw), revision: undefined },
];

let wireTotal = 0;
for (const file of files) {
  const path = `/${file.url}`;
  const res = await fetchPath(path);
  expect(res.status === 200, path, `status ${res.status}`);

  const cacheControl = res.headers["cache-control"];
  expect(
    cacheControl === CACHE_CONTROL,
    path,
    `cache-control ${JSON.stringify(cacheControl)}, want ${JSON.stringify(CACHE_CONTROL)}`,
  );

  const ext = /\.[^./]+$/.exec(file.url)?.[0] ?? "";
  const typeRe = types[ext];
  if (typeRe !== undefined) {
    const type = contentType(res);
    expect(
      typeRe.test(type),
      path,
      `content-type ${JSON.stringify(type)} for ${ext}`,
    );
  }

  if (typeof file.revision === "string") {
    const md5 = createHash("md5").update(decodedBody(res)).digest("hex");
    expect(
      md5 === file.revision,
      path,
      `md5 ${md5}, want revision ${file.revision}`,
    );
  } else if (file.revision === null) {
    expect(
      file.url.startsWith("assets/"),
      path,
      "unrevisioned outside assets/",
    );
  }

  const wire = res.body.length + headerBytes(res);
  wireTotal += wire;
  const encoding = String(res.headers["content-encoding"] ?? "-");
  console.log(`${String(wire).padStart(9)}  ${encoding.padEnd(4)}  ${path}`);
}

const index = await fetchPath("/");
expect(index.status === 200, "/", `status ${index.status}`);
expect(
  HTML.test(contentType(index)),
  "/",
  `content-type ${JSON.stringify(contentType(index))} for .html`,
);
const build =
  /<meta name="carakan-build" content="([^"]*)">/.exec(
    decodedBody(index).toString("utf8"),
  )?.[1] ?? null;
expect(
  build === expectBuild,
  "/",
  `carakan-build ${JSON.stringify(build)}, want ${JSON.stringify(expectBuild)}`,
);

const missing = await fetchPath("/no-such-path");
expect(missing.status === 404, "/no-such-path", `status ${missing.status}`);

if (base.startsWith("https:")) {
  const httpUrl = `http:${base.slice("https:".length)}`;
  requests++;
  const redirect = await get(httpUrl);
  expect(redirect.status === 301, httpUrl, `status ${redirect.status}`);
  const location = redirect.headers["location"];
  expect(
    location === base,
    httpUrl,
    `location ${JSON.stringify(location)}, want ${JSON.stringify(base)}`,
  );
}

expect(
  wireTotal <= BUDGET,
  "(first load)",
  `wire total ${wireTotal} bytes over budget ${BUDGET}`,
);

for (const failure of failures) console.log(failure);
console.log(
  `pages:check ${base} — ${requests} requests, ${checks} checks, ${failures.length} failure(s), total ${wireTotal} bytes (budget ${BUDGET})`,
);
process.exit(failures.length > 0 ? 1 : 0);
