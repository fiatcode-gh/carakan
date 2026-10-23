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

test("[P-L01] Buku Poster review copy in both locales", () => {
  expect(id.reviewTodayLabel).toBe("Hari ini");
  expect(en.reviewTodayLabel).toBe("Today");
  expect(id.reviewDueCount).toBe("{count} aksara siap diulang");
  expect(en.reviewDueCount).toBe("{count} aksara ready to review");
  expect(id.reviewStartButton).toBe("Mulai mengulang");
  expect(en.reviewStartButton).toBe("Start reviewing");
  expect(id.strengthHeading).toBe("Seberapa ingat?");
  expect(en.strengthHeading).toBe("How well do you remember?");
  expect([id.strengthStrong, id.strengthFair, id.strengthNew]).toEqual([
    "kuat",
    "lumayan",
    "baru",
  ]);
  expect([en.strengthStrong, en.strengthFair, en.strengthNew]).toEqual([
    "strong",
    "okay",
    "new",
  ]);
  expect(id.strengthSegments).toBe("{filled} dari 4");
  expect(en.strengthSegments).toBe("{filled} of 4");
  expect(id.reviewHelpHowHeading).toBe("Cara kerjanya");
  expect(en.reviewHelpHowHeading).toBe("How it works");
  expect(id.reviewHelpRight).toBe(
    "Jawaban benar: kartu kembali besok, lalu makin jarang.",
  );
  expect(en.reviewHelpRight).toBe(
    "Right answer: the card comes back tomorrow, then less and less often.",
  );
  expect(id.reviewHelpWrong).toBe(
    "Jawaban salah: kartu diulang lagi sekarang, lalu 10 menit lagi.",
  );
  expect(en.reviewHelpWrong).toBe(
    "Wrong answer: the card comes back right away, then again in 10 minutes.",
  );
  expect(id.reviewHelpStrength).toBe(
    "Batang kekuatan: baru, lumayan, lalu kuat. Makin lama kamu ingat, makin penuh.",
  );
  expect(en.reviewHelpStrength).toBe(
    "Strength bars: new, okay, then strong. The longer you remember, the fuller they get.",
  );
});

test("[P-L01] the W14 grade and review-group keys are gone", () => {
  for (const messages of Object.values(catalogs)) {
    for (const key of [
      "gradeAgain",
      "gradeHard",
      "gradeGood",
      "gradeEasy",
      "revealAnswerButton",
      "reviewGroupRetry",
      "reviewGroupFresh",
      "reviewGroupDue",
      "reviewHelpGradeHeading",
      "reviewHelpGradeAgain",
      "reviewHelpGradeHard",
      "reviewHelpGradeGood",
      "reviewHelpGradeEasy",
    ]) {
      expect(messages).not.toHaveProperty(key);
    }
  }
});

test("[P-U09] W15 engine message keys are present with the planned copy", () => {
  const keys = Object.keys(id).filter((k) => /^engine/.test(k));
  expect(keys).toHaveLength(20);
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
