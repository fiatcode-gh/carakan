# Carakan · "Buku Poster" redesign spec

This is the reference for re-skinning the Carakan app. Carakan teaches Javanese script (aksara Jawa).
The main users are elementary students. Adults who want to learn are a second audience.

The style is called **Buku Poster**. It mixes two ideas:

- **Buku tulis (school exercise book):** ruled paper, a margin line, handwritten notes, tape strips and teacher stamps.
- **Poster:** bold grotesque headings, flat colour blocks, giant cropped aksara, 2px outlines and hard offset shadows.

The structure feels modern enough for adults. The notebook details make it friendly for children.

---

## 1. What is in this package

| Path | What it is |
|---|---|
| `DESIGN.md` | This spec. Read it first. |
| `tokens.json` | All colours, fonts, sizes, borders and shadows as data. |
| `screenshots/*.png` | Each screen at 390 × 844, rendered at 2× scale. This is the visual target. |
| `screens/*.html` | Standalone HTML of each screen. Open in a browser. Fonts load from `screens/fonts/`. Links between screens work. |
| `screens/fonts/` | Font files (WOFF2, web only) and their OFL-1.1 licences. |
| `source/*.dc.html` | Original design-canvas source. Kept for reference only. It needs the canvas runtime to render. |
| `screens.json` | Screen list: file names, titles and source mapping. |
| `index.html` | Gallery of all screenshots. |

**Priority when sources disagree:** screenshots, then `tokens.json`, then this document, then the HTML.

The HTML gives exact values (padding, sizes, colours). It is a mock-up, not production code.
Do not copy its absolute positioning. Rebuild the layouts with normal layout widgets.

---

## 2. Rules of the style

1. **Corners are square.** Radius is 0. The only round shapes are the stamps.
2. **Outlines are 2px ink (`#2F3456`)** on every card, tile, button and input.
3. **Shadows are hard offsets with no blur.** Hero cards use 5px 5px. Tiles and small buttons use 3px 3px. The shadow colour is ink.
4. **The background is ruled paper.** The paper is `#F7F3EA`. A 1px `#DAE3EC` line repeats every 36px. Only the Learn path shows the vertical margin line.
5. **Text on accent colours is always ink.** Never use white text on coral, periwinkle, butter or sage.
6. **Primary actions are solid ink bars** with `#F7F3EA` text. They are usually full width and docked at the bottom, 68px tall.
7. **Handwriting (Patrick Hand) is only for notes.** Use it for hints, encouragement and stamps. Never use it for buttons, navigation or answers.
8. **Every aksara uses Noto Sans Javanese.** Never draw aksara as images. They must stay real text.
9. **Giant cropped aksara are decoration.** They bleed off the edge of hero blocks and locked tiles. Mark them as decorative for screen readers.
10. **Colour means lesson group:**
    - Coral `#F08A6C` = Kelompok 1 (pa ha ya)
    - Periwinkle `#9DB0EF` = Kelompok 2 (ra ga la)
    - Butter `#F6CF63` = Kelompok 3 (na ka ca sa)
    - Sage `#8FC9A8` = correct answers and review
    
    Keep this mapping the same on every screen.

---

## 3. Colour tokens

| Token | Hex | Use |
|---|---|---|
| paper | `#F7F3EA` | App background |
| card | `#FFFDF8` | Tiles, inputs, answer buttons, tracing pad |
| rule | `#DAE3EC` | Ruled lines |
| margin | `#E39484` | Margin line, dashed tracing guides |
| ink | `#2F3456` | Text, borders, shadows, primary buttons |
| inkMuted | `#4A4F6E` | Secondary text, inactive nav |
| inkSubtle | `#5E6380` | Tertiary text on `card` |
| hand | `#8C5A3C` | Handwritten notes |
| stamp | `#9E4F3F` | Stamps with meaning (BENAR!) |
| stampDecor | `#C0604E` | Decorative stamps only |
| placeholder | `#A3ABCF` | Dashed empty slots, ghost outlines. Not for readable text. |
| coral / periwinkle / butter / sage | `#F08A6C` / `#9DB0EF` / `#F6CF63` / `#8FC9A8` | Accents, see rule 10 |
| neutral | `#ECE6D9` | Chart label strips for groups not yet defined |

