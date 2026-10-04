# Rule authority and sources

Ruleset id: `kaj1-2021-simplified-v3`

## Primary authority

Kongres Aksara Jawa I Yogyakarta, 22–26 March 2021, convened by Dinas Kebudayaan
(Kundha Kabudayan) DIY, initiated by Karaton Ngayogyakarta Hadiningrat.

- Komisi II — Tata Tulis Aksara Jawa (Simplified dan Tradisional). This project
  implements the SIMPLIFIED style: the documented successor of Wewaton Sriwedari 1926
  and the 1996 three-governor Pedoman, in carakan order (ha na ca ra ka).
  Archived: `kaj1-tata-tulis.pdf` (sha256 above in the plan).
- Komisi I — JGST, Javanese General System of Transliteration (aksara→Latin,
  diacritic system based on IAST/OJED/Unicode). Used as the CANONICAL Latin scheme.
  Published as: Dinas Kebudayaan DIY, "Sistem Transliterasi Aksara Jawa Latin —
  Javanese General System of Transliteration (JGST)", Yogyakarta.

## User-facing Latin

PUJL — Pelatinan Umum Jawa Latin, based on Balai Bahasa Yogyakarta,
"Pedoman Penulisan Bahasa Jawa Huruf Latin" (the school spelling).

## Ancestors and related standards

- Wewaton Sriwedari 1926 (Surakarta) — first codified orthography; ancestor of the
  Simplified style. Public domain.
- Pedoman Penulisan Aksara Jawa, Yayasan Pustaka Nusatama 2002 — endorsed by the
  governments of DIY, Jawa Tengah, Jawa Timur (the school standard this project's
  audience learns).
- Unicode Technical Note 47, "Implementing Javanese" — encoding order, pasangan
  mechanics, cecak telu usage. https://www.unicode.org/notes/tn47/
- The Unicode Standard, Javanese block U+A980–U+A9DF. Character names archived in
  `unicode-javanese-block.txt`.

## Known limitations

- KAJ I is DIY-led; Surakarta practice may differ in fine points. The ruleset is
  versioned so corrections ship as `v2`, never as silent edits.
- KAJ I defers open issues to a future Kongres Aksara Jawa II; if it convenes and
  changes rules, re-review this ruleset.
- Murda: never mandatory (KAJ I Bab I A.2.f). The engine applies murda only on
  explicit opt-in.

## v2 changes (2026-08-13) — ruleset kaj1-2021-simplified-v2

Behavior changes, each documented above where the rule is decided:

- Murda canonical literals: TA MURDA's JGST literal is `ṭha` (decision:
  the KAJ Daftar assigns `tha` to both TTA's PUJL and TA MURDA's JGST;
  the scheme-agnostic tokenizer resolves `tha` to TTA, so the dotted
  form is the lossless canonical. Note: `ṭha` is also the JGST of
  TTA MAHAPRANA (A99C), which this engine does not model; revisit if it
  ever does). The other ten murda round-trip via their dotted literals
  (`ṇa ḳa śa p̣a jña g̣a ḅa c̣a j̣a ṟa`).
- Word-initial pepet reads back as ꦄ + pepet → `ě`/`e` (KAJ I Swara
  Mandiri: ꦄꦼ is the mandiri e; the school ꦲꦼ convention is not used).
  (superseded in v3: word-initial pepet takes the ha carrier.)
- Rekan fa/va = PA/WA + cecak telu (KAJ I Bab I A.4; UTN47); the murda
  cascade skips rekan tokens.
- Post-base diphthongs: ai = base + dirga mure (U+A9BB), au = base +
  dirga mure + tarung (WG2 n3319; KAJ santai). The KAJ taulan example
  stores dirga mure pre-base — a deviation, not adopted.
- Hiatus (KAJ I "Kata Asing"): u/o + vowel → w glide; i/é + vowel → y
  glide; a+a (a ganda) → mid-word swara ꦄ; a+é → mid-word swara ꦌ.
  The glide is lossy — corpus canonicals keep the explicit glide
  (buwaya, tuwa) with a displayPujl override. ai/au always take the
  diphthong reading; the separate-syllable reading (syair, bait) is
  unreachable. Pepet + vowel (eu class) stays an explicit error.
- (superseded in v3) toLatin reads a mid-word pangkon + pre-base taling as a pasangan link
  (no slash); the lenient "taling tarung after a base = o" heuristic was
  removed (invalid per UTN47 section 6).
- The corpus round-trip gate, the golden pairs, and the KAJ text above
  are the contract; the engine still never guesses.

## v3 changes (2026-09-29) — ruleset kaj1-2021-simplified-v3

- Taling storage order. v1/v2 wrote taling before its base (`saté` = SA TALING
  TA), citing UTN47 section 6.2. That was wrong: Unicode chapter 17 stores every
  vowel sign, taling included, after its base, and the shaper draws it before.
  HarfBuzz (the shaper Flutter uses) renders v2 `saté` as "séta" and v2 `toko`
  with a dotted circle, with both Jejeg and Noto. v3 emits base, then medials or
  panjing, then the vowel: `saté` = SA TA TALING, `toko` = TA TALING TARUNG KA
  TALING TARUNG. `toLatin` reads Unicode order only; old-order text reads as
  written (SA TALING TA is "séta"). This supersedes the v2 "UTN47 §6.2" claims.
  Guard: `tools/shaping` (HarfBuzz check, see docs/content/corpus-guide.md).
