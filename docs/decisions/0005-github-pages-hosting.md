# 0005 — Hosting on GitHub Pages

- Date: 2026-11-27
- Status: accepted; cutover pending.
- Work: branch `chore/github-pages`.

## Context

Carakan ran on the VPS (`fiatcode-infra`, a rootless podman quadlet behind Traefik) only so teachers could try it; it was never meant to stay there. Every release needed VPS access (image push, then `podman pull` and a restart on the box), and the site was down whenever the VPS was. This record supersedes the "Hosting follows `site/`" bullet of [`carakan-web-port.md`](carakan-web-port.md).

## Decisions

- **Pages via Actions.** `.github/workflows/pages.yml` (`pages`) has two jobs. `build` runs on every pull request and every push to `main`, building with `CARAKAN_BUILD_ID` set to the 7-character commit SHA (it becomes `meta[name=carakan-build]`); on a push it uploads `dist` as the Pages artifact. `deploy` runs on pushes only and publishes it; only `deploy` holds `pages: write` and `id-token: write`.
- **Same origin.** The address stays `https://carakan.fiatcode.dev/`. Learner progress lives in browser storage tied to that origin, and installed apps are tied to it too; a new origin would lose both.
- **Domain in the Pages settings.** The custom domain is set through the repository's Pages settings, with `fiatcode.dev` verified for the `fiatcode-gh` account. There is no `CNAME` file: a custom Actions workflow ignores it.
- **Job id `build` kept.** The `main` ruleset requires the `lint-and-test` and `build` checks, which are job ids. The Pages build job keeps the id `build`, so the ruleset does not change.
- **Container path removed.** The `served:*` scripts and `tools/served/`, the `Dockerfile`, `.dockerignore`, `sws.config.toml` and the image workflow are gone.
- **`pages:check` checks what Pages can serve.** It reads the deployed `sw.js` as its file list and checks every precached file against its revision, `cache-control: max-age=600`, the HTML/JS/CSS types, the build id (`EXPECT_BUILD`), 404 for unknown paths, the HTTP → HTTPS redirect and the first-load bytes on the wire (≤ 1,000,000). `test:e2e:served` became `test:e2e:pages`, and `lighthouse` defaults to the deployed site.
- **Rollback by revert.** Revert the offending commit in a squash-merged pull request; the revert deploys like any release and reaches installed clients as an update. No server step.

## Trade-offs

- **`max-age=600` on every file.** Pages sends it and it cannot be configured; the VPS sent `no-cache` on HTML, `sw.js`, the manifest and content. Updates still arrive. The browser fetches `sw.js` for its update check without the HTTP cache (default `updateViaCache: 'imports'`), and the imported `workbox-<hash>.js` has a content-hashed name. Workbox fetches every revisioned precache entry with `cache: 'reload'` (`workbox-precaching/PrecacheController.js:103`, workbox 7.4.1), and each revision is the md5 of the file bytes. Only the `assets/**` entries are unrevisioned, and their names carry a content hash. A release can therefore reach a returning client up to about ten minutes late.
- **`/assets/**` is no longer cached for a year as `immutable`.** It gets ten minutes plus revalidation: slower, not wrong.
- **No HSTS header.** It came from Traefik's `security-headers` middleware. `.dev` is on the HSTS preload list, so browsers force HTTPS anyway.
- **Certificate gap at the DNS switch.** GitHub issues the certificate only after DNS points at Pages; until then new visitors may see a certificate error, while installed clients keep running from the service worker cache. The switch happens at a quiet time, not during a class.
- **No server logs.** Carakan has no request logs any more.
- **The `ghcr.io/fiatcode-gh/carakan` package is kept.** Its images are harmless; deleting them is a separate decision.