**Measured contrast (WCAG 2.x):**

| Pair | Ratio | Result |
|---|---|---|
| ink on paper | 10.9:1 | Pass |
| ink on coral | 4.9:1 | Pass |
| ink on periwinkle | 5.7:1 | Pass |
| ink on butter | 8.0:1 | Pass |
| ink on sage | 6.4:1 | Pass |
| inkMuted on paper | 7.2:1 | Pass |
| hand on paper | 5.2:1 | Pass |
| stamp on paper | 5.2:1 | Pass |
| stampDecor on paper | 3.8:1 | Decoration only |
| placeholder on card | 2.2:1 | Not for text |

---

## 4. Typography

| Style | Font | Size / weight | Notes |
|---|---|---|---|
| Screen title | Bricolage Grotesque | 44 / 800 | Line height 0.92, tracking −0.04em. Two lines ending in a period, e.g. "Sinau / aksara." |
| Syllable XL | Bricolage Grotesque | 64 / 800 | Latin reading on the lesson card |
| Syllable L | Bricolage Grotesque | 40 / 800 | Answer tiles, hero lesson list |
| Card title | Bricolage Grotesque | 20 / 800 | |
| Button | Bricolage Grotesque | 18 / 800 | |
| Eyebrow | Bricolage Grotesque | 13 / 800 | Uppercase, tracking 0.08em |
| Caption | Bricolage Grotesque | 12 / 700 | |
| Hand note | Patrick Hand | 17–22 / 400 | Can tilt −1° to −2° |
| Aksara hero | Noto Sans Javanese | 190–230 | One per screen |
| Aksara tile | Noto Sans Javanese | 30 | Chart grid |
| Aksara inline | Noto Sans Javanese | 28–36 | Lists, example words |

**Fonts for Flutter:** the WOFF2 files in `screens/fonts/` only work on the web. For mobile builds, either:

- get the TTF files from Google Fonts and add them to `pubspec.yaml`, or
- use the `google_fonts` package.

All three families are on Google Fonts under the SIL Open Font License 1.1.

**Leave room below aksara.** Suku (ꦸ) and pasangan hang far below the baseline, often by about one glyph height. Do not clip aksara containers to the line height. Add bottom padding of about 0.8 × the font size wherever a word can contain suku or pasangan, such as the converter result, breakdown rows and example words.

Check that Noto Sans Javanese renders stacked forms (pasangan, sandhangan) correctly on every target platform. Test these strings: `ꦏ꧀ꦲ`, `ꦲꦢꦺꦴꦃ`, `ꦲꦏꦸ`.

---

## 5. Components

Each item gives the visual spec and the screens that use it.

**PrimaryBar** (Card, Trace, Quiz, Review)
Full-width ink block, 68px tall, `onInk` text 18/800 with a trailing arrow icon. Docked at the bottom.
In Trace it is split 1:2. The left part is a secondary "Hapus" button on paper, and the two parts are divided by a 2px ink line.

**IconButton** (all)
44 × 44, 2px ink border, `card` or `paper` fill. Optional 3px hard shadow.
Variants:
- Settings: butter fill.
- Sound: butter fill, 56–64px in lesson contexts.
- Back/close: paper fill.

**HeroLessonCard** (Learn path)
Accent fill, 2px border, 5px shadow, about 250px tall. It contains:
- an eyebrow ("01 — KELOMPOK 1"),
- the syllables stacked at 40/800,
- an ink pill button "Mulai menulis" with a pencil icon,
- a giant cropped aksara at the bottom right (about 270px, 80% opacity),
- a tape strip centred on the top edge, rotated −3°.

