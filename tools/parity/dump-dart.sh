#!/bin/sh
# Dumps the Dart engine's results (aksara-app @ ebc7cb5) over the fixed parity
# input set into tests/engine/fixtures/dart-ebc7cb5.json. The source repo is
# read only through `git archive` at the full SHA; nothing is written outside
# .cache/ and the fixture path.
set -eu

SRC=${AKSARA_APP_REPO:-$HOME/Development/Projects/_temp/aksara-app}
REV=ebc7cb524ca7ddea8a3adca8b21939cd3da09bca

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

git -C "$SRC" rev-parse --verify "$REV^{commit}" >/dev/null

rm -rf .cache/parity
mkdir -p .cache/parity/src
git -C "$SRC" archive "$REV" packages/aksara_engine app/assets/content/v1/words.json app/tool/shaping |
  tar -x -C .cache/parity/src

cd tools/parity/dart
dart pub get --offline
dart run bin/dump.dart "$REV" ../../../tests/engine/fixtures/dart-ebc7cb5.json
