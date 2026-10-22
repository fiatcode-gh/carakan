# Rule authority and sources

Ruleset ids: `pedoman-2002-v1` (default), `kaj1-2021-simplified-v3`

## Primary authority

Kongres Aksara Jawa I Yogyakarta, 22–26 March 2021, convened by Dinas Kebudayaan
(Kundha Kabudayan) DIY, initiated by Karaton Ngayogyakarta Hadiningrat.

- Komisi II — Tata Tulis Aksara Jawa (Simplified dan Tradisional). This project
  implements the SIMPLIFIED style: the documented successor of Wewaton Sriwedari 1926
  and the 1996 three-governor Pedoman, in carakan order (ha na ca ra ka).
  Archived: `kaj1-tata-tulis.pdf` (sha256 above in the plan).
  The app carries two rulesets and the user picks one in Settings: Pedoman 2002
  (default) or this KAJ I Simplified style.
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
  audience learns). Implemented as ruleset `pedoman-2002-v1`; see the section
  "Pedoman 2002" at the end of this file.
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
- Joined writing (KAJ I p.24; Tradisional p.126 8.e). Words are written without
  spaces, so a word-final pangkon links to the next word as pasangan
  (`bapak lunga`; the three-stacks of Tradisional p.126 8.e fall out of plain
  concatenation; the Pedoman forbids them, see below). A comma after a
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
  across words it becomes pasangan nga lelet. ya/wa (Tradisional p.127 8.h) need no rule:
  pangkon word-final, pasangan otherwise.
