# Corpus guide — adding words

Every word entry in public/content/v1/words.json:

- `id`: lowercase Latin slug, ASCII, unique.
- `canonical`: JGST form that round-trips through the engine. Conventions
  (engine truth): pangkon = trailing `/` when the engine needs it
  (`bapak/`, `maaf/`, `lombok/`) but omitted when the back-form is
  slash-free (`janji`, `tukaŋ`); layar `ṙ`; wignyan `ḥ`; cecak `ŋ`;
  cakra `ŕ`; keret `ṛ`; pengkal `ỿ`; pepet `ě`; taling `é`; vowel-initial
  words are written without h (`iki`, `ibu`, `ěmas/`) — the engine adds the
  ha carrier and the round-trip gate expects the h-prefixed back-form
  (`hěmas/`); write h only when it is pronounced (`haji`); TTA = `ṭa`
  (never `tha` — `tha` is the PUJL reading); murda words use the dotted JGST
  literal (`ḅima`, `ṇaḅi`; TA MURDA = `ṭha`);
  diphthongs read back as `ai`/`au`; hiatus words keep the explicit
  glide letter (`buwaya` not `buaya` — the glide is lossy).
- `displayPujl`: optional; only when the derived school spelling (engine
  PUJL, silent carrier h dropped) is wrong for this word: murda names
  (`ḅima` → `Bima`), glides (`buwaya` → `buaya`), è spellings and teacher
  corrections. An override equal to the derived form is a test failure.
- `requiredGlyphs` / `requiredCaps`: NEVER hand-computed. Derive them from
  the engine output and let the round-trip test verify:
  `toAksara(canonical)` → walk the output with
  `derive` (src/content/glyph-derivation.ts).
- `gloss`: Indonesian, short, kid-appropriate.
- `source`: `wiktionary:<word>` (section verified) or `author`.
- `byRuleset`: optional map from a ruleset id (`pedoman-2002-v1`,
  `kaj1-2021-simplified-v3`) to overrides. Allowed keys: `canonical`,
  `displayPujl`, `requiredGlyphs`, `requiredCaps`; anything else is a
  `ContentFormatError`. The top-level fields apply to every ruleset without an
  override. Add one only when the word needs it under a ruleset: the canonical
  errors or is ambiguous there, the display differs, or the glyphs differ.
  Today: `nabi` (`ṇabi` under Pedoman: murda on the first aksara only),
  `ramai` (see below), `vila` and `vakum` (display `vila`/`vakum` and glyph
  `fa` under Pedoman, which has one fa/va letter).
- Every addition must pass the content gates under both rulesets
  (`npm test -- tests/content`), including
  `tests/content/corpus-round-trip.test.ts`. The round trip has one documented
  exception: a word with `v` reads back `f` under Pedoman (`vila`, `vakum`).
- `ai`/`au` per ruleset. Under KAJ I v3 `ai`/`au` is the diphthong (dirga
  mure, dirga mure + tarung). Under Pedoman 2002 it is ambiguous (ha reading or
  swara reading), and a corpus canonical must not be ambiguous. So a word with
  `ai`/`au` stores the explicit HA form under Pedoman: `byRuleset` with
  `canonical` (`ramahi`) and `displayPujl` (`ramai`). List every such word on
  the teacher sheet (`docs/content/teacher-review-pedoman-2002.md`), because the
  HA form is a provisional choice pending the teacher.
- Still excluded by engine limitations (do not add): the KAJ separate-syllable
  ai/au reading (`syair`, `bait`; under KAJ the engine always takes the
  diphthong), pepet + vowel hiatus (eu class: `néutron`), post-base O+TARUNG
  `au` spellings, `z`/`q`/`x` rekan, `lega`-class nga-lelet collapses (pa
  cerek/nga lelet are display-only), long vowels `ii`/`uu` (an error under
  Pedoman). `rawon`-style words are FIXED (add freely).

## Units per ruleset

A unit in `units.json` may carry `rulesets`, a list of ruleset ids; absent
means every ruleset. A unit id names one fixed glyph set, so a unit whose
glyphs differ between the rulesets is two units: `u8` (KAJ I, 18 glyphs) and
`u8p` (Pedoman 2002, 14 glyphs). The units gate checks each ruleset's ladder
teaches every glyph of that ruleset exactly once.

## Shaping check

Mandatory after any engine or font change. It shapes every corpus canonical
plus sentence and taling-intent cases with HarfBuzz and exits non-zero on a
dotted circle, a taling not drawn before its owner base, or a violated intent
expectation (HarfBuzz is not reachable from `npm test`). It covers both
rulesets: the KAJ outputs against the Dart dump, and the Pedoman outputs
(corpus under the Pedoman canonicals, plus the Pedoman sentence cases) with
the same HarfBuzz and cluster checks:

```sh
npm run shaping
```

## Chart examples

The chart's detail sheet shows teacher-curated example words per glyph, from
`public/content/v1/chart_examples.json`
(`{"version": 1, "examples": {"<glyphId>": ["<wordId>", ...]}}`, keys in
`GlyphUniverse` order, word ids in display order, resolved against
`words.json` at load; an unknown glyph or word id is a `ContentFormatError`).
Each row shows the word's aksara and its school-spelling reading, never the
gloss (glosses stay in `words.json` for the review drill).

- Counts: every nglegena and sandhangan key has 2-4 examples; murda, swara and
  rekan keys are optional with 1-4. No duplicate id within a key.
- Word rules (reviewed, not tested): actual ngoko Javanese words only (rekan
  keys excepted); prefer distinctly Javanese spellings over same-as-Indonesian
  ones; no krama-only, sastra, compound-only or obscure entries.
- Enforced by `tests/content/chart-examples.test.ts`: the key's glyph is visible in the
  word's aksara (`visibleGlyphs`), and the word has no pasangan
  (`hasPasangan`).
- Changes go through a teacher review sheet, never a direct edit.
- Examples are filtered per ruleset: a key whose glyph the active ruleset lacks
  (for example `va` or the nya murda under Pedoman) is not shown. The gates
  check the examples under both rulesets, so an example word must show its glyph
  and have no pasangan under each ruleset that has the key.
