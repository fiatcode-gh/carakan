# 0003 — Buku Poster redesign

- Date: 2026-10-23
- Status: approved by the user (contract `buku-poster-redesign`)
- Work: branch `feat/buku-poster`
- Reference: `docs/design/buku-poster/` (DESIGN.md, tokens.json, screenshots, screens)
- Supersedes: decision 0001 item 1 (tokens), item 2 (correct and wrong states) and item 4 (app icon); item W14 of the rework table.

## Context

The app kept the heritage look approved in decision 0001. The user supplied a new design reference, "Buku Poster": ruled notebook paper, thick ink outlines, hard shadows and three accent colours. The user asked for the full reference, new features included. The work re-skins every screen and adds tracing practice, sound buttons, a review quiz and shape notes.

## Decisions

D1 to D9 were settled with the user in the contract.

- **D1 Scope.** The full reference, new features included.
- **D2 Aksara font.** Jejeg stays. Noto Sans Javanese is not shipped.
- **D3 Latin fonts.** Bricolage Grotesque (500, 700, 800) for the UI; Patrick Hand (400) for hand notes. Refined 2026-10-22, see below.
- **D4 Unit colours.** The three accents cycle by ladder order: coral, periwinkle, butter.
- **D5 Copy.** The reference wording, Indonesian first, plain English equivalents.
- **D6 Tracing.** Free tracing over a ghost glyph, judged by coverage. No stroke order.
- **D7 Sound.** A clip player with a "coming soon" toast when no clip exists.
- **D8 Review.** The review is a quiz. A right answer grades `good`, a wrong one `again`. Strength bars come from stored data.
- **D9 Shape notes.** The shared-shape text from teacher feedback round 2 becomes content.

### Replaced items of decision 0001

1. **Tokens (item 1).** `src/styles/tokens.css` now mirrors the Buku Poster set in `docs/design/buku-poster/tokens.json`. Only `:root` holds literals; components use `var(--…)`. Colour names are the reference names (`--color-paper`, `--color-card`, `--color-ink`, `--color-coral`, `--color-periwinkle`, `--color-butter`, `--color-sage` and so on). Text on any accent is `--color-ink`, never a muted ink. `--color-placeholder` is never a text colour. There are no radius tokens: corners are square, stamps use `border-radius: 50%`. The contrast test keeps forbidding colour literals in component CSS.
2. **Correct and wrong (item 2).** Correct = sage fill + check icon. Wrong = coral fill + cross icon. State is never shown by hue alone. Error and danger state = stamp-colour text, dashed border and a triangle-alert icon.
3. **W14.** Review no longer hides the answer and grades with four buttons. It is a quiz (D8).
4. **App icon (item 4).** A coral note with the Jejeg `ha`, taped on and tilted, over a butter and a periwinkle card (`docs/design/favicon/`, user-supplied 2026-10-23). The letter is the Jejeg outline converted to paths, so no font is needed. The tab uses `favicon.svg` with `favicon.ico` (16, 32, 48 px) as fallback; iOS uses `apple-touch-icon.png`; the manifest keeps `icons/icon-192.png`, `icon-512.png` and `icon-maskable-512.png`. The PNGs are committed as delivered; the SVG sources are in `docs/design/favicon/src/`, and the old `npm run icons` renderer is gone. Jejeg is "All Rights Reserved", so logo use needs the author's consent like the font itself.

### How

