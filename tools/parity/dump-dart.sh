#!/bin/sh
# Dumps the Dart engine's results (aksara-app @ ebc7cb5) over the fixed parity
# input set into tests/engine/fixtures/dart-ebc7cb5.json. Nothing is written
# outside .cache/ and the fixture path.
set -eu

REV=ebc7cb524ca7ddea8a3adca8b21939cd3da09bca

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

rm -rf .cache/parity
sh tools/parity/extract-source.sh

cd tools/parity/dart
dart pub get --offline
dart run bin/dump.dart "$REV" ../../../tests/engine/fixtures/dart-ebc7cb5.json
