"""Fails if any code point of the glyph set is missing from a font's cmap.

Usage: check_coverage.py <glyphset.txt> <font>...
"""

import sys
import unicodedata

from fontTools.ttLib import TTFont


def read_glyphset(path):
    with open(path, encoding="utf-8") as f:
        return [
            int(line.strip()[2:], 16)
            for line in f
            if line.strip() and not line.startswith("#")
        ]


def main():
    glyphset = read_glyphset(sys.argv[1])
    fonts = sys.argv[2:]
    missing = False
    for path in fonts:
        cmap = TTFont(path).getBestCmap()
        for cp in glyphset:
            if cp not in cmap:
                name = unicodedata.name(chr(cp), "<unnamed>")
                print(f"MISSING U+{cp:04X} {name} in {path}")
                missing = True
    if missing:
        sys.exit(1)
    print(f"coverage ok: {len(glyphset)} code points × {len(fonts)} fonts")


main()
