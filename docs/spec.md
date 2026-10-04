# Carakan — web spec

Carakan is a mobile-first, installable, fully offline web app that teaches the Javanese script (aksara Jawa). It replaces the Flutter app `aksara-app` (ported from commit `ebc7cb5`, which stays unmodified). The old design spec is retired; this file is the current one.

## 1. Goal and users

- Goal: students open a link in the browser instead of installing an app. Full feature parity with the Flutter app at `ebc7cb5`, with a production-quality UI that keeps the heritage identity (paper, soga ink, indigo, terracotta, gold, MPLUS Rounded 1c, Jejeg for aksara).
- Primary users: elementary-school students (grade 3 and up) on cheap Android phones in Chrome. This is the design and acceptance target.
- Secondary users: teachers and adults who use the chart and converter, sometimes on tablet or desktop browsers. Layout works there; mobile comes first. The tab bar becomes a left rail from 960 px.
- Not targets: iOS/Safari, a store package (see section 12).
- There is no backend. All content ships with the app. All learner state stays on the device. The app makes no request outside its own origin: no third-party fonts, CDNs, analytics or telemetry. No personal data is collected.

## 2. Surfaces

The parity checklist, [`docs/parity.md`](parity.md), is the authority for every behavior below. Where the checklist and the Flutter source differed, the approved rework items W01–W15 in [`docs/decisions/0001-ui-rework.md`](decisions/0001-ui-rework.md) decided it.

| Surface      | Route         | What it does                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Belajar      | `#/`          | Gated ladder of 8 units. A unit opens a lesson: meet each glyph, then recognition questions in both directions (glyph → sound, sound → glyph). Completing a unit unlocks the next and enqueues its glyphs for review. Wrong answers feed the confusion-pair log.                                                                                                                  |
| Bagan        | `#/chart`     | The full chart in sections (carakan, sandhangan by function, murda, swara, rekan, angka, pada). Each tile opens a detail sheet: name, sounds, pasangan, murda, teacher-curated example words (aksara and school spelling, no meaning). Sandhangan are shown on a ha carrier. Every character is derived from the engine at run time.                                              |
| Ulangi       | `#/review`    | One spaced-repetition queue. Four grades (SM-2 variant). A card hides its answer until the learner reveals it (W14). "Ulangi" retests a card within the session. A targeted drill comes from the confusion pair the learner gets wrong most often. The queue refreshes when the tab opens, when the app resumes and when items are enqueued. `#/review-help` explains the grades. |
| Ubah         | `#/converter` | Converter in both directions. Ambiguous input shows candidates to choose from. PUJL/JGST scheme toggle, a glyph picker that inserts at the caret, a copy button with the tofu warning. Engine errors and ambiguity reasons are shown in the UI language (W15).                                                                                                                    |
| Settings     | `#/settings`  | Language switcher (System / Bahasa Indonesia / English), persisted. About: version, ruleset, rule sources, font credits and licenses, corpus. An offline feedback report that copies to the clipboard. Reachable from the Ubah info button and from the Belajar top bar (W07).                                                                                                    |
| Teacher page | `#/teacher`   | Explains the curriculum deviation (wulu and suku pulled forward) and the unit order.                                                                                                                                                                                                                                                                                              |

Tab roots are `#/`, `#/chart`, `#/review`, `#/converter`. Pushed surfaces are `#/settings`, `#/teacher`, `#/review-help` and `#/lesson/<unitId>`. An unknown hash lands on Belajar; a locked or unknown lesson redirects to `#/`.

## 3. Engine

`src/engine/` is a pure TypeScript port of `packages/aksara_engine` at `ebc7cb5`. Ruleset id: `kaj1-2021-simplified-v3` (`aksaraEngineRulesetId`).