- **Fonts.** Bricolage for the UI, Patrick Hand for notes, hints and stamps. MPLUS Rounded 1c for converter text and as fallback. Jejeg for aksara, with MPLUS first in the stack so Latin never uses Jejeg's Latin. Bricolage and Patrick Hand ship as unmodified fontsource WOFF2 files with the Google Fonts subset ranges. Licences are in `public/licenses/`.
- **D3 refinement (user-approved 2026-10-22).** Bricolage and Patrick Hand lack some JGST and PUJL letters. A Latin reading renders whole in Bricolage when every code point is in the bundled Bricolage subsets, else whole in MPLUS. Fonts never mix inside one string. The coverage is generated from the WOFF2 cmaps: `tools/fonts/display_coverage.py` writes `src/ui/display-coverage.ts`, and `npm run fonts` runs it. `src/ui/reading-font.ts` and the `Reading` component apply it. Converter input, output and echo (free user text) stay in MPLUS.
- **D4 accents.** `src/features/lessons/unit-display.ts` is the one source of the assignment: the accent is `["coral", "periwinkle", "butter"][ladderIndex % 3]`. The accent type and its colour token live in the design system (`src/ui/accent.ts`), so `src/ui` never imports a feature. The ladder, the hero card, chart label strips and legend, lesson and trace headers, breakdown chips and review rank all use it. A glyph takes the colour of the first unit that teaches it; a glyph no unit teaches is neutral.
- **Learn cards (user request 2026-10-23).** Every Learn card wears tape, not only the hero, although the reference allows one or two decorations per screen. Tile tapes take one of four layouts by grid position: rows alternate between the top edge and the outer side edge, so no two tapes meet in a gap, and none covers the number, status icon or title. Tape on a butter surface is paper-white, since butter tape vanishes on butter. The card does not clip; a separate layer crops only the watermark, so the tape can stick out past the edge. The watermark is big and cropped as art (hero 300px at 0.5 opacity, tiles 140px at 0.25).
- **Lesson flow.** Per glyph: meet, then trace (base letters only), then that glyph's questions, then the next glyph. The question plan is the unchanged generator output (W06 and its addendum), regrouped by unit glyph order. Units without base letters skip tracing.
- **Tracing judge.** The pad is rasterized into 2 px cells. Coverage is the share of glyph cells within 4 cells (8 px) of ink. Precision is the share of ink cells within 2 cells (4 px) of the glyph. A trace passes at coverage 0.6 and precision 0.72 (`src/features/tracing/trace-score.ts`). There is no stroke order, start point or stroke count, because no verified data exists. Three passes finish the practice. Empty ink and scribbles fail, and so does a blind zigzag over the glyph's ink box. The first values (4 px cells, 16 px precision radius) let that zigzag pass for nearly every letter, because the radius plus the 12 px stroke put the whole box near the glyph. A zigzag still covers the whole glyph, so precision is the only check that separates it. Measured over the 20 letters: a genuine trace scores precision 0.99 or more, a sloppy one (off by 6 px on both axes) 0.75 or more, and zigzags with rows 12, 18 and 24 px apart 0.68 or less. `node tools/tracing/measure-judge.ts` prints the table. These values are provisional until the phone check (user decision 2026-10-23: tighten now, tune on the phone).
- **"Lewati" skip.** The trace screen keeps a quiet "Lewati" button (`traceSkip`). It is not in the reference. It lets keyboard and assistive-technology users finish a lesson without drawing. The user decided to keep it (2026-10-22).
- **Sound.** `public/audio/clips.json` is the manifest: `{ "version": 1, "clips": {} }`. The key is the reading text; the value is a path matching `audio/<name>.<ogg|opus|mp3|m4a|wav>`. A bad shape, key or path rejects the whole manifest. `ClipPlayer` loads it lazily, plays one clip at a time and reports "unavailable" for a missing clip or a failed load, which shows the `audioComingSoon` toast. No clips are added. Follow-up: when clips are added, their file types must be added to the service worker precache patterns (`vite.config.ts` precaches `html, js, css, json, woff2, ttf, png, svg, webmanifest, txt`, so an `.ogg` file would not be cached).
- **Quiz and strength.** The review quiz (`#/review/quiz`) asks each listed card once, always glyph → sound. A right answer grades `good`; a wrong one grades `again` and the card comes back later in the same run. Grades go through the existing `ReviewSession.grade`, so the retry set and refresh rules keep working. Strength (`src/features/review/strength.ts`) reads the stored card: 0 repetitions is level 1 (baru); an interval under 3 days is level 2 (lumayan); under 21 days is level 3; 21 days or more is level 4 (levels 3 and 4 read kuat). No stored field and no database version changed.
- **Shape notes.** `public/content/v1/shape_notes.json` holds the notes (`status: "draft"`), Indonesian and English, for the base letters. They show as a hand note on the chart detail and under the meet card. Content stays `v1`. The Indonesian wording is new and still a draft for the teacher to review.
- **Touch targets.** 44 px, as in the contract invariant. The spec said 48 px before.
- **Design comparison.** `npm run design:compare` captures the app at 390×844 next to the reference screenshots.

