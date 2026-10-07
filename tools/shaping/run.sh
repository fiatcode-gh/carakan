#!/bin/sh
# Shaping gate: the TS engine's case dump must be byte-identical to the Dart
# dumper at ebc7cb5, every case must shape cleanly in HarfBuzz against the
# exact Jejeg TTF the app serves, and no HarfBuzz glyph cluster may straddle
# an engine cluster boundary (the tap-to-explain segmentation).
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

[ -d .cache/parity/src/app/tool/shaping ] || sh tools/parity/extract-source.sh
mkdir -p .cache/shaping

(cd tools/parity/dart && dart pub get --offline)
(cd .cache/parity/src/app && dart run --packages=../../../../tools/parity/dart/.dart_tool/package_config.json ../../../../tools/parity/dart/bin/shaping_cases.dart) > .cache/shaping/dart.tsv

node tools/shaping/dump-cases.ts > .cache/shaping/ts.tsv

cmp .cache/shaping/dart.tsv .cache/shaping/ts.tsv

uv run --quiet --with uharfbuzz python tools/shaping/shape_check.py .cache/shaping/ts.tsv

node tools/shaping/dump-cases.ts --clusters > .cache/shaping/ts-clusters.tsv
uv run --quiet --with uharfbuzz python tools/shaping/shape_check.py --clusters .cache/shaping/ts-clusters.tsv