- API: `toAksara(latin, { useMurda })` and `toLatin(aksara, { scheme: 'pujl' | 'jgst' })`. Both return an explicit `success`, `ambiguous` (with candidates and a reason) or `error` (with `index` and `message`) result. Ambiguity is never resolved by a silent guess.
- Pipeline (Latin → aksara): syllabify, map each syllable to a base aksara plus sandhangan, resolve consonant clusters into pasangan, apply pada and punctuation, join words. A comma after a pangkon is that pangkon plus a zero-width non-joiner; a full stop after a pangkon is pada lingsa. Aksara → Latin is nearly mechanical. Taling is stored after its base (Unicode logical order).
- Codepoints are generated by `tools/gen-codepoints.ts` (`npm run gen:codepoints`) from the archived Unicode slice `docs/references/unicode-javanese-block.txt` into `src/engine/codepoints.ts`. They are never hand-typed. No aksara literal appears in source, tests or tools; a guard test enforces it.
- Purity: `src/engine/**` imports only engine modules and is compiled under `src/engine/tsconfig.json` with no DOM and no Node types, so a DOM or Node reference is a type error. `tests/engine/engine-purity.test.ts` guards the import rule.
- Differential provenance: `tests/engine/fixtures/dart-ebc7cb5.json` is the Dart engine's output at `ebc7cb5` over the golden pairs, the full corpus, the shaping cases and a planner-defined input set, in both directions and both schemes, with `useMurda` on and off. `npm run parity:dump` regenerates it from the Dart source (extracted with `git archive`; the source repository is never touched). `tests/engine/differential.test.ts` asserts zero differences.
- Approved deviation from Dart (contract section 3.1, implemented in Task 04b): the Dart engine throws an unhandled exception when a cluster marker (cakra `ŕ`, pengkal `ỿ` or keret/pa-cerek `ṛ`) stands where a syllable-closing consonant would go (`kaŕ`, `raỿ`, `kaṛ`). The TypeScript engine returns an `error` result for those inputs. No input that the Dart engine converts changes its result. `toAksara` and `toLatin` never throw; `tests/engine/no-throw.test.ts` runs a seeded fuzz check and the differential test allowlists exactly the Dart-throwing records.
- Messages: the engine keeps English messages. The app localizes them through `src/features/converter/engine-messages.ts` (W15): every engine message, including the parameterized `Unknown character "<c>"` and `Unrecognized codepoint U+<hex>`, maps to an `engine*` message key in both locales; an unmapped message shows `engineErrorGeneric`. A source scan of `src/engine/**` fails `npm test` when an engine message has no mapping.

## 4. Content

Content `v1` is carried over byte for byte in `public/content/v1/`: `aksara.json`, `sandhangan.json`, `words.json`, `units.json`, `confusion_pairs.json`, `chart_examples.json`, `manifest.json`.

- The aksara and sandhangan catalogs are derived from the engine by `tools/gen-content.ts` (`npm run gen:content`) and regenerate byte for byte (`tests/tools/gen-content.test.ts`).
- Content is fetched once at bootstrap by `loadContent` (`src/content/content-repository.ts`), with real loading and error-with-retry states.
- Gates (`tests/content/**`, run by `npm test`): every corpus word round-trips through the engine; the manifest ruleset id and the murda Latin fields match the engine; chart examples have no pasangan and show the glyph they are listed under; units, confusion pairs, school spelling, glyph derivation and glyph universe checks.
- Invariant: the wordlist never stores aksara. It stores canonical JGST Latin only and renders through the engine.
- Corpus rules and how to add words: [`docs/content/corpus-guide.md`](content/corpus-guide.md). Word licensing: [`docs/references/wordlist-licensing.md`](references/wordlist-licensing.md).
- Content strings (unit names, glyph names, glosses) and the feedback report stay Indonesian under the English UI.

## 5. Architecture

