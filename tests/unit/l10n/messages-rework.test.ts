import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import en from "../../../src/l10n/en.json";
import id from "../../../src/l10n/id.json";

const catalogs = { id, en } as const;

/** The "W10 copy table" of docs/design/prototype-review.md: key, id, en. */
function w10Table(): [string, string, string][] {
  const doc = readFileSync("docs/design/prototype-review.md", "utf8");
  const section = doc.split("## W10 copy table")[1]?.split("\n## ")[0] ?? "";
  return [...section.matchAll(/^\| `(\w+)`\s*\| (.+?)\s*\| (.+?)\s*\|$/gm)].map(
    (m) => [m[1] ?? "", m[2] ?? "", m[3] ?? ""],
  );
}

test("[P-L01] the 15 approved W10 strings equal the review packet in both locales", () => {
  const rows = w10Table();
  expect(rows).toHaveLength(15);
  for (const [key, idText, enText] of rows) {
    expect(id[key as keyof typeof id], `id.${key}`).toBe(idText);
    expect(en[key as keyof typeof en], `en.${key}`).toBe(enText);
  }
});

test("[P-L01] decision 3: reviewEmpty carries no party emoji", () => {
  expect(id.reviewEmpty).toBe("Tidak ada yang perlu diulang");
  expect(en.reviewEmpty).toBe("Nothing to review");
});

test("[P-L01] W14 reveal button copy", () => {
  expect(id.revealAnswerButton).toBe("Lihat jawaban");
  expect(en.revealAnswerButton).toBe("Show answer");
});

test("[P-U09] W15 engine message keys are present with the planned copy", () => {
  const keys = Object.keys(id).filter((k) => /^engine/.test(k));
  expect(keys).toHaveLength(15);
  expect(id.engineErrorUnknownCharacter).toBe(
    "Karakter “{char}” tidak dikenali.",
  );
  expect(en.engineErrorUnknownCharacter).toBe("Unknown character “{char}”.");
  expect(id.engineErrorUnrecognizedCodepoint).toBe(
    "Karakter {codepoint} bukan aksara Jawa yang dikenali.",
  );
  expect(en.engineErrorGeneric).toBe("This input cannot be converted.");
  expect(id.engineErrorGeneric).toBe("Masukan ini tidak bisa diubah.");
});

test("[P-L01] no catalog value ends in an emoji", () => {
  for (const messages of Object.values(catalogs)) {
    for (const value of Object.values(messages)) {
      expect(value).not.toMatch(/\p{Emoji_Presentation}/u);
    }
  }
});
