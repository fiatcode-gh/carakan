"""HarfBuzz shaping gate for engine output (teacher-feedback-r1, contract A2 last bullet).

Usage (from the repo root; `npm run shaping` does all of this):
  node tools/shaping/dump-cases.ts > /tmp/cases.tsv
  uv run --quiet --with uharfbuzz python tools/shaping/shape_check.py /tmp/cases.tsv \
      [--font public/fonts/nykNgayogyanJejeg-Regular.ttf]

<cases.tsv>: one case per line, "label<TAB>aksara[<TAB>expected-visual]".
Lines starting with '#' are reported (errors/ambiguities from the dump) but
not shaped.

Checks per case, any failure -> exit status 1:
  1. no dotted circle (U+25CC): the USE shaper inserts one for a mark with
     no base (e.g. a taling stored before its base at a cluster start);
  2. every TALING glyph is drawn immediately before the glyph of its
     logical owner, i.e. the first base of the orthographic cluster it
     follows in the text (pasangan chains included);
  3. optional expected-visual column: space-separated Unicode short names
     (LETTER/VOWEL SIGN names without the 'JAVANESE ' prefix words, '_'
     for spaces, e.g. "SA TALING TA") compared with the drawn sequence of
     letters (U+A984..U+A9B2, any glyph variant) and TALING. This is the
     intent check: SA TALING TA (old engine order) draws "TALING SA TA",
     which fails the saté expectation "SA TALING TA".
"""
import re
import sys
import unicodedata

import uharfbuzz as hb

TALING = 0xA9BA
PANGKON = 0xA9C0
CECAK_TELU = 0xA9B3
MEDIALS = {0xA9BD, 0xA9BE, 0xA9BF}  # keret, pengkal, cakra
PFX = ["JAVANESE LETTER ", "JAVANESE VOWEL SIGN ", "JAVANESE CONSONANT SIGN ",
       "JAVANESE SIGN ", "JAVANESE PADA ", "JAVANESE "]


def is_letter(cp):
    return 0xA984 <= cp <= 0xA9B2


def lookup(short):
    hits = []
    for p in PFX:
        try:
            hits.append(ord(unicodedata.lookup(p + short.replace("_", " "))))
        except KeyError:
            pass
    if len(hits) != 1:
        raise SystemExit(f"bad expected-visual token {short!r}: {hits}")
    return hits[0]


def owners(text):
    """Logical owner (first cluster base) of each TALING, in text order."""
    cps = [ord(c) for c in text]
    result = []
    for t, cp in enumerate(cps):
        if cp != TALING:
            continue
        j = t - 1
        while j >= 0 and (cps[j] in MEDIALS or cps[j] == CECAK_TELU):
            j -= 1
        if j < 0 or not is_letter(cps[j]):
            result.append(None)  # no base: check 1 reports it
            continue
        # walk back through a pasangan chain: letter <- PANGKON <- letter
        while j >= 2 and cps[j - 1] == PANGKON:
            k = j - 2
            while k >= 0 and (cps[k] in MEDIALS or cps[k] == CECAK_TELU):
                k -= 1
            if k >= 0 and is_letter(cps[k]):
                j = k
            else:
                break
        result.append(cps[j])
    return result


args = sys.argv[1:]
font_path = "public/fonts/nykNgayogyanJejeg-Regular.ttf"
if "--font" in args:
    i = args.index("--font")
    font_path = args[i + 1]
    del args[i : i + 2]
if len(args) != 1:
    sys.exit(__doc__)

font = hb.Font(hb.Face(hb.Blob.from_file_path(font_path)))
uni = re.compile(r"^uni([0-9A-F]{4})")
bad = 0
for line in open(args[0], encoding="utf-8"):
    line = line.rstrip("\n")
    if not line:
        continue
    if line.startswith("#"):
        print(f"SKIP\t{line}")
        continue
    parts = line.split("\t")
    label, text = parts[0], parts[1]
    expect = parts[2] if len(parts) > 2 and parts[2] else None
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {})
    names = [font.glyph_to_string(g.codepoint) for g in buf.glyph_infos]
    cps = []
    for n in names:
        m = uni.match(n)
        cps.append(int(m.group(1), 16) if m else None)
    problems = []
    if 0x25CC in cps:
        problems.append("dotted-circle")
    want = owners(text)
    got = [cps[i + 1] if i + 1 < len(cps) else None
           for i, cp in enumerate(cps) if cp == TALING]
    if len(want) == len(got):
        for w, g in zip(want, got):
            if w is not None and g != w:
                problems.append(
                    f"taling-before-{g and hex(g)}-not-owner-{hex(w)}")
    else:
        problems.append(f"taling-count {len(want)}!={len(got)}")
    if expect:
        exp = [lookup(t) for t in expect.split()]
        drawn = [cp for cp in cps if cp is not None and (is_letter(cp) or cp == TALING)]
        if drawn != exp:
            problems.append("visual " + " ".join(hex(c) for c in drawn)
                            + " != expected " + expect)
    status = "FAIL:" + ",".join(problems) if problems else "ok"
    if problems:
        bad += 1
    print(f"{status}\t{label}\tvisible_pangkon={names.count('uniA9C0')}\t{' '.join(names)}")
print(f"# {bad} failing case(s)", file=sys.stderr)
sys.exit(1 if bad else 0)