- Stack: Vite, Svelte 5, TypeScript, client-only. No Tailwind: the approved prototype's `tokens.css` was promoted verbatim to `src/styles/tokens.css`. npm with a lockfile, Prettier, Vitest, Playwright.
- Layout: `src/engine/` (pure), `src/content/` (models, loader, glyph table), `src/core/` (`db/`, `srs/`, `locale/`, `app-info.ts`), `src/l10n/`, `src/app/` (shell, router, services, bootstrap), `src/ui/` (design system, Lucide icon data in `icons.ts`), `src/styles/`, `src/features/{lessons,chart,review,converter,settings}/`. Tests live in `tests/{engine,content,unit,tools,e2e}/`; build, audit and generation scripts in `tools/`.
- State pattern: feature logic is framework-free TypeScript exposing `svelte/store` readables and async methods; components subscribe. Time is injected as `now()` and randomness as `seedSource()`, so logic is deterministic under test.
- Services and sessions: `bootstrap.ts` builds one `Services` container (IndexedDB repositories, `ReviewQueue`, content, glyph table, locale controller, i18n, `activeTab`) and `App.svelte` provides it through context. `LadderModel`, `ReviewSession` and `DrillSession` are created through `singleton`, so they live for the app's lifetime and the review retry set survives tab switches.
- Routing: hash routing in `src/app/router.ts`, no dependency, no server rewrites. Tab switches use `history.replaceState`; pushed routes use `history.pushState({ carakan: depth })`. `back()` is `history.back()` when the stored depth is above 0, else a replace to `#/`.
- Keep-alive shell: `AppShell.svelte` mounts all four tab pages once and hides the inactive ones, so converter input and chart scroll survive switching. Pushed pages render above the hidden shell.
- Storage: IndexedDB database `carakan`, version 1, through `idb`. Object stores: `srsItems` (key `itemId`, index `dueAt`), `unitCompletions` (key `unitId`), `mistakeLogs` (key `confusionPair`). Times are epoch milliseconds. Schema constants are exported from `src/core/db/schema.ts`. The language choice is in `localStorage['carakan.uiLocale']` (`system`, `id` or `en`).
- SRS: `src/core/srs/srs-scheduler.ts` is pure. New item due now, ease 2.5. Again: due in 10 minutes, ease −0.2. Hard: due in `max(interval, 1)` days, ease −0.15. Good: interval 1 on the first repetition, else `round(interval × ease)`. Easy: interval 6 on the first repetition, else `round(interval × ease × 1.3)`, ease +0.15. Ease is clamped to [1.3, 3.0].
- l10n: `src/l10n/id.json` and `en.json`, flat keys with `{name}` placeholders. Indonesian is primary and the fallback; System follows the browser language list (first of `id`/`en`, else Indonesian). `<html lang>` follows the resolved locale. Tests require identical key and placeholder sets and fail on hard-coded UI strings.
- Not ported: audio (no recordings exist), dependency injection and drift code generation (replaced by the structure above).

## 6. Offline and PWA

- `vite-plugin-pwa` (`generateSW`, `registerType: 'prompt'`) precaches every file in `dist` (html, js, css, json, woff2, ttf, png, svg, webmanifest, txt): shell, content and fonts. After the first load every surface works with no network. The manifest (`id`, `start_url`, `scope` all `/`) and icons make the app installable on Android Chrome.
- Update policy: a new service worker waits. It activates on the next launch (all clients closed) or when the user accepts the update banner. The banner never shows on `#/lesson/*`, and only the window whose Reload button was tapped reloads (`onNeedReload` in `UpdateBanner.svelte`; the library default reloads every window). Another window keeps running on its loaded assets, since the app has one bundle and no lazy chunks, and gets the new build on its next load or its own Reload, so an update never interrupts a lesson or review.
- Persistence: the app requests `navigator.storage.persist()` at startup when storage is not yet persistent.
- Risk: learner state lives only in browser storage. Clearing site data erases progress. There is no export or import (deferred, section 12).

## 7. Fonts

