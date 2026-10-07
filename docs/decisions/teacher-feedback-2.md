# Teacher feedback round 2

- Date: 2026-10-07
- Status: converter part done; the lesson regrouping waits for the teacher's review of the letter groups.
- Work: branch `feat/converter-tap`.

## Converter: tap an aksara to see where it came from

### What and why

The teacher asked that tapping an aksara in the converter show where it came from. In the Latin → aksara direction, tapping a written cluster (a letter with its sandhangan and any pasangan under it, or a digit or pada) marks it, marks the Latin letters that produced it in a "from the Latin letters" line, and lists its parts with names and sounds ("ka + wulu, reads ki"). Each part with a chart entry opens the chart's detail sheet.

Out of scope: the aksara → Latin direction (its aksara is an editable field, where a tap places the caret), tapping aksara anywhere outside the converter result, and audio.

### Decisions

- **The engine reports the mapping.** `toAksara` returns `clusters` (output span → input spans) beside the unchanged output string. A recorder sits beside the existing writes, so the differential test against the Dart engine still shows zero differences. Rejected: re-converting syllables in the app, because joined writing moves a pasangan across word boundaries.
- **Cluster boundaries follow the shaper.** A cluster starts at each letter, digit or pada, except a letter right after PANGKON, which is subjoined. `npm run shaping` now also fails if a HarfBuzz glyph cluster straddles a boundary.
- **The result stays one text node.** Splitting it into per-cluster elements lost kerning after a panjing la (`klapa`, `mlaku`, `jaklěk`, `pŕawan/`). Transparent buttons sit on top instead, positioned from `Range` rects and grown to at least 48×48 px. They ignore pointer events: a tap resolves to the nearest glyph, so long-press text selection still works. Keyboard and screen readers use the buttons.
- **The mark covers Jejeg's extent, not the rect.** A `Range` rect is the content area of the primary font, MPLUS Rounded 1c (1.395 em). Jejeg draws from 1.32 em above to 0.88 em below the baseline, so a mark sized to the rect cut through a pasangan.

### Traps

- A sigeg marker (`ṙ`, `ŋ`, `ḥ`) where a syllable must start drops the rest of its word (`ŋa` gives empty output). This is existing engine behavior, frozen by the differential test, so those letters have no cluster. The coverage invariant skips only that case.
- A lone `ā` after the ha carrier or a glide gives two clusters that share the `ā` source. Every cluster must have at least one source.

### Known limits

- In a dense digit or pada run (`1945`), a narrow cluster's own tap area is under 48 px, because the rendering may not change. Taps go to the nearest glyph.
- In a result with more than one line, tapping the lowest tip of a pasangan tail selects the cluster on the line below. Marks on top of the next line (wulu, layar, cecak) reach into the same band, so geometry alone cannot settle it.

### Open question

- `sinau` converts to na + dirga mure + tarung (the diphthong au), because the ruleset reads every `ai` and `au` as a diphthong. School writes it with a ha between the vowels (`sinahu`). KAJ 8.i panglancar ha is not implemented, and the engine cannot tell native words from loans like `santai`. This is a ruleset question for the teacher. Typing `sinahu` gives the school spelling today. The breakdown shows dirga mure tarung as one `au` part (and taling tarung as `o`), so it no longer suggests a long a.
