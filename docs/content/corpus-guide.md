# Corpus guide — adding words

Every word entry in app/assets/content/v1/words.json:

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
  `AksaraEngine.toAksara(canonical)` → walk the output with
  GlyphDerivation.derive (app/lib/features/content/glyph_derivation.dart).
- `gloss`: Indonesian, short, kid-appropriate.
- `source`: `wiktionary:<word>` (section verified) or `author`.
- Still excluded by engine v2 limitations (do not add): the separate-
  syllable ai/au reading (`syair`, `bait` — the engine always takes the
  diphthong), pepet + vowel hiatus (eu class: `néutron`), post-base
  O+TARUNG `au` spellings, `z`/`q`/`x` rekan, `lega`-class nga-lelet
  collapses (pa cerek/nga lelet are display-only), `rawon`-style words
  are FIXED (add freely).
- Every addition must pass `flutter test test/features/content/corpus_round_trip_test.dart`.

## Shaping check

Mandatory after any engine or font change. It shapes every corpus canonical
plus sentence and taling-intent cases with HarfBuzz and exits non-zero on a
dotted circle, a taling not drawn before its owner base, or a violated intent
expectation (HarfBuzz is not reachable from `flutter test`):

```sh
cd app && dart run tool/shaping/dump_cases.dart > /tmp/cases.tsv && uv run --quiet --with uharfbuzz python tool/shaping/shape_check.py /tmp/cases.tsv
```

## Chart examples

The chart's detail sheet shows teacher-curated example words per glyph, from
`app/assets/content/v1/chart_examples.json`
(`{"version": 1, "examples": {"<glyphId>": ["<wordId>", ...]}}`, keys in
`GlyphUniverse` order, word ids in display order, resolved against
`words.json` at load; an unknown glyph or word id is a `FormatException`).
Each row shows the word's aksara and its school-spelling reading, never the
gloss (glosses stay in `words.json` for the review drill).

- Counts: every nglegena and sandhangan key has 2-4 examples; murda, swara and
  rekan keys are optional with 1-4. No duplicate id within a key.
- Word rules (reviewed, not tested): actual ngoko Javanese words only (rekan
  keys excepted); prefer distinctly Javanese spellings over same-as-Indonesian
  ones; no krama-only, sastra, compound-only or obscure entries.
- Enforced by `chart_examples_test.dart`: the key's glyph is visible in the
  word's aksara (`visibleGlyphs`), and the word has no pasangan
  (`hasPasangan`).
- Changes go through a teacher review sheet, never a direct edit.