- MPLUS Rounded 1c is subset to the glyphs the app needs: Latin, Indonesian and every JGST diacritic the engine can output. `tools/fonts/glyphset.ts` derives the glyph set (`fonts/glyphset.txt`) from the UI strings and the engine; `tools/fonts/subset.sh` (`npm run fonts`) subsets the carried TTFs in `fonts/source/` to `public/fonts/mplus-rounded-1c-{400,700}.woff2` and `tools/fonts/check_coverage.py` fails when a glyph-set code point is missing. Any task that changes a UI string reruns `npm run fonts`; a drift test fails until the regenerated files are committed. The echoed character of `Unknown character "…"` messages is not in the glyph set, so typed characters fall back to the system font.
- Jejeg (`nykNgayogyanJejeg-Regular.ttf`) is served unmodified: no subsetting and no re-encoding, so the app does not ship a derived work of an all-rights-reserved font. It is declared with `unicode-range: U+A980-A9DF, U+200C-200D, U+25CC`. Aksara text uses `"MPLUS Rounded 1c", "Jejeg", sans-serif`, MPLUS first, so Latin never uses Jejeg's Latin.
- Shaping is checked against the exact shipped Jejeg bytes: `npm run shaping` compares the TypeScript engine's case dump with the Dart dump byte for byte and shapes every case with HarfBuzz (`# 0 failing case(s)`).
- Licensing status: no license text ships with Jejeg. The maintainer accepted deploying it while the rights holder's written permission is pending; this is recorded in `public/licenses/NOTICE-fonts.txt`. Record the permission there when it arrives.

## 8. Accessibility and performance standards

| Standard                                               | How it is gated                                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WCAG 2.2 AA contrast                                   | `tests/unit/design/contrast.test.ts` over the design tokens; axe on every surface (`tests/e2e/a11y.spec.ts` and per-page specs). State is never conveyed by hue alone. |
| Touch targets of at least 48 CSS px                    | `expectTouchTargets` in the per-page e2e specs.                                                                                                                        |
| Visible keyboard focus, correct semantics              | `tests/e2e/a11y.spec.ts`, role-based locators throughout the e2e suite.                                                                                                |
| `prefers-reduced-motion`                               | One global reduced-motion block in `src/styles/base.css`; e2e spec for lesson transitions.                                                                             |
| 360 px baseline, no horizontal overflow                | `mobile` Playwright project (360×740, DPR 2); `layout.spec.ts` also runs at 800×1280 and 1280×800.                                                                     |
| First load ≤ 1 MB compressed, fonts included           | `npm run measure` (estimate from `dist`) and `npm run served:measure` (bytes on the wire from the production image).                                                   |
| Lighthouse mobile performance ≥ 90, accessibility ≥ 95 | `npm run lighthouse`, median of three runs, against the production image.                                                                                              |
| No runtime request outside the origin                  | The e2e fixture fails any test whose page requests another origin.                                                                                                     |

## 9. Hosting