**LessonTile** (Learn path, "Berikutnya…")
Two-column grid, 130px tall, accent fill, 2px border, no shadow. It has:
- a number at the top left,
- a title at the bottom left,
- a lock icon at the top right,
- a cropped aksara watermark at about 26–28% opacity.

Locked tiles keep their colour. The lock icon shows the state.

**AksaraTile** (Chart)
4-column grid with 10px gap. Each tile is 92px tall, `card` fill, 2px border and 3px shadow.
The glyph sits on top at 30px. Below it is a 26px label strip with a 2px top border. The strip is filled with the lesson-group colour, or `neutral` if the group is not set yet.

**SegmentedTabs** (Chart, Converter)
One 2px ink frame divided into equal cells, each 44px tall. The active cell is ink with `onInk` text. Inactive cells are transparent with ink text and a 2px divider.

**BottomNav** (Learn path, Chart, Review, Converter)
Four equal cells, each 64px tall, with a 2px ink top border and 2px dividers. Each cell has a 22px stroke icon and a 13px label.
The active cell has an ink fill and `onInk` content. Inactive cells use `inkMuted` content.
Tabs: Learn, Chart, Review, Convert.

**SegmentedProgress** (Trace, Quiz)
Either one bar or N equal segments. Each is 12px tall with a 2px ink border. Done segments are ink-filled. To-do segments are paper.

**AnswerTile** (Quiz)
Three columns, each 96px tall, `card` fill, 2px border, 3px shadow, with the syllable at 40/800.
The correct state uses a sage fill plus a check icon at the top right. Always show the check icon so the state is not shown by colour alone.
The wrong state is not designed yet. Suggestion: coral fill plus a cross icon.

**FeedbackRow** (Quiz)
A 72px circular stamp ("BENAR!", `stamp` colour, rotated −12°). Next to it is a handwritten explanation at 21px.

**TracingPad** (Trace)
`card` fill, 2px border, 5px shadow, 340px tall. It contains:
- two dashed `margin` guide lines,
- a ghost aksara outline (2px `placeholder` stroke, no fill),
- the user's stroke in `#E0694A`, 12px wide with a round cap,
- a start dot.

Below it are three repetition slots. Done slots have a solid border and show the glyph. Empty slots have a dashed `placeholder` border.

**BottomSheet** (Chart detail)
Square top edge with a 2px ink top border and a 48 × 5 grab handle. The backdrop scrim is ink at 45%.

**BreakdownRow** (Converter)
60px tall, `card` fill, 2px border. From left to right:
- the aksara cluster,
- the name and description ("ka + suku" / "suku mengubah a → u"),
- the label "dibaca",
- a small chip with the reading. The chip fill uses a group or meaning colour.

**StrengthBar** (Review)
Four segments, each 12px tall with a 2px border. Filled segments are sage. A label (kuat / lumayan / baru) sits on the right.

**Decorations** (use sparingly, at most one or two per screen)
- Tape strip: about 84 × 24, colour `tape`, rotated 3–4°.
- Stamp: 70–72px circle with a 2px outline, rotated −12° to −14°.
- Hand note: Patrick Hand in the `hand` colour.

Decorations must never cover icons, text or touch targets.

---

## 6. Screens and flow

