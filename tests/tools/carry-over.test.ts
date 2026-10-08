import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// path in this repo -> sha256 of the same file at aksara-app@ebc7cb5.
// Task 18 edits path references in the carried docs and the NOTICE note;
// update those hashes deliberately, with a comment.
const carried: ReadonlyArray<readonly [string, string]> = [
  [
    "docs/references/CITATIONS.md",
    // updated for carakan paths (Task 18)
    "f437997c8b00599355e847421720feeaaa41bd745011cdfde08d73c216a45679",
  ],
  [
    "docs/references/unicode-javanese-block.txt",
    "46126af6907c9e6f65ad7f23ee374040afba0f3db46d3a63546c7ecb7889aa35",
  ],
  [
    "docs/references/kaj1-tata-tulis.pdf",
    "9a1326411e5ba43bf16b00714c0f8c12d0786ddbbdc82dc1e2e850f29c4fd435",
  ],
  [
    "docs/references/wordlist-licensing.md",
    "ceeb2be88d7ab98785d3618b7f74273fb0c3d1c6d2a991c83ea8bc591998fc6f",
  ],
  [
    "docs/content/corpus-guide.md",
    // updated for carakan paths (Task 18)
    "bdb1d861a289eb3c75cf50d14e818b0a728722fa046a63cdc72dc52efec27e3c",
  ],
  [
    "public/content/v1/aksara.json",
    "6696f54bb3cd8309e761a7f1896ba5a7e37cb1f27bb40f7e6cf6ec07b17b0997",
  ],
  [
    "public/content/v1/chart_examples.json",
    "7b3139d0e11c3693e5ec35a13d46e48d729d0c5d2345ece230cdfac65941ced5",
  ],
  [
    "public/content/v1/confusion_pairs.json",
    "bdee4948df692dbecc73fa10d03c5afcdc0fe4202e459f2b1dcdb99cf3b516ae",
  ],
  [
    "public/content/v1/manifest.json",
    "4501199fded1634c791b587263277509b06800aa871f0c544434b0906010be6f",
  ],
  [
    "public/content/v1/sandhangan.json",
    "6fb114bd544250293a4bb1ed2f0d49ba0bce5822d64618cf82752a31fed21999",
  ],
  [
    "public/content/v1/units.json",
    // regrouped by shape (teacher-feedback-2 A01)
    "5fcd8cf6411f4aeab9b0bb6c5777ac62913b77fb85234bcb86eb6b84e67f49c9",
  ],
  [
    "public/content/v1/words.json",
    "712f59dddac9d0a7375c0c6226fb3187e4c51c3a2fa71fe41d7f86f4ce9fb4df",
  ],
  [
    "public/fonts/nykNgayogyanJejeg-Regular.ttf",
    "154e494af4ffd3efdd9f21c9513a5401e5cc16eca209d804a6dfae71d2d67777",
  ],
  [
    "fonts/source/MPLUSRounded1c-Regular.ttf",
    "b75708b53e45b06d17d470aeeca5b766e3d1b3999f03f13ec4eb863ca846c14c",
  ],
  [
    "fonts/source/MPLUSRounded1c-Bold.ttf",
    "c358630584e8e2d8fbd6121d0f4693255ffef6d1e6d4f3441fd6e5a963a11f9e",
  ],
  [
    "public/licenses/NOTICE-fonts.txt",
    // updated for the Carakan deploy note (Task 18)
    "f255809fdb90951a6ecabf9dc164eba84251bbb1195252af776a4c4d8befcdc6",
  ],
  [
    "public/licenses/ofl-mplus.txt",
    "04971e3fcee60b247395150d93b3616f6a0b092572332c96187b472976553abc",
  ],
];

describe("[P-D04] carry-over from aksara-app@ebc7cb5", () => {
  it.each(carried)("%s is byte-identical to the source", (path, sha256) => {
    const bytes = readFileSync(new URL(`../../${path}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
  });
});
