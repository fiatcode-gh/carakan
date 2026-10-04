# Carakan: UI rework prototype, review packet

Design gate for the web port (contract §3.5). The prototype is hand-written HTML/CSS on CSS custom properties.
`prototype/tokens.css` and the component rules in `prototype/components.css` are promoted to the app by Task 10.
No feature UI is built before this is approved.

## Where the prototype lives now

Task 10 promoted the prototype and deleted `prototype/`. The approved artifact is commit `bf8eac8`; everything below
describes it as reviewed.

```sh
git show bf8eac8:prototype/tokens.css      # promoted verbatim to src/styles/tokens.css
git show bf8eac8:prototype/components.css  # now the scoped styles of src/ui/*.svelte and src/styles/base.css
git archive bf8eac8 prototype | tar -x -C /tmp/carakan-prototype   # run it: npm i && npx vite there
npx vitest run tests/unit/design/contrast.test.ts                   # token contrast proof, on src/styles/tokens.css
```

- The prototype navigated by hash (`#ladder`, `#chart`, `#review`, `#converter-l2a` as tab roots; `#section+sheet-id` /
  `#section+toast-id` opened a sheet or toast on arrival). The screenshots in `docs/design/screens/` are its captures.
- Aksara was never typed: `prototype.ts` filled it at runtime from `src/engine/index.ts` and from content ids through
  `loadContent` + `GlyphInfoTable`.
- `prototype/icon.html` (at `bf8eac8`) is the icon source for Task 16: `#icon-any` (rounded plate) and `#icon-maskable`
  (full-bleed, mark inside the centred 80 % circle, `?guide` draws the circle). Glyph = Jejeg `ca` from the engine.

## Design summary

Keeps the heritage brand (paper, soga ink, indigo, terracotta, gold, MPLUS Rounded 1c UI, Jejeg aksara, paper grain, paper
slips, numbered medallions, lozenge ornament, manuscript flashcard, brief staggered motion, radius 16). What changed:

| Area         | Source (Flutter prototype)   | Rework                                                                                                                                                                                                                |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type         | Material defaults + MPLUS    | Fixed scale `--text-xs … 2xl`, `--aksara-sm … hero`, aksara line height 1.9 so Jejeg tails and pasangan are never clipped                                                                                             |
| Spacing      | Ad hoc                       | 4 px grid `--space-1 … 10`                                                                                                                                                                                            |
| Ladder       | Medallion beside a list tile | Medallion + slip per unit: name, aksara preview, status line (icon + text). Completed = gold fill + check badge; ready = terracotta ring + play badge; locked = dashed ring + lock badge. One thread segment per step |
| Lesson       | Centered column              | Thumb-zone layout: progress bar + "Soal n dari m" at top, flashcard, sticky full-width action at the bottom; options are 56 px rows (aksara options 80 px)                                                            |
| Chart        | Wrapped tiles                | Carakan laid out as the four traditional rows of five; other sections auto-fill; every tile ≥ 48 px with the name shown under the glyph                                                                               |
| Detail       | Material bottom sheet        | Modal `<dialog>` sheet with grab bar, title and close button; centered dialog ≥ 768 px                                                                                                                                |
| Navigation   | Material `NavigationBar`     | Tab bar with pill + bold label + edge bar for the selected tab (not hue alone); becomes a left rail ≥ 960 px (see `desktop-ladder.png`)                                                                               |
| States       | Spinner only                 | Designed loading, empty, error (retry), update banner, storage-error banner                                                                                                                                           |
| Focus/motion | Material defaults            | 3 px indigo `:focus-visible` ring with offset on every control; one global reduced-motion block (durations 0.01 ms, delays 0)                                                                                         |

State is never hue alone: correct = indigo + check icon + solid border; wrong = terracotta + cross icon + **dashed** border;
completed/ready/locked differ by fill, ring style and badge icon; the selected segment is a filled block with inverted text.

Wide screens: content is centered at `--content-max` (40 rem). At ≥ 960 px the tab bar becomes a 7 rem rail
(`desktop-ladder.png`, `desktop-chart-detail.png`); `tablet-converter-l2a.png` shows 800 px with the bottom bar.

## Screens (360×740, DPR 2)

Pages are captured at full height (the viewport is resized to the content so the fixed tab bar lands at the bottom);
lessons and sheet states are captured at exactly 360×740. Sheet states are overlays on their host page, so they have no
section of their own; every other screen is a `<section id="…">`.

