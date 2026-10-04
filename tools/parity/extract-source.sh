#!/bin/sh
# Extracts the Dart sources the parity and shaping tools need from
# aksara-app @ ebc7cb5 into .cache/parity/src. The source repo is read only
# through `git archive` at the full SHA. Run from the repo root.
set -eu

SRC=${AKSARA_APP_REPO:-$HOME/Development/Projects/_temp/aksara-app}
REV=ebc7cb524ca7ddea8a3adca8b21939cd3da09bca

git -C "$SRC" rev-parse --verify "$REV^{commit}" >/dev/null

rm -rf .cache/parity/src
mkdir -p .cache/parity/src
git -C "$SRC" archive "$REV" packages/aksara_engine app/assets/content/v1/words.json app/tool/shaping |
  tar -x -C .cache/parity/src
