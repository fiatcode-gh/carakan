#!/bin/sh
# Builds the production image from the working tree and runs it behind Traefik
# with the production router rendered for http://localhost:8090/.
set -eu

build_id="${CARAKAN_BUILD_ID:-$(git rev-parse --short HEAD)}"
if [ -n "$(git status --porcelain)" ]; then
  build_id="${build_id}-dirty"
fi

podman build --build-arg CARAKAN_BUILD_ID="$build_id" -t localhost/carakan:served .

node tools/served/render-local.ts
podman network create --ignore carakan-served

podman run -d --replace --name carakan-served-app \
  --network carakan-served --network-alias carakan \
  --sysctl net.ipv4.ip_unprivileged_port_start=80 \
  --security-opt label=disable \
  localhost/carakan:served

podman run -d --replace --name carakan-served-traefik \
  --network carakan-served \
  --security-opt label=disable \
  -p 127.0.0.1:8090:8090 \
  -v "$PWD/tools/served/traefik.yml:/config/traefik.yml:ro" \
  -v "$PWD/.cache/served/dynamic:/config/dynamic:ro" \
  docker.io/library/traefik:v3.7 --configFile=/config/traefik.yml

i=0
while [ "$i" -lt 30 ]; do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8090/ || true)" = "200" ]; then
    echo "carakan served at http://localhost:8090/ (build id: $build_id)"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "timed out waiting for http://localhost:8090/" >&2
podman logs carakan-served-app >&2 || true
podman logs carakan-served-traefik >&2 || true
exit 1
