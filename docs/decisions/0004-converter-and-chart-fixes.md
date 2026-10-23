# 0004 — Converter typing, aksara picker, chart sound buttons, header and hero

- Date: 2026-10-23
- Status: built and accepted task by task.
- Work: branch `feat/converter-and-chart-fixes`.

## Context

Four rough edges in the converter and the chart. A plain `e` offered two whole-input candidates, so two plain `e`s could never get different readings. The aksara picker had no sandhangan and no rekan, although P-C08 claimed rekan. The chart detail sheet offered Dengar for entries that have no sound of their own. The Review and Learn headers sat off the right edge, and the Learn hero watermark was twice as strong as the tiles.

## Decisions

- **C1a, accent keys.** Two keys by the Latin input insert `é` (taling) or `ê` (pepet) at the caret and re-convert. `src/features/converter/bare-e.ts` is the single home of the letters (`eLetters`) and `EReading`. `trackCaret` moved to `insert-at-cursor.ts`, and both panels use it.
- **C1b, one choice per plain `e`.** The engine keeps its two candidates, and `ToAksaraAmbiguous` also lists `bareE`: each plain `e`'s UTF-16 index and its word, ascending, empty when only `ai`/`au` is ambiguous. The state has a `bareE` kind, and `ambiguous` now only arises for Pedoman `ai`/`au`. The UI shows one row per `e`, with its word, that `e` marked, and `ê pepet` / `é taling` buttons. A choice writes `ê`/`é` (case kept) into the field at the e's index plus the leading whitespace, then re-converts, so the field stays the source of truth and a choice survives edits elsewhere. Focus moves to the first button left in the result. The `ai`/`au` chips appear only once no plain `e` is left. `ambiguousTitleMixed` and its title branch are removed because they can no longer be reached; the engine message for the mixed reason stays.
- **C1c, typed pepet is keret.** A typed `ê`/`ě` converts exactly like the bare-e pepet candidate: after a consonant + `r` it is keret. The keret restructure is `fuseKeret`, applied to every word after the optional bare-e substitution. JGST `ŕ` stays explicit cakra.
- **C2, picker scope and order.** The picker gains the 12 sandhangan and the active ruleset's rekan. Section order: Carakan, the four sandhangan sections in chart order (vowel, closing, pangkon, consonant), Swara, Murda, Rekan, Angka, Pada. Tiles show `SandhanganItem.carrierChar`; the grouping comes from `sandhanganGroups`, shared with the chart. Rekan chars come from `rekanChar`.
- **C2, rekan read-back.** `aksaraToLatin` reads cecak telu through `rekanOnBase`, a map from base to `Rekan` built from the rekan data and the catalogue. It writes that rekan's Latin without the final `a`, in both rulesets. Any other base keeps the error.
- **C3, sound only where it makes sense.** `sectionHasSound` is true only for `carakan`, `rekan` and `pasangan`. The detail sheet renders Dengar only then, so sheets opened from the converter breakdown follow the same rule.
- **C4, C5.** One CSS property aligns the tab header actions to the end. The hero watermark opacity is 0.25, as the tiles.

### Pinned deviations from the Dart differential

`differential.test.ts` pins each by exact call and output (`withoutApproved`); any other drift still fails.

- **C1c:** 1 `toAksara` record, `RlÈjRêL` with `useMurda: true`. Dart wrote ra agung + pepet; the app writes pa cerek, the same as the bare-e pepet candidate. The `useMurda: false` record is unchanged, and the app never sets `useMurda`.
- **DA + cecak telu:** 4 `toLatin` records. Dart gave an error; the app reads `dza`/`dzaka`.

## Known limits

1. KAJ `au` and `reu` read back as `oau` and `rereu`. Out of scope by user decision.
2. Latin input `kh`, `dz`, `z` and `gh` stays unsupported.
3. Engine candidates for a plain `e` stay two whole-input readings (every `e` pepet, or every `e` taling). No UI uses them; the UI resolves each `e` through `bareE`.
4. JGST read-back of `kha`/`gha` is `ḳa`/`g̣a`, the KAJ p.8 forms the chart already shows. They coincide with murda JGST forms. It is display data only.
