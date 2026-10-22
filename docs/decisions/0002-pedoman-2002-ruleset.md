# 0002 — Pedoman 2002 ruleset, default and switchable

- Date: 2026-10-22
- Status: built and accepted task by task; pending the teacher's answers on the review sheet (they ship as `pedoman-2002-v2`).
- Work: branch `feat/pedoman-2002-ruleset`.
- Sources: [`docs/references/CITATIONS.md`](../references/CITATIONS.md) (section "Pedoman 2002"), [`docs/content/teacher-review-pedoman-2002.md`](../content/teacher-review-pedoman-2002.md).

## Context

The teacher's school book follows _Pedoman Penulisan Aksara Jawa_ (Yayasan Pustaka Nusatama, 2002 printing of the 1996 three-governor agreement). The app followed KAJ I 2021, Simplified (`kaj1-2021-simplified-v3`). The two agree on most rules. They differ on the murda and swara inventories, long-vowel signs, swara as pasangan, three-tier stacks, the full stop, and fa/va. A comparison over the 230-word corpus found 226 words identical. The Pedoman PDF is under full copyright and is not in the repository; the records cite pages only.

## Decisions

Settled with the user (contract section 6):

- **Scope.** The active ruleset governs the whole app: converter, the aksara of every word, chart, ladder and review.
- **Two rulesets, Pedoman default.** `pedoman-2002-v1` is the default, including for every existing install. `kaj1-2021-simplified-v3` stays available in Settings, with its output unchanged.
- **`ai` and `au` are ambiguous** under the Pedoman. The converter offers both readings and never picks.
- **Where the Pedoman is silent, keep KAJ I behaviour.** Each such point is listed in CITATIONS and on the teacher sheet.
- **fa and va are one letter**, reading back as `f`.
- **Teacher-dependent points proceed with a default.** Answers come later as `pedoman-2002-v2`, never as silent edits.
- **Progress is shared** across rulesets; nothing is erased on a switch.
- **No PDF in the repository.**

Fixed by the plan:

- **Engine default stays KAJ, app default is Pedoman.** `toAksara(latin, { useMurda, ruleset })` defaults to `kaj1-2021-simplified-v3` because the Dart differential freezes it. The app passes the active ruleset at every call site. `defaultRulesetId` (Pedoman) is what a device with no choice uses. `aksaraEngineRulesetId` is removed.
- **`toLatin` is ruleset-free.** The Pedoman defines no transliteration, and the reader already reads every Unicode form. JGST and PUJL do not change.
- **Error texts** (engine, English; the app localizes them): `This murda is not part of Pedoman 2002`, `Murda is written only on the first aksara of a word`, `Long vowels have no sign in Pedoman 2002`. `ii`, `uu` and a long swara A have no Pedoman sign, so they are errors.
- **`ai`/`au` candidates.** Candidate 1 is the ha reading, candidate 2 the swara reading. With a bare `e` the candidates are e-major (pepet, then taling) times reading-minor, at most four. Typing the `h` is unambiguous.
- **Visible pangkon.** The engine writes a ZWNJ after a pangkon-final word when the next word starts with a swara letter, a keret, or a two-consonant onset (cakra, pengkal, panjingan la/wa). No ZWNJ is doubled. A single consonant onset still links as pasangan.
- **Full stop** is always pada lungsi under the Pedoman.
- **Content.** A word may carry `byRuleset` overrides (`canonical`, `displayPujl`, `requiredGlyphs`, `requiredCaps`). A unit may carry `rulesets`. The eighth unit is two units, `u8` (KAJ) and `u8p` (Pedoman), because a unit id names one fixed glyph set. `manifest.json` lists `rulesetIds`. The glyph universe is unchanged (57 ids; Pedoman 47), so stored glyph bits stay valid.
- **Cross-ruleset completion.** A unit is complete when all its glyphs were completed in either ruleset. This reuses the retired-unit mapping (`unitsCompletedByRetired`), one rule and one code path.
- **Review hiding.** Review hides cards for glyphs the active ruleset lacks. It never deletes them.
- **Scope remount.** `Services.forRuleset(id)` gives a memoized scope per ruleset. A switch remounts the tab pages and pushed pages under the new scope without a reload. Settings stays mounted so focus holds. Converter input and open sheets reset.
- **E2E seeds KAJ.** The existing e2e suite runs under a KAJ seed so it keeps its meaning; a separate spec covers the fresh install and the switch.

## Traps

- A render-time engine error index is relative to the word, not the whole input, so a long-swara-A golden asserts the message only.
- Carry-over hashes: `tests/tools/carry-over.test.ts` pins `CITATIONS.md` and `corpus-guide.md`. Editing either needs new pins.
- The Dart differential stays a KAJ I gate. It has no Pedoman mode and must show zero differences.

## Known limits

1. `toLatin` still reads KAJ-only forms (for example ca murda, dirga mure) under the Pedoman. "Their input is an error" applies to Latin input, the picker and the chart. Changing it later is local to `aksara-to-latin.ts`.
2. A ruleset switch remounts the tab pages: converter input and open sheets reset.
3. The Pedoman has no replacement for `ii`, `uu` or long swara A, so they are errors. This is on the teacher sheet.
4. Render-time errors keep the engine's word-relative index.
5. HarfBuzz behaviour for the ZWNJ placements and the chart-only rekan (KA, DA, JA, GA with cecak telu) is checked by `npm run shaping`.
6. Chart-only rekan subtitles follow KAJ p.8 (`ḳa`, `g̣a` coincide with murda JGST); it is display data only.
7. An inactive ruleset's ladder may record a migrated completion when completions change. This is consistent with "complete when all glyphs were completed in either ruleset".

Also recorded: the v3 citation correction. KAJ item 8 is the Tradisional part, not the Simplified style, and three-tier stacks are KAJ-only (see CITATIONS, "Citation correction").