- Known limitations: Tradisional 8.d (ka + pasangan sa across words uses a glyph variant
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
- Ha carrier (KAJ I p.5 3.b, p.12; Tradisional p.124 8.b). A word-initial vowel (a i u o é
  ě, long vowels, ai/au) is written on the ha carrier: `ibu` = HA WULU BA SUKU,
  `ěmpu` = HA PEPET MA PANGKON PA SUKU (ha samar). The carrier is added after
  the murda cascade. Long vowels and diphthongs take the ordinary
  post-consonant rendering on HA (`ai` = HA DIRGA MURE, `aa` = HA + LETTER A
  as the existing a-ganda; Tradisional 8.i panglancar ha is not special-cased).
  Mid-word a + vowel swara (`maaf`) is unchanged.
- Swara names. A capitalized vowel-initial word that is not sentence-initial
  (not the first word of the input, not the first word after a full stop) keeps
  the swara letter (`ngajak Abdul` = ... A BA PANGKON ..., `pak Airlangga`,
  `Paku Alam`, p.5-p.7). Sentence-initial capitals take the carrier.
- Corpus convention. Vowel-initial canonicals are written without h (`iki`,
  `ibu`); the engine adds the carrier and its JGST back-form is `h` +
  canonical (`hasěm/` = PUJL `asem`, p.12). The round-trip gate expects exactly
  that. Word ids never change (SRS and audio keys).
- Known limitations (not adopted). Tradisional 8.c/8.j/8.k homorganic "kombinasi
  sewarga" (mangkat = nga + pasangan ka; kanji = nya) is not implemented: it
  contradicts the Bab I cecak examples (`paŋkuṙ`, p.24) and would rewrite
  native spellings; deferred, to be asked of the teacher. Lowercase loanwords
  that KAJ writes with swara (impor, èlèktrik, oranye, aurat) now take the
  carrier, and swara-initial JGST (`ěmas/` meaning ꦄꦼ) no longer round-trips.
  Tradisional 8.i panglancar ha versus a-ganda and diphthongs is unchanged.
- School spelling and chart examples (app layer, not an engine rule). User-facing
  Latin is derived from the aksara (`toLatin`, PUJL columns) with a
  `displayPujl` override only where derivation cannot know (murda, glides, è,
  teacher corrections). Chart examples are curated data
  (`chart_examples.json`), shown as aksara plus school spelling, never with a
  gloss, and without pasangan. Sandhangan previews (ladder, chart, lessons)
  draw the sign on a HA carrier so a combining mark never shows a dotted
  circle.

### Citation correction (2026-10-22)

The v3 section above first cited KAJ item 8 as part of the Simplified style.
That was wrong. The Simplified part of the KAJ I Tata Tulis is pp.1-63 and its
Bab II ends at item 7 on p.63. Item 8, "Keterangan tambahan" (pp.123-128), is
the Tradisional part. v3 used it as a supplement, so every item-8 cite above
now reads "Tradisional p.N 8.x" (8.b ha, 8.c/8.j/8.k, 8.d, 8.e, 8.h, 8.i).

- The ha carrier itself rests on the Simplified p.5 3.b and p.12. Tradisional
  p.124 8.b only adds when the carrier's ha is pronounced.
- Three-tier stacks (Tradisional p.126 8.e) are KAJ-only. The Pedoman forbids
  them (Ped p.27-28), and the Pedoman ruleset keeps a visible pangkon.
- KAJ v3 behaviour is unchanged by this correction. Only the cites changed.

## Pedoman 2002 — ruleset pedoman-2002-v1 (2026-10-22)

The app carries two rulesets. The user picks one in Settings. Pedoman 2002 is the
default (a device with no saved choice, or an unknown one, uses it). KAJ I v3
stays available and unchanged. The Pedoman ruleset is KAJ I v3 plus the
differences below. Page cites are the printed page numbers ("Ped p.N").

### Source and edition

- *Pedoman Penulisan Aksara Jawa*, Yayasan Pustaka Nusatama with the
  governments of DIY, Jawa Tengah and Jawa Timur. Cover 2002. (c) 1995,
  Cetakan Kedua (edisi revisi) 1996, Cetakan Ketiga November 2003. ISBN
  979-8628-00-4. Darusuprapta (Pengarah), Harjana Hardjawijana (Ketua).
- It is the written form of the 1996 three-governor agreement (sarasehan
  17-18 May 1996, Yogyakarta).
- Scan consulted: https://media.sabda.org/kios/DVD_Alkitab-Aksara-Jawa/09_BONUS/pdf_teks_lain/buku_Pedoman-Penulisan-Aksara-Jawa.pdf
  and the byte-identical archive.org item `pedoman-penulisan-aksara-jawa-2002`.
  sha256 `c48e70f79694029c3d2104a01e74262a2f46271ffd5a1350e5d675d4a9baa680`.
  The scan has one quirk: printed p.27 appears twice.
- The Pedoman defines no transliteration scheme. JGST (stored Latin) and PUJL
  (shown Latin) do not change.

### Licensing

The book reserves all rights ("Hak Cipta Dilindungi"). The archive.org
CC BY-NC-ND label was set by the uploader, not by the publisher. The PDF is not
in this repository. This file cites pages and paraphrases rules only. Shipping
book examples in the app needs the publisher's or the teacher's permission.

### Rules that differ from KAJ I v3

1. Murda inventory is 7: na, ka, ta, sa, pa, ga, ba (Ped p.11 no.1, table
   p.12-13). nya, ca, ja and ra agung are not part of the ruleset: not taught,
   not in the chart, and typing them is the error "This murda is not part of
   Pedoman 2002".
2. Murda only on the first aksara of a name word, never as a closing letter
   (Ped p.11-13, examples `Nabi Nuh`, `Kabupaten Kudus`, `Raden Gandamana`). A
   murda after the first aksara of a word is the error "Murda is written only on
   the first aksara of a word". With the opt-in `useMurda`, only a capitalized
   word's first consonant takes murda, and only if the Pedoman has it.
3. No long-vowel or diphthong signs: no dirga mure, no long swara forms. `ii`,
   `uu`, `ī`, `ū` and a vowel-only long A (`Aan`) are the error "Long vowels
   have no sign in Pedoman 2002". The Pedoman has no sign for them and the
   engine never guesses. A ganda after a consonant (`maaf`) and `ā` after a
   consonant (`pāku`, written as a ganda) are unchanged (see the silent
   points).
4. `ai` and `au` are two aksara, so they are ambiguous (Ped p.33 `baé` with ha
   between the vowels; Ped p.59 no.2-3 `trailer`, `aula` with a swara letter).
   The converter never picks. Candidate 1 is the ha reading (`sinahu`),
   candidate 2 is the swara reading. With a bare `e` in the same input the
   candidates are e-major (pepet first, then taling) times reading-minor, at
   most four. Typing the `h` (`sinahu`) is unambiguous. Corpus words with
   `ai`/`au` store an explicit form: `ramai` is stored `ramahi` and shown
   `ramai`. The ha form is a provisional choice, pending the teacher.
5. A swara letter is never a pasangan (Ped p.13 no.3, examples p.14). A
   pangkon-final word before a word that starts with a swara letter keeps a
   visible pangkon: the engine writes a ZWNJ after the pangkon (`ngajak Abdul`).
   A lowercase vowel-initial word still takes the ha carrier, so the pasangan
   ha stays (`bapak ibu`, Ped p.10 Catatan 1).
6. No three-tier stacks (Ped p.27-28 no.4.c, `adol klasa`, `benik klambi`,
   `ngedhuk blumbang`, `rimbag dwipurwa`, `golek klungsu`). A pangkon-final word
   before a word whose first syllable is a cluster (cakra, keret, pengkal,
   panjingan la or wa) keeps a visible pangkon: ZWNJ after the pangkon. A single
   consonant onset still links as pasangan (`bapak lunga`). A ZWNJ is never
   written twice (a comma that already wrote it adds none).
7. A full stop is always pada lungsi (Ped p.50), including after a
   pangkon-final word (`bapak.`). The Pedoman has no "pangkon plus pada lingsa
   is a full stop" rule. A comma after a pangkon-final word is still the
   pangkon itself (Ped p.27 no.4.b).
8. fa and va are one rekan letter (Ped p.16): `v` writes PA + cecak telu, the
   same as `f`. Reading it back gives `f` (`vila` reads back `fila`). This
   loss is the documented round-trip exception for `vila` and `vakum`.
9. Rekan inventory in the chart is 5: kha, dza, fa/va, za, gha (Ped p.16-17).
   They are chart-only except fa/va: converter input for kh, dz, z, gh stays
   unsupported in both rulesets.
10. Swara inventory is 5: a, é, i, o, u (Ped p.13 no.1). Pa cerek and nga lelet
    stay in the chart and the ladder as the spellings of `re` and `le`
    (Ped p.20 no.2.b). The Pedoman glyph set is 47 ids (no nya/ca/ja murda, ra
    agung, va, le, ai, au, reu, leu); the universe of 57 ids is unchanged.

### Pedoman silent: KAJ I behaviour kept

Where the Pedoman says nothing, the engine keeps what v3 does. Each point is
listed on the teacher review sheet.

- Pedoman silent: KAJ I behaviour kept — a ganda swara A (`maaf`, `taat`,
  `saat`): mid-word swara A after a consonant.
- Pedoman silent: KAJ I behaviour kept — `ā` after a consonant (`pāku`) is
  written as a ganda (pa, swara A, ka with suku). The Pedoman has no long-vowel
  sign and does not mention it.
- Pedoman silent: KAJ I behaviour kept — `oa`, `ia` and the other KAJ hiatus
  glides (y after i/é, w after u/o).
- Pedoman silent: KAJ I behaviour kept — the ha carrier on lowercase
  vowel-initial words, loans included. Ped p.13-15 shows swara for loans
  (`iklan`, `akil balig`, `organ`) but the engine cannot tell a loan.
- Pedoman silent: KAJ I behaviour kept — the closing-letter list. Ped p.10
  Catatan 2 says more letters cannot close a syllable than KAJ lists; the engine
  keeps KAJ's three sigeg letters (ha, ra, nga) and accepts the others.
- Pedoman silent: KAJ I behaviour kept — the nasal-prefix ha and ny/n before
  c/j. Ped p.35 and p.39-40 allow both spellings (`ngisi`/`angisi`,
  `kanca`/`kanyca`); the input decides.
- Pedoman silent: KAJ I behaviour kept — pasangan la + pepet (KAJ p.7 Catatan
  b).
- Pedoman silent: KAJ I behaviour kept — the Tradisional 8.i panglancar ha is
  not a rule: `sinau` gives candidates (rule 4), it is not written by a rule.
- Pedoman silent: KAJ I behaviour kept — word-internal consonant clusters after
  a closing consonant. The three-tier rule (rule 6) applies across words only.
- Pedoman silent: KAJ I behaviour kept — aksara to Latin reading. The Pedoman
  defines no transliteration, so the reader accepts every Unicode form,
  including KAJ-only letters (ca murda, dirga mure and so on). The ruleset
  limits what the app writes and teaches, not what it can read.

### Image readings to confirm

Four readings rest on the page images (an old non-Unicode font), at medium
confidence. Each can be checked against the printed book in one look.

- Ped p.10 Catatan 2: the scope of "tidak dapat diberi pasangan atau menjadi
  sigegan" (the pasangan table on p.5-9 still gives all 20 letters a pasangan).
- Ped p.12 `Nabi Nuh`: the second letter of `Nabi` is plain BA, not murda BA.
- Ped p.27: the sentence-final sign is pada lungsi.
- Ped p.16: fa/va is PA + nukta (cecak telu). Kha, dza, za, gha are KA, DA, JA,
  GA with the nukta; KAJ p.8 agrees.

### Corpus effect

Of 230 words, 226 are the same under both rulesets. `nabi` is `ṇabi` under the
Pedoman (NA MURDA + BA). `ramai` is stored `ramahi` and shown `ramai`
(provisional). `vila` and `vakum` are PA + cecak telu and read back `fila` and
`fakum/`, the documented round-trip exception. The Pedoman ladder has its own
eighth unit `u8p` (7 murda, 5 swara, pa cerek, nga lelet: 14 glyphs); KAJ keeps
`u8` (18 glyphs).

### Versioning

Teacher answers to the review sheet ship as `pedoman-2002-v2`, never as silent
edits. The questions are in `docs/content/teacher-review-pedoman-2002.md`.