- Target: `https://carakan.fiatcode.dev/`, served from the domain root. There is no demo deploy. Hash routing keeps every route at `/`, so no server rewrites exist anywhere.
- Image: the `Dockerfile` builds with `node:24-alpine` (`CARAKAN_BUILD_ID` build arg required; it becomes `meta[name=carakan-build]`) and serves `dist` with `static-web-server:2-alpine` and `sws.config.toml`. This follows the `site/` convention.
- Cache policy (`sws.config.toml`): `**` gets `no-cache`; `/assets/**` (Vite's content-hashed output) gets `public, max-age=31536000, immutable`. HTML, `sw.js`, `workbox-*.js`, the manifest and every unhashed file (content JSON, fonts, icons, licenses) must revalidate: the service worker's install and update fetches must never be answered from a stale HTTP cache, or an update would never arrive (contract risk, section 8). Compression is on.
- CI: `.github/workflows/build.yml` builds on pull requests and, on push to `main`, pushes `ghcr.io/fiatcode-gh/carakan:{latest,<sha>}`.
- Production routing: a `carakan.container` quadlet unit and a Traefik router with a TLS certificate live in `fiatcode-infra`, not in this repository.
- Production runbook and publication steps: `docs/deploy.md` (added by Task 20).
- Local proof: `npm run served:up` builds the production image and runs it behind a Traefik configured like production at `http://localhost:8090/`. `served:headers` checks content types, cache headers, compression and no SPA rewrite. HSTS is asserted only for https base URLs, because Traefik sets it only over TLS; production proof of HSTS and the certificate belongs to the production acceptance (Task 21).

## 10. Testing and gates

| Script                                           | What it proves                                                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `preview`                        | Vite dev server / preview of `dist`.                                                                                                                                                   |
| `npm run build`                                  | Production build, including the service worker and precache manifest.                                                                                                                  |
| `npm run check`                                  | `svelte-check --fail-on-warnings` and a type check of the engine under its no-DOM, no-Node config.                                                                                     |
| `npm test`                                       | Vitest: ported engine suite, differential check against the Dart fixture, never-throw fuzz, content gates, core and feature logic, l10n guards, token contrast, tool and config tests. |
| `npm run test:e2e`                               | Playwright on Chromium: every flow at 360×740 (project `mobile`), layout at tablet and desktop widths. Builds and previews `dist` itself unless `E2E_BASE_URL` is set.                 |
| `npm run test:e2e:served`                        | The shell, offline and a11y specs against `E2E_BASE_URL` (default `http://localhost:8090/`, the served image).                                                                         |
| `npm run parity:coverage`                        | Every parity ID whose proof is `unit` or `e2e` appears in at least one test title; prints ID → tests.                                                                                  |
| `npm run format` / `format:check`                | Prettier write / check (never over `.flow/`).                                                                                                                                          |
| `npm run shaping`                                | TypeScript case dump equals the Dart dump; HarfBuzz reports 0 failures on the shipped Jejeg. Needs dart and uv.                                                                        |
| `npm run fonts`                                  | Regenerates the glyph set and the MPLUS subsets and checks coverage. Needs uv. The gate adds `git diff --exit-code fonts/ public/fonts/`.                                              |
| `npm run parity:dump`                            | Regenerates the Dart fixture. Needs dart. The gate adds `git diff --exit-code tests/engine/fixtures/`.                                                                                 |
| `npm run gen:content`, `gen:codepoints`, `icons` | Regenerate derived content, codepoints and app icons.                                                                                                                                  |
| `npm run measure`                                | Estimated first-load transfer from `dist`.                                                                                                                                             |
| `npm run served:up` / `down`                     | Build and run / stop the production image behind local Traefik (podman).                                                                                                               |
| `npm run served:headers`                         | Per-file content type, cache and compression headers, deep links, no rewrite.                                                                                                          |
| `npm run served:measure`                         | First-load bytes on the wire from the production image (≤ 1,000,000).                                                                                                                  |
| `npm run lighthouse`                             | Lighthouse mobile median of three runs: performance ≥ 90, accessibility ≥ 95.                                                                                                          |
| `npm run design:compare`                         | Evidence only: app captures next to the approved prototype screens in `.flow/evidence/<HEAD>/design/`.                                                                                 |

The full gate runs on one tree: `npm ci`, `check`, `test`, `build`, `test:e2e`, `parity:coverage`, `format:check`, `shaping`, `fonts` with a clean diff, `parity:dump` with a clean diff, then `served:up`, `served:headers`, `test:e2e:served`, `served:measure`, `lighthouse`, `served:down`.

## 11. Rule authority

The engine implements Kongres Aksara Jawa I, Yogyakarta 2021, Simplified style. JGST (KAJ I Komisi I) is the canonical scheme; PUJL (school spelling) is the user-facing one. Murda is never applied by the converter. Sources, version history (v1 → v2 → v3) and the rationale for each rule are in [`docs/references/CITATIONS.md`](references/CITATIONS.md); the KAJ I PDF and the Unicode Javanese block slice are alongside it. The ruleset id is shown in About, and the feedback path lets users report corrections.

## 12. Deferred

Out of scope for this unit, and not tracked as TODOs by decision:

- iOS/Safari shaping check and Safari support.
- Safari storage-eviction mitigation, such as progress export and import.
- Audio: no recordings exist; this waits for the voice talent.
- Stroke tracing, share-as-image, accounts and sync, teacher and classroom features.
- A store package (Trusted Web Activity / Play Store) and any ruleset change or new content beyond `v1`.