- Joined writing (KAJ I p.24, p.126). Words are written without spaces, so a
  word-final pangkon links to the next word as pasangan (`bapak lunga`; the
  three-stacks of p.126 8.e fall out of plain concatenation). A comma after a
  pangkon-final word is that pangkon (p.24): the engine writes pangkon +
  U+200C ZWNJ, because HarfBuzz and Pango with Jejeg otherwise link the pangkon
  to the next consonant; a trailing ZWNJ at the end of output is stripped. A
  comma after any other word is pada lingsa. A full stop after a pangkon-final
  word is pada lingsa (`bapak.`), otherwise pada lungsi. End of input without
  punctuation is unchanged (`bapak` = bare pangkon). A JGST `/` at the end of a
  word that a further word follows is the visible pangkon (`bapak/ hibu` =
  `bapak, ibu`); without the slash the words link. `toLatin` skips ZWNJ, so
  joined text reads back without spaces.
- Pasangan la (KAJ I p.7 Catatan b): la + ě right after a pangkon coda in the
  same word is LA + PEPET (`jaklěk`); word-initial la + ě stays NGA LELET, so
  across words it becomes pasangan nga lelet. ya/wa (p.127 8.h) need no rule:
  pangkon word-final, pasangan otherwise.
- Known limitations: KAJ 8.d (ka + pasangan sa across words uses a glyph variant
  with no Unicode encoding in Jejeg) is not encoded; the ordinary pasangan is
  written.
- Q5 fixed (M2, acceptance round). A JGST `/` directly after a consonant coda
  and directly before a letter (`bapak/hibu`, `sěk/lěk`) is the visible-pangkon
  break of the previous bullet, exactly like `bapak/ hibu`: the word ends with
  a visible pangkon, ZWNJ follows, and the next word continues. Before, the
  first `/` silently dropped the rest of the input. A `/` anywhere else (word
  start, after a vowel, doubled) is now a ConvertError instead of a silent
  drop. This makes `toAksara(toLatin(toAksara(x), jgst))` equal `toAksara(x)`
  for the engine goldens and every corpus canonical (also as comma pairs).
  Known limitations of the read-back: `toLatin` still writes `/` before a
  pasangan swara (`ngajak Abdul` reads back `ṅajak/abdul/`; KAJ p.6 has no
  slash there), so that round trip is lossless but not identical (the swara
  letter comes back as the ha carrier after a visible pangkon). Pada lingsa
  reads back as `,`, and nga lelet (`ḷ`) is not accepted as input.
- Ha carrier (KAJ I p.5 3.b, p.12, p.124 8.b). A word-initial vowel (a i u o é
  ě, long vowels, ai/au) is written on the ha carrier: `ibu` = HA WULU BA SUKU,
  `ěmpu` = HA PEPET MA PANGKON PA SUKU (ha samar). The carrier is added after
  the murda cascade. Long vowels and diphthongs take the ordinary
  post-consonant rendering on HA (`ai` = HA DIRGA MURE, `aa` = HA + LETTER A
  as the existing a-ganda; KAJ 8.i panglancar ha is not special-cased).
  Mid-word a + vowel swara (`maaf`) is unchanged.
- Swara names. A capitalized vowel-initial word that is not sentence-initial
  (not the first word of the input, not the first word after a full stop) keeps
  the swara letter (`ngajak Abdul` = ... A BA PANGKON ..., `pak Airlangga`,
  `Paku Alam`, p.5-p.7). Sentence-initial capitals take the carrier.
- Corpus convention. Vowel-initial canonicals are written without h (`iki`,
  `ibu`); the engine adds the carrier and its JGST back-form is `h` +
  canonical (`hasěm/` = PUJL `asem`, p.12). The round-trip gate expects exactly
  that. Word ids never change (SRS and audio keys).
- Known limitations (not adopted). KAJ 8.c/8.j/8.k homorganic "kombinasi
  sewarga" (mangkat = nga + pasangan ka; kanji = nya) is not implemented: it
  contradicts the Bab I cecak examples (`paŋkuṙ`, p.24) and would rewrite
  native spellings; deferred, to be asked of the teacher. Lowercase loanwords
  that KAJ writes with swara (impor, èlèktrik, oranye, aurat) now take the
  carrier, and swara-initial JGST (`ěmas/` meaning ꦄꦼ) no longer round-trips.
  KAJ 8.i panglancar ha versus a-ganda and diphthongs is unchanged.
- School spelling and chart examples (app layer, not an engine rule). User-facing
  Latin is derived from the aksara (`toLatin`, PUJL columns) with a
  `displayPujl` override only where derivation cannot know (murda, glides, è,
  teacher corrections). Chart examples are curated data
  (`chart_examples.json`), shown as aksara plus school spelling, never with a
  gloss, and without pasangan. Sandhangan previews (ladder, chart, lessons)
  draw the sign on a HA carrier so a combining mark never shows a dotted
  circle.
