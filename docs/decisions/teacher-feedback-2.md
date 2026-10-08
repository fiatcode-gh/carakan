# Teacher feedback round 2

- Date: 2026-10-07
- Status: converter part done; lesson regrouping built with the draft groups, pending the teacher's review in the deployed app; progress reset built on the same branch.
- Work: branches `feat/converter-tap`, `feat/lesson-shape-groups`.

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

## Lessons: group the base letters by shape

### What and why

The teacher asked for shape families, as Latin letters are taught ("i l j", then "r b p d"). The 20 base letters now come in five groups, and the ladder has 9 units: G1, wulu and suku, G2, G3, G4, G5, other sandhangan, pasangan, murda and swara.

| Unit | Letters               | Shared shape                                                                                       |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------- |
| G1   | pa, ha, ya            | Hook and leg: ha is pa with one more leg, ya is two pa side by side                                |
| G2   | ra, ga, la            | Rows of arches                                                                                     |
| G3   | na, ka, ca, sa        | Comb or curl at the start (na and ka, ca and sa)                                                   |
| G4   | da, dha, ja, ta, wa   | A loop or curl inside a box. ja has no close relative and sits here because its start is like da's |
| G5   | ba, nga, tha, nya, ma | Same opening curve: tha is nga with a tail, nya is ba with more                                    |

The groups are a draft. The teacher reviews them in the deployed app, and a change is a `units.json` edit plus its tests.

### Decisions

- **Ids name glyph sets.** `g1`–`g5` are new; `u2`, `u6`, `u7`, `u8` are kept. Rejected: positional `u1`–`u9`, because an old `u1` record would read as G1.
- **Old progress maps by letters learned**, in `LadderModel.refresh`, from `retiredUnits`. No IndexedDB version bump: an old-build window would block the upgrade, and old code would fail with `VersionError`.
- **Retired records are kept**, never deleted.
- **Content stays `v1`.** Nothing reads the version, the service worker precaches each JSON file by revision, and older code ignores the added key.

### Traps

- `Unit.glyphBits` drops pasangan items, so coverage by bits would complete the pasangan unit vacuously. Compare glyph-id strings.
- Any content string edit feeds the font glyph set (`npm run fonts`).

### Known limits

- With old `u1` + `u2`, both G1 and G2 are open (unchanged unlock rule).
- A G1 question has 3 or 4 options: a confusion partner is forced in even before it is taught (`ba` in a `pa` question, decision 10).
- A wrong glyph-to-sound answer on wulu or suku is not logged as the suku-wulu confusion: the chosen sound (`u` or `i`) resolves to swara u or i first. This predates Part A and matches the Flutter app (P-B13). Follow-up candidate: resolve a chosen sound among the prompt's options before the global table.

## Settings: reset saved progress

### What and why

The user asked (2026-10-07, with this feedback round) for a way to erase all saved learning progress on a device and start again from the first unit, for a phone that is shared or passed on. Settings ends with a "Mulai dari awal" section; its button opens a confirmation with Cancel focused. Out of scope: undo, export or backup, erasing per unit, resetting the language choice, erasing the service-worker cache.

### Decisions

- **What is erased.** The three IndexedDB stores, whole: finished lessons (retired-unit records too, which the Part A mapping would otherwise read again), review cards and the mistake log. The language choice stays: it is a device setting, not learning progress, and it lives in `localStorage`. `LearnerProgress` receives only the database handle, so it cannot reach `localStorage` or the cache.
- **One transaction.** `LearnerProgress.erase` clears the three stores in one readwrite transaction. It aborts explicitly on any failure, because a synchronous throw after two issued clears would otherwise let IndexedDB commit them, and it settles every issued request before rethrowing. A failure shows `resetFailed` in the dialog and confirming again retries. Rejected: a method on one repository, because each owns one store. No version bump and no database delete (the Part A reason: an old-build window would block it).
- **An `erased` emitter, not the repositories' `changes`.** `LearnerProgress.erased` fires once, after the commit. The ladder re-reads, the review session drops its retry set in its own promise chain (so a grade in flight finishes first) and re-queries, and the drill refreshes even when one is active. Rejected: emitting `completions.changes`, `queue.changes` and `mistakes.changes` from the erase. The review session keeps its retry set on `queue.changes`, so cards graded `gradeAgain` would come back (and grading one throws `srs item not found`); the drill skips `mistakes.changes` while a drill is active; and a second writer of another class's emitter blurs ownership.
- **Cancel is the safe default** as initial focus: `Sheet` focuses a `[data-autofocus]` element before its title, and Cancel comes first in the footer. Enter on open cancels.

### Known limits

- Other open windows or tabs of the app keep their in-memory ladder, retry set and drill until they reload, and their later writes can add rows again. Cross-window notification (BroadcastChannel or `storage` events) is out of scope.
- Android back is proved on the phone only: Playwright has no back gesture for a modal dialog. Escape takes the same `cancel` path and is proved in e2e.