### Phone check, 2026-10-23

The user tried the build on an Android phone (Chrome, 392×755 CSS px) and found five defects. All five are fixed.

- **Trace result in view.** The result line (`traceEmpty`, `traceFail`, `tracePass`) sat under the three slots, where the sticky bar covered it. It now shares the hint row above the pad and replaces the hint while it shows. It is still a polite live region.
- **Sheet drag.** On a phone the grab handle and the sheet head drag the sheet down. A release past a quarter of the sheet height, or a downward fling (0.5 px/ms after at least 24 px), closes it through the same close path as the close button, so Escape, Android back and focus return behave the same. Any other release springs back. The body is not part of the drag zone and scrolls as before. Under reduced motion there is no slide. From 48 rem the sheet is a centred dialog with no handle and no drag. The rules live in `src/ui/sheet-drag.ts`.
- **No pull-to-refresh (W03).** Dragging the sheet started Chrome's pull-to-refresh in a browser tab. `overscroll-behavior-y: contain` is now set on the root and the body; the sheet body already had it. This keeps decision W03 true outside the installed app too.
- **Room for every mark (decided 2026-10-23).** Pasangan, suku, keret, pengkal, ngalelet, murda ja, le, leu, andap, madya and luhur drew into the label strip, and layar and pepet rise close to the top border. The glyph area of every chart tile is now one size, 80 px (it was 62), so a tile is 106 px tall with a one-line strip instead of 92 px. This departs from the reference's 92 px tile on purpose: the contract invariant that aksara are never clipped wins. Measured on all three tabs, every glyph keeps at least 5 px below its ink and 11 px above it. One size, no per-entry cases; an e2e test scans every tile.
- **Whole labels.** Label strips wrap instead of ending in an ellipsis. Each tile spans two rows of the chart grid and shares them through a subgrid, so the strips of one row stay level and as tall as the longest label needs. The Pasangan tab shows the base syllable only (`da`); the tile keeps `pasangan da` as its accessible name. The tile token `--tile-height` became `--tile-glyph` (the room above the strip).

### User decisions, 2026-10-22

- Keep "Lewati" on the trace screen.
- The review quiz always asks glyph → sound.
- Quiz prompts carry no reading label.

## Consequences

- Every screen uses the new system; components were renamed or removed as listed in the plan (`Surface`, `AksaraTile`, `QuizStep`; `Medallion`, `OrnamentDivider`, `Flashcard` and `ladderPreview` are gone).
- Parity IDs P-R03, P-R14 and P-R15 are retired. New IDs: P-B19 to P-B21, P-C09, P-S11, P-R17 and P-R18. Rewritten rows keep their IDs.
- `docs/spec.md`, `docs/parity.md` and the README describe the new look and flows.
- The Flutter-era claim "audio not ported" no longer holds for the UI. Only the recordings are missing.

## Known limits

- The review quiz needs at least 2 stored cards to build options. With one stored card it shows the empty state.
- Shape-note Indonesian wording is new and still a teacher-review draft.
- Trace thresholds (coverage 0.6, precision 0.72) and radii (cover 8 px, precision 4 px) are provisional. They are calibrated with synthetic traces and wait for a real-finger check on a phone (user decision 2026-10-23). The gap between a sloppy trace and a zigzag is about 0.07 of precision, so a shaky real hand may need a lower threshold. Allowed range: coverage 0.5 to 0.7, precision 0.6 to 0.8.
- Quiz prompts carry no reading label, because it would give the answer away. The user accepted this.
- The converter copy toast can overlap the action row.
- Long units (u7 with 20 glyphs, u8 with 18) show many meet chips; chips wrap onto their own row.
- Cross-window erase limits are unchanged.
- Stroke-order data and audio recordings do not exist yet.
- The Jejeg licence question is unchanged.
