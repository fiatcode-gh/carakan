#!/bin/sh
# Derives the UI glyph set, subsets MPLUS Rounded 1c to WOFF2 and proves
# every glyph-set code point is covered. Run from the repository root.
set -eu

FONTTOOLS=4.66.1

node tools/fonts/glyphset.ts

for pair in Regular:400 Bold:700; do
  weight=${pair%%:*}
  name=${pair##*:}
  uvx --from "fonttools[woff]==$FONTTOOLS" pyftsubset \
    "fonts/source/MPLUSRounded1c-$weight.ttf" \
    --unicodes-file=fonts/glyphset.txt \
    --layout-features='*' \
    --name-IDs='*' \
    --name-legacy \
    --name-languages='*' \
    --notdef-outline \
    --flavor=woff2 \
    --output-file="public/fonts/mplus-rounded-1c-$name.woff2"
done

uv run --quiet --with "fonttools[woff]==$FONTTOOLS" python tools/fonts/check_coverage.py \
  fonts/glyphset.txt \
  fonts/source/MPLUSRounded1c-Regular.ttf \
  fonts/source/MPLUSRounded1c-Bold.ttf \
  public/fonts/mplus-rounded-1c-400.woff2 \
  public/fonts/mplus-rounded-1c-700.woff2
