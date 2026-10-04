# Carakan web port

- Date: 2026-10-04
- Work: [PR #1](https://github.com/fiatcode-gh/carakan/pull/1) (`feat/web-port`, fast-forwarded to `0d8f9ed`). Follow-ups: #2 (CI), #3 (fuzz-test timeout). Production: `https://carakan.fiatcode.dev/`, served by `fiatcode-gh/fiatcode-infra#16`.
- Source: Flutter app `aksara-app@ebc7cb5`. That repository is left unchanged.

## What and why

Carakan moved from a Flutter Android app to a mobile-first, offline web app, so students open a link instead of installing from a store. It has full parity with `ebc7cb5`. The UI was rebuilt to production quality inside the existing heritage brand ([0001-ui-rework.md](0001-ui-rework.md)). There is no backend: content ships with the app, and learner state stays in the browser's IndexedDB.

Out of scope: iOS/Safari support, progress export, audio, a store package and ruleset changes.

## Decisions

- **The port replaces the Flutter app rather than running beside it.** The TypeScript engine is now the only engine. A differential check against the Dart engine at `ebc7cb5` (`tests/engine/differential.test.ts`, 18,340 recorded calls) proves it matches. Rejected: compiling the Dart engine to JS, which would keep two toolchains alive.
- **One deliberate engine difference.** The Dart engine threw an exception when a cluster marker (`ŕ`, `ỿ`, `ṛ`) stood where a syllable-closing consonant goes (`kaŕ`). The TypeScript engine returns an Error result instead, and `toAksara`/`toLatin` never throw. A seeded fuzz test enforces this. Reading `kaṛ` as ka plus pa cerek would be a ruleset change, so it was left as an error.
- **Stack: Vite, Svelte 5, TypeScript, `idb`, `vite-plugin-pwa`, plain CSS custom properties.** Rejected: Flutter web, because of a heavy first load, weak text selection and a deprecated service worker; and Tailwind, which would add a second source of truth next to the approved prototype's tokens.
- **Hash routing at the domain root.** No server rewrites are needed. The relative-base machinery was dropped once the demo-path deploy was dropped.
- **Updates prompt the user and only the accepting window reloads.** The banner never shows during a lesson. A window that did not accept keeps running on its loaded assets.
- **Fonts.** MPLUS Rounded 1c is subset to the glyphs the app uses (215 code points, about 15 KB per weight). Jejeg is served unmodified, because it is "All Rights Reserved" and a converted copy would be a derived work. The HarfBuzz shaping check runs against the exact file that is served.
- **Hosting follows `site/`.** The image runs static-web-server. `sws.config.toml` sends `no-cache` everywhere except the hashed `/assets/**`, so service worker updates always revalidate. CI publishes the image to `ghcr.io/fiatcode-gh/carakan`. `fiatcode-infra` holds the quadlet unit and the Traefik router.
- **Repository rules.** `main` changes through squash-merged PRs, the `lint-and-test` and `build` checks are required, and admins can bypass. The approved prototype commit `bf8eac8` is already on `main`, so squash merges keep it reachable.

## Traps

- Never type aksara characters in source or tests. Build them from Unicode names (`javaneseChar`, `ak()`); a guard test enforces this.
- Unit bit sets are 57 bits wide, so they use `bigint`, never `1 << i`.
- axe reads colors mid-fade. `expectAccessible` waits for every running animation first.
- Traefik sets HSTS only over TLS. The local harness asserts it only for https base URLs.
- An emulator has no WebAPK minting service, so Chrome installs a standalone shortcut there. A real phone over https is expected to get a WebAPK, but this has not been observed yet.

## Open questions

- Written permission for the Jejeg font is still pending. The deploy note is in `public/licenses/NOTICE-fonts.txt`.
- WebAPK install on a physical Android phone has not been tested yet.
- `navigator.storage.persist()` is requested, but Chrome did not grant it on the emulator. Clearing site data still erases progress.
