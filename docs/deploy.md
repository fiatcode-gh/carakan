# Deploying Carakan

How a release reaches `https://carakan.fiatcode.dev/`. Every production step below needs the maintainer's explicit approval at the time it happens; nothing here runs unattended. Hosting design: `docs/spec.md` section 9. Server-side reference: `BRINGUP.md`, `### carakan`, in `fiatcode-infra`.

## 1. Gate the tree

Run the full gate on the tree you intend to ship (`docs/spec.md` section 10): `npm ci`, `check`, `test`, `build`, `test:e2e`, `parity:coverage`, `format:check`, `shaping`, `fonts` and `parity:dump` each with a clean diff, then `served:up`, `served:headers`, `test:e2e:served`, `served:measure`, `lighthouse`, `served:down`. The `served:*` steps run the production image behind a Traefik configured like production, so header or caching regressions surface before publication.

## 2. Publish the image

A push to `main` runs `.github/workflows/build.yml` (`build-image`), which builds the image with `CARAKAN_BUILD_ID` set to the short commit SHA and pushes `ghcr.io/fiatcode-gh/carakan:latest` and `ghcr.io/fiatcode-gh/carakan:<short-sha>`. Pull requests build only and never push.

Integrate into `main` by fast-forward or merge commit. Do not squash or rebase: `docs/decisions/0001-ui-rework.md` names a prototype commit that must stay reachable.

Wait for the run (`gh run watch <id> --exit-status`), then check that the server can pull the image anonymously (it holds no registry credentials):

```sh
tok=$(curl -s "https://ghcr.io/token?scope=repository:fiatcode-gh/carakan:pull" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $tok" \
  -H 'Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json' \
  https://ghcr.io/v2/fiatcode-gh/carakan/manifests/latest
```

Expect `200`; repeat with the `<short-sha>` tag. A denied token or a non-200 means the package is private: set it to Public (GitHub, Packages, carakan, Package settings, Change visibility) and recheck.

## 3. Roll out on the server

The server login shell is fish, so drive POSIX commands through `sh -s`:

```sh
ssh netcup-personal sh -s <<'EOF'
set -eu
podman pull ghcr.io/fiatcode-gh/carakan:latest
systemctl --user restart carakan
systemctl --user is-active carakan
EOF
```

Expect `active`. The unit, the Traefik router and the Gatus row come from `fiatcode-infra`; only the image changes per release. First-time setup of those files is a one-off infra change, not part of a release.

## 4. Post-publish checks

```sh
curl -sI https://carakan.fiatcode.dev/      # 200, cache-control: no-cache
curl -sI https://carakan.fiatcode.dev/sw.js # 200, cache-control: no-cache
```

Confirm `meta[name=carakan-build]` in the served HTML shows the new short SHA, and that the Gatus `Carakan` row is green. Returning clients pick the update up through the service worker; `sw.js` must never be cached, which is why it is checked here.

## 5. Roll back

To serve a previous build, retag it on the server and restart:

```sh
ssh netcup-personal sh -s <<'EOF'
set -eu
podman pull ghcr.io/fiatcode-gh/carakan:<prev-sha>
podman tag ghcr.io/fiatcode-gh/carakan:<prev-sha> ghcr.io/fiatcode-gh/carakan:latest
systemctl --user restart carakan
EOF
```

This is durable only until the next `podman pull` of `:latest`. To make it permanent, revert the offending commit on `main` and push (with approval); CI then republishes `:latest` from the reverted tree.
