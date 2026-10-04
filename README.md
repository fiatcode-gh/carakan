# Carakan

Carakan is a web app for learning Javanese script (aksara Jawa): gated lessons, a glyph chart, spaced-repetition review and a Latin/aksara converter. It runs entirely in the browser as an installable, offline-capable app. There is no backend, no account and no analytics; learner progress stays on the device.

It lives at <https://carakan.fiatcode.dev/> (built as a container image by CI, served from the domain root). The design, engine, architecture and gates are described in [`docs/spec.md`](docs/spec.md); the parity checklist against the original app is [`docs/parity.md`](docs/parity.md).

## Requirements

- Node 24 or newer, with npm.
- `dart`, for `parity:dump` and `shaping` (the Dart engine at the source revision).
- `uv`, for `shaping` and `fonts` (HarfBuzz and fontTools run through it).
- `podman`, for the `served:*` scripts.
- Playwright's Chromium for the end-to-end tests: `npx playwright install chromium`.

```sh
npm ci
npm run dev
```

## Commands

| Command                             | What it does                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Vite dev server.                                                                                           |
| `npm run build`                     | Production build into `dist/`, including the service worker.                                               |
| `npm run check`                     | `svelte-check` and a type check of the pure engine.                                                        |
| `npm test`                          | Vitest: engine, differential check, content gates, logic, l10n guards, tool tests.                         |
| `npm run test:e2e`                  | Playwright end-to-end tests (builds and previews `dist/` itself).                                          |
| `npm run test:e2e:served`           | Shell, offline and a11y specs against the served image (`E2E_BASE_URL`, default `http://localhost:8090/`). |
| `npm run shaping`                   | Checks the TypeScript engine's shaping cases against the Dart dump and HarfBuzz.                           |
| `npm run parity:dump`               | Regenerates the Dart engine fixture used by the differential test.                                         |
| `npm run parity:coverage`           | Fails unless every automated parity item appears in a test title.                                          |
| `npm run fonts`                     | Regenerates the glyph set and the MPLUS Rounded 1c subsets.                                                |
| `npm run measure`                   | Estimates the first-load transfer from `dist/`.                                                            |
| `npm run served:up` / `served:down` | Builds the production image and runs it behind a local Traefik (`http://localhost:8090/`) / stops it.      |
| `npm run served:headers`            | Checks content types, cache headers, compression and routing on the served image.                          |
| `npm run served:measure`            | Measures the first-load bytes on the wire from the served image.                                           |
| `npm run lighthouse`                | Lighthouse mobile audit of the served image (median of three runs).                                        |
| `npm run format` / `format:check`   | Prettier.                                                                                                  |

The other scripts (`gen:content`, `gen:codepoints`, `icons`, `design:compare`, `preview`) are listed in [`docs/spec.md`](docs/spec.md#10-testing-and-gates).

## Provenance

Carakan is a port of the Flutter app aksara-app at commit `ebc7cb5`, which stays unmodified. The engine is a TypeScript port of its Dart engine, checked against it by a differential test; content `v1` and the rule references carried over. The one approved engine deviation is that cluster markers in coda position return an error instead of crashing (spec section 3).

## Fonts and licensing

- MPLUS Rounded 1c: SIL Open Font License 1.1 (`public/licenses/ofl-mplus.txt`).
- nyk Ngayogyan Jejeg is served unmodified for aksara. No license text ships with it, and the rights holder's written permission is still pending; the maintainer accepted deploying it in the meantime. See `public/licenses/NOTICE-fonts.txt`.
- Icons are Lucide (ISC, `public/licenses/lucide-LICENSE.txt`).
- Word-list sources and licensing: [`docs/references/wordlist-licensing.md`](docs/references/wordlist-licensing.md).