| # | Screen | Screenshot | Key content |
|---|---|---|---|
| 1 | Learn path (home) | `01-learn-path.png` | Title "Sinau aksara.", progress "0 / 20 aksara", HeroLessonCard (current lesson), "Berikutnya…" with the next two LessonTiles, BottomNav |
| 2 | Meet the aksara | `02-meet-aksara.png` | Group chips (current filled, upcoming dashed), big glyph block with a "Dibaca pa" footer and sound button, mnemonic hint, PrimaryBar "Coba tulis" |
| 3 | Trace practice | `03-trace.png` | Accent header with back, progress, "Tulis huruf pa" and sound; TracingPad; repetition slots; Hapus / Selesai |
| 4 | Quiz | `04-quiz.png` | Segmented progress, periwinkle question card with glyph, three AnswerTiles, FeedbackRow, PrimaryBar "Lanjut" |
| 5 | Chart | `05-chart.png` | Title "Tabel aksara.", tabs (Carakan / Sandhangan / Pasangan), 20-tile grid in hanacaraka order, group legend, BottomNav |
| 6 | Chart detail | `06-chart-detail.png` | Sheet over the chart: big tile, reading, hand note, Dengar button, Pasangan box, "Tulis ha" shortcut, example words |
| 7 | Converter | `07-converter.png` | Title "Ganti aksara.", direction tabs, labelled input, coral result card (Salin / Dengar), "Cara menulisnya" BreakdownRows, BottomNav |
| 8 | Review | `08-review.png` | Title "Ulangi lagi.", sage "Hari ini" card with a fanned card stack and "Mulai mengulang", "Seberapa ingat?" StrengthBars, BottomNav |

**Flow:**

1. Learn path → tap HeroLessonCard → Meet the aksara.
2. Meet the aksara → "Coba tulis" → Trace practice.
3. Trace practice → "Selesai" → Quiz.
4. Quiz → "Lanjut" → next aksara (repeats 2–4 for each aksara in the group) → back to the Learn path.

From other screens:

- Chart tile → Chart detail sheet.
- "Tulis ha" in the sheet → Trace practice for that aksara.
- Review "Mulai mengulang" → Quiz in review mode.

**Chart order (hanacaraka):**
ha na ca ra ka · da ta sa wa la · pa dha ja ya nya · ma ga ba tha nga

ꦲ ꦤ ꦕ ꦫ ꦏ · ꦢ ꦠ ꦱ ꦮ ꦭ · ꦥ ꦝ ꦗ ꦪ ꦚ · ꦩ ꦒ ꦧ ꦛ ꦔ

---

## 7. Interaction

- **Pressed state for outlined elements:** move the element 2px right and 2px down, and shrink its shadow by the same amount. This makes it look pressed into the paper. Do not use a ripple effect.
- **Focus:** show a 3px ink outline offset by 2px. Never remove focus indicators.
- **Touch targets:** at least 44 × 44.
- **Motion:** keep it short (about 150–200ms) and calm. Respect the system "reduce motion" setting.
- **Sound buttons:** play the syllable. While playing, show a playing state such as a filled icon. The audio source is not part of this design.

---

## 8. Accessibility

- Every icon-only button needs a label: Settings, Play sound, Back, Close.
- Decorative aksara watermarks, tape and decorative stamps are hidden from screen readers.
- Real aksara (hero glyph, tiles, answers) are readable text. Give them a label with the Latin reading, e.g. "aksara pa".
- Quiz states must not depend on colour alone. Always show the check or cross icon.

---

## 9. Placeholders and open questions

These are not final. Do not invent values for them. Leave them as visible TODOs.

- `[MNEMONIC — …]` on Meet the aksara: a memory hint for each aksara. The content must come from the curriculum.
- `[STROKE COUNT]` on Trace: the stroke count and stroke order for each aksara. These need a verified source.
- The Review data (3 aksara, strength levels) is sample data.
- "Pasangan" box for ha: shows `ꦏ꧀ꦲ` because the current app shows that. Check it with a teacher.
- Hand note "di awal kata sering dibaca 'a'": check the wording with a teacher.
- Not designed yet: wrong-answer state, lesson-complete screen, Settings, Sandhangan and Pasangan chart tabs, the empty converter state, the Aksara → Latin converter mode, and dark mode.

---

## 10. Suggested implementation order

1. Put the tokens into the theme: colours, text styles, border width and shadow offsets.
2. Build the shared widgets: PrimaryBar, IconButton, the outlined surface with a hard shadow, SegmentedTabs, BottomNav and the ruled-paper background.
3. Build the screens in flow order: 1 → 2 → 3 → 4, then 5 and 6, then 7, then 8.
4. Compare each screen with its screenshot at 390 × 844.
