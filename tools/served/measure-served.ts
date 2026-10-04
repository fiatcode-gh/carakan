import {
  ACCEPT_ENCODING,
  baseUrl,
  distFiles,
  get,
  headerBytes,
  urlFor,
} from "./http.ts";

const BUDGET = 1_000_000;
const base = baseUrl();
let total = 0;
let bad = 0;

console.log(`served transfer from ${base} (body + header bytes on the wire)`);
for (const f of distFiles()) {
  const res = await get(urlFor(base, f.urlPath), ACCEPT_ENCODING);
  if (res.status !== 200) {
    bad++;
    console.log(`FAIL ${f.urlPath}: status ${res.status}`);
  }
  const wire = res.body.length + headerBytes(res);
  total += wire;
  const enc = res.headers["content-encoding"] ?? "-";
  console.log(
    `${String(wire).padStart(9)}  ${String(enc).padEnd(4)}  ${f.urlPath}`,
  );
}
console.log(`total ${total} bytes (budget ${BUDGET})`);
process.exit(total > BUDGET || bad > 0 ? 1 : 0);