| #   | Id / route                                                            | Screenshot                                                                                                                                   |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ladder` (W07 variant: settings button next to teacher)               | [ladder](screens/ladder.png)                                                                                                                 |
| –   | `teacher` (pushed from the ladder)                                    | [teacher](screens/teacher.png)                                                                                                               |
| 2   | `lesson-meet`                                                         | [lesson-meet](screens/lesson-meet.png)                                                                                                       |
| 3   | `lesson-q-glyph`                                                      | [lesson-q-glyph](screens/lesson-q-glyph.png)                                                                                                 |
| 4   | `lesson-q-sound`                                                      | [lesson-q-sound](screens/lesson-q-sound.png)                                                                                                 |
| 5   | `lesson-feedback` (correct and wrong, stacked; W05)                   | [lesson-feedback](screens/lesson-feedback.png)                                                                                               |
| 6   | `lesson-done`                                                         | [lesson-done](screens/lesson-done.png)                                                                                                       |
| 7   | `chart`                                                               | [chart](screens/chart.png)                                                                                                                   |
| 8   | `chart+sheet-na`, `chart+sheet-wulu` (W11)                            | [chart-detail](screens/chart-detail.png), [sandhangan](screens/chart-detail-sandhangan.png)                                                  |
| 9   | `review` (drill with W02 feedback, then groups)                       | [review](screens/review.png)                                                                                                                 |
| –   | `review-help` (pushed from review)                                    | [review-help](screens/review-help.png)                                                                                                       |
| 10  | `review-empty`                                                        | [review-empty](screens/review-empty.png)                                                                                                     |
| 11  | `converter-l2a` (success, ambiguous, error); `+toast-copy` (W01, W08) | [converter-l2a](screens/converter-l2a.png), [copied](screens/converter-l2a-copied.png)                                                       |
| 12  | `converter-a2l+sheet-picker` (W11, W12, W13)                          | [converter-a2l](screens/converter-a2l.png)                                                                                                   |
| 13  | `settings`; `+sheet-report`                                           | [settings](screens/settings.png), [report dialog](screens/settings-report.png)                                                               |
| 14  | `states` (loading, load error, update banner, storage error)          | [states](screens/states.png)                                                                                                                 |
| –   | Keyboard focus ring                                                   | [focus-ladder](screens/focus-ladder.png)                                                                                                     |
| –   | Wide viewports                                                        | [tablet](screens/tablet-converter-l2a.png), [desktop ladder](screens/desktop-ladder.png), [desktop detail](screens/desktop-chart-detail.png) |
| –   | App icon (any, maskable, maskable with safe-zone guide)               | [icon](screens/icon.png), [maskable](screens/icon-maskable.png), [guide](screens/icon-maskable-guide.png)                                    |

The converter, drill and feedback variants are stacked on one page and labelled with a dashed "Varian: …" tag (prototype
annotation, not app copy; Task 10 drops it).

## Tokens and WCAG proof

`tests/unit/design/contrast.test.ts` parses `prototype/tokens.css`, resolves `var()` chains and asserts WCAG 2.x ratios
for 34 pairs (37 tests: role presence, the 34 pairs, touch/radius tokens, and a guard that `components.css` uses no primitive, hex or `rgb()`).
Components use only `--color-*` roles and the scales.

Lowest ratio per pair class (all pass):

| Class                                                     | Minimum | Lowest pair                                    | Result |
| --------------------------------------------------------- | ------- | ---------------------------------------------- | ------ |
| text on bg / surface / raised / sunken                    | 4.5     | `text` `#4A3728` on `surface-sunken` `#EFE4CF` | 8.92   |
| muted text on the same four                               | 4.5     | `text-muted` `#6B5C4A` on `surface-sunken`     | 5.12   |
| on-accent on accent                                       | 4.5     | `#FFFCF5` on `#B34A26`                         | 5.22   |
| link on bg / surface / raised                             | 4.5     | `#2E5E8C` on `surface` `#F3E8D3`               | 5.59   |
| danger text (bg, surfaces, danger-soft)                   | 4.5     | `#8F3A1C` on `danger-soft` `#F4DDD1`           | 5.77   |
| success text (bg, surfaces, success-soft)                 | 4.5     | `#244C73` on `success-soft` `#DDE7F1`          | 7.12   |
| text on accent-soft / reward-soft / reward-fill           | 4.5     | `#4A3728` on gold `#D9A441`                    | 5.00   |
| control border (`border-strong`) on bg / surface / sunken | 3       | `#857460` on `surface-sunken`                  | 3.57   |
| focus ring on bg / surfaces                               | 3       | `#2E5E8C` on `surface-sunken`                  | 5.38   |
| reward indicator on bg / surface                          | 3       | `#8F6508` on `surface`                         | 4.29   |
| accent indicator on bg / surface                          | 3       | `#B34A26` on `surface`                         | 4.41   |

