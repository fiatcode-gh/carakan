import { gzipSync } from "node:zlib";
import {
  COMPRESSIBLE,
  distFiles,
  MIN_COMPRESS_BYTES,
  readDist,
} from "./served/http.ts";

const HEADER_ESTIMATE = 500;
const BUDGET = 1_000_000;

let total = 0;
console.log("estimate (gzip level 6 where sws compresses, +500 B headers)");
for (const f of distFiles()) {
  const compressed = COMPRESSIBLE.has(f.ext) && f.size >= MIN_COMPRESS_BYTES;
  const body = compressed
    ? gzipSync(readDist(f.rel), { level: 6 }).length
    : f.size;
  const wire = body + HEADER_ESTIMATE;
  total += wire;
  console.log(
    `${String(wire).padStart(9)}  ${compressed ? "gz " : "raw"}  ${f.urlPath}`,
  );
}
console.log(`total ${total} bytes (budget ${BUDGET})`);
process.exit(total > BUDGET ? 1 : 0);
