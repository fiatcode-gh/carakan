#!/bin/sh
set -eu

podman rm -f --ignore carakan-served-traefik carakan-served-app
podman network rm --force carakan-served