AA was reachable inside every brand hue family. Brand values that did **not** pass for their intended use, and what
replaced them:

| Token                 | Brand hex / use                        | Ratio of the brand value                                  | Replacement                                                                                                 |
| --------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--soga-500` (muted)  | `#7A6B59` soga-soft, body text         | 4.67 on paper, 4.24 on paper-warm, **4.09 on paper-dark** | `#6B5C4A` → 5.85 / 5.31 / 5.12                                                                              |
| `--gold-600` (reward) | `#D9A441` gold as an indicator/outline | **2.04** on paper (needs 3)                               | `#8F6508` → 4.72 on paper. Brand gold stays as a **fill** (`--color-reward-fill`) with soga ink on it, 5.00 |
| `--soga-400` (border) | no brand value; hairline was 12 % soga | n/a (decorative)                                          | new `#857460` for control borders (4.08 on paper); `--paper-400 #E0D1B5` is the decorative hairline         |
| `--terracotta-700`    | `#B34A26` as danger **text**           | 4.85 on paper, 4.41 on warm, **4.25 on paper-dark**       | `#8F3A1C` → 6.82 on paper; `#B34A26` is kept for fills (button, ring, indicator, ≥ 4.41)                    |
| `--indigo-700`        | `#2E5E8C` for correct-answer text      | 6.15 (passes)                                             | `#244C73` added so correct reads clearly different from a link (8.08)                                       |

Unchanged brand values: paper `#FAF3E7`, soga `#4A3728` (10.19 on paper), indigo `#2E5E8C`, terracotta `#B34A26`, gold
`#D9A441`, paper-dark `#EFE4CF`, paper-warm `#F3E8D3`. New tints (`paper-50`, `paper-400`, `indigo-100`,
`terracotta-100`, `gold-200`) have no brand equivalent.

Semantic roles (`--color-*`): bg, surface, surface-raised, surface-sunken, text, text-muted, accent, accent-pressed,
accent-soft, on-accent, link, reward, reward-fill, reward-soft, border, border-strong, focus, success, success-soft,
danger, danger-soft, scrim, shadow.

## Icons (Lucide 1.51.0, ISC; Task 10 copies these into `src/ui/icons.ts`)

| Control                                   | Lucide name                                              |
| ----------------------------------------- | -------------------------------------------------------- |
| Tab: Belajar / Bagan / Ulangi / Ubah      | `book-open`, `layout-grid`, `repeat`, `arrow-left-right` |
| Ladder: teacher button / settings (W07)   | `graduation-cap`, `settings`                             |
| Back (every pushed page)                  | `arrow-left`                                             |
| Close (sheets)                            | `x`                                                      |
| Ladder status: completed / ready / locked | `circle-check` + badge `check`; `play`; `lock`           |
| Ladder row chevron                        | `chevron-right`                                          |
| Answer feedback: correct / wrong          | `circle-check`, `check` / `circle-x`                     |
| Lesson done                               | `trophy`                                                 |
| Review help button                        | `circle-help`                                            |
| Converter about button, toast, banner     | `info`                                                   |
| Copy                                      | `copy`                                                   |
| Open glyph picker                         | `keyboard`                                               |
| Report button                             | `mail`                                                   |
| Load / conversion error                   | `triangle-alert`                                         |
| Retry                                     | `refresh-cw`                                             |
| Storage-error banner                      | `hard-drive`                                             |
| Review-empty state                        | `check`                                                  |

## Rework candidates W01–W13

"Source alternative" is the Flutter behavior that applies if the user rejects the change.

