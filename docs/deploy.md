# Deploying Carakan

How a release reaches `https://carakan.fiatcode.dev/`. Every production step below needs the maintainer's explicit approval at the time it happens; nothing here runs unattended. Hosting design: `docs/spec.md` section 9.

## 1. Gate the tree

Run the pre-merge gate on the tree you intend to ship (`docs/spec.md` section 10): `npm ci`, `check`, `test`, `build`, `test:e2e`, `parity:coverage`, `format:check`, `shaping`, `fonts` with a clean diff (`git diff --exit-code fonts/ public/fonts/`) and `parity:dump` with a clean diff (`git diff --exit-code tests/engine/fixtures/`).

## 2. Publish

Changes reach `main` through a squash-merged pull request. The `main` ruleset blocks deletion and force pushes, requires linear history, and allows only squash merges. It also requires the `lint-and-test` and `build` checks to pass, and repository admins can bypass it.

The push to `main` runs `.github/workflows/pages.yml` (`pages`): job `build` builds `dist` with `CARAKAN_BUILD_ID` set to the short commit SHA and uploads it, and job `deploy` publishes it to GitHub Pages. Watch the run with `gh run watch <id> --exit-status`. There is no server step.

## 3. Post-publish checks

```sh
git fetch origin
EXPECT_BUILD=$(git rev-parse origin/main | cut -c1-7) npm run pages:check
npm run test:e2e:pages
npm run lighthouse
```

Then check that the Gatus `Carakan` row is green. Pages caches every file for ten minutes (`max-age=600`): if `pages:check` still reports the previous build right after the run, wait ten minutes and run it again.

## 4. Roll back

Revert the offending commit in a pull request and squash-merge it. The revert deploys like any release and reaches installed clients as an update. There is nothing to do on a server.

## 5. One-off Pages setup

Already done on 2026-11-27: `fiatcode.dev` is verified for the account, Pages builds from GitHub Actions with the custom domain set, the DNS CNAME is in place and HTTPS is enforced. The steps are for a rebuild.

1. Verify `fiatcode.dev` in the `fiatcode-gh` account's Pages settings (GitHub, Settings, Pages, Add a domain), so no other account can claim its subdomains.
2. Enable Pages with GitHub Actions as the source: `gh api -X POST repos/fiatcode-gh/carakan/pages -f build_type=workflow`.
3. Set the custom domain: `gh api -X PUT repos/fiatcode-gh/carakan/pages -f cname=carakan.fiatcode.dev`. It lives in the Pages settings; the repository has no `CNAME` file.
4. DNS: `carakan` `CNAME fiatcode-gh.github.io.`
5. Once `gh api repos/fiatcode-gh/carakan/pages --jq .https_certificate.state` reads `approved`, enforce HTTPS: `gh api -X PUT repos/fiatcode-gh/carakan/pages -F https_enforced=true`. GitHub may not request the certificate on its own after DNS moves: if it is still missing an hour after DNS points at Pages, clear and re-set the custom domain in the Pages settings.