| ID  | What the prototype shows                                                                                                                                    | Source alternative                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| W01 | `converter-l2a-copied`: output stays after Salin; the tofu warning is a transient toast                                                                     | Output disappears after copy                         |
| W02 | `review`: drill answers show a selected state with icon + dashed border + `Belum tepat`, and the correct option is revealed                                 | No visible feedback                                  |
| W03 | Not visible (no pull-to-refresh control); refresh on tab open, resume and enqueue remains                                                                   | Pull-to-refresh                                      |
| W04 | Not visible (behavior); refresh fires when Ulangi opens                                                                                                     | Refresh listens for the Ubah tab (stale comment)     |
| W05 | `lesson-feedback`: the last answer also gets the feedback view, then done                                                                                   | Last answer completes the unit without feedback      |
| W06 | Not visible (behavior); taught set = glyphs of completed units, so unit 2 gets more than two options                                                        | Empty taught set: unit 2 has 2 options, unit 7 has 1 |
| W07 | `ladder`: settings gear next to the teacher button in the Belajar top bar                                                                                   | Settings only from the converter info button         |
| W08 | `converter-l2a` error variant: `Tidak bisa mengubah:` + the engine message, and the offending character at `index` marked in an input echo                  | Raw engine message only                              |
| W09 | `settings`: licence and corpus copy name the served paths `licenses/` and `content/v1/words.json` and link them                                             | Flutter asset paths (wrong on the web; required)     |
| W10 | `states`, close buttons, status labels, scheme/direction labels (copy table below)                                                                          | No such strings exist (required by §3.5/§3.6)        |
| W11 | `chart-detail`, `converter-a2l`, `settings-report`: bottom-anchored modal `<dialog>` with close button (Android back closes it via CloseWatcher in the app) | Material bottom sheets                               |
| W12 | Picker section titles Carakan / Swara / Murda / Angka / Pada come from the `section*` keys (same words in both locales)                                     | Hard-coded titles                                    |
| W13 | Picker labels are content display names: `na murda`, `pada adeg-adeg`, `i panjang` (`longFormName`)                                                         | Engine ids (`naMurda`, `adegAdeg`, `paCerek tarung`) |

W03, W04 and W06 are behavior changes with no visual difference. Their wording is in `PARITY.md` section W; the prototype
cannot show them.

## W10 copy table (ready for approval)

Shown in the prototype in Indonesian; the English column is the Task 08 draft.

| key                   | id                                                                               | en                                                                  |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `loadingLabel`        | Memuat…                                                                          | Loading…                                                            |
| `loadErrorTitle`      | Konten aplikasi tidak bisa dimuat.                                               | The app content could not be loaded.                                |
| `retryButton`         | Coba lagi                                                                        | Try again                                                           |
| `storageErrorTitle`   | Penyimpanan perangkat tidak tersedia, jadi kemajuan belajar tidak bisa disimpan. | Device storage is unavailable, so learning progress can't be saved. |
| `updateAvailable`     | Versi baru Carakan sudah siap.                                                   | A new version of Carakan is ready.                                  |
| `updateReloadButton`  | Muat ulang                                                                       | Reload                                                              |
| `updateLaterButton`   | Nanti                                                                            | Later                                                               |
| `closeButton`         | Tutup                                                                            | Close                                                               |
| `skipToContent`       | Lewati ke konten                                                                 | Skip to content                                                     |
| `mainNavLabel`        | Navigasi utama                                                                   | Main navigation                                                     |
| `unitStatusLocked`    | Terkunci                                                                         | Locked                                                              |
| `unitStatusReady`     | Siap dipelajari                                                                  | Ready to learn                                                      |
| `unitStatusCompleted` | Selesai                                                                          | Completed                                                           |
| `schemeLabel`         | Ejaan Latin                                                                      | Latin spelling                                                      |
| `directionLabel`      | Arah ubah                                                                        | Conversion direction                                                |

## Open questions for the user

1. **Success colour.** The brand has no green. "Correct" is indigo + check icon, "wrong" is terracotta + cross icon +
   dashed border (state is never hue alone). Accept, or add a green for correct? A new hue leaves the brand families.
2. **Review-empty emoji.** `reviewEmpty` ends with a party emoji in the source. The prototype drops it and shows a gold
   check badge, because the emoji font is not guaranteed on cheap Android builds and renders as tofu where missing.
   Approve dropping it from the copy?
3. **Terracotta as text.** Brand terracotta (`#B34A26`) fails AA for small text on the darker surfaces (4.25–4.41). It
   is only used for fills, rings and indicators; text that needs the warning tone uses `#8F3A1C`. Accept?
4. **Chart detail for every tile.** The prototype opens one detail (na, wulu or angka 1) per section; the app opens the
   tapped glyph's own detail (parity P-C03).
5. **W01–W13:** per-item accept/reject for the decision record. Defaults to the source behavior when rejected.
6. **App icon.** Terracotta plate, gold manuscript frame and lozenge, paper-coloured Jejeg `ca`. Approve, or ask for a
   different glyph or ground.

## Known limits

- Everything that is behavior (offline, storage, routing, Android back closing sheets) is outside the prototype; the
  prototype only shows its visual states.
- The prototype loads MPLUS from `fonts/source/*.ttf` (3.4 MB each) because it is a dev-only artifact; the app serves
  subset WOFF2 (Task 09).
