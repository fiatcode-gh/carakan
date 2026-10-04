# 0001 — UI rework: approved prototype and rework items

- Date: 2026-10-04
- Status: approved by the user
- Approved prototype: commit `bf8eac8` (`prototype/`, `docs/design/prototype-review.md`, `docs/design/screens/`)
- Applies to: Task 10 (design system), Tasks 11–15 (features)

## Context

The Flutter app at `aksara-app@ebc7cb5` was a prototype. The web port keeps the heritage brand and rebuilds the UI to production quality (contract section 3.5). The user reviewed the clickable prototype and its review packet, then approved them with every recommendation in this record.

## Design decisions

1. **Tokens.** `prototype/tokens.css` is promoted to `src/styles/tokens.css` verbatim. Brand values changed for WCAG AA:
   - soga-soft `#7A6B59` → `#6B5C4A` (muted text);
   - gold as a small indicator on paper → `#8F6508`. Brand gold `#D9A441` stays as a fill under soga ink;
   - terracotta `#B34A26` is used for fills, rings and indicators only. Warning and danger text uses `#8F3A1C`;
   - new: `#857460` for control borders, `#244C73` for correct-answer text.
2. **Correct and wrong states.** No green. Correct = indigo + check icon. Wrong = terracotta + cross icon + dashed border. State is never shown by hue alone.
3. **Empty review.** `reviewEmpty` drops the party emoji (cheap Android builds may lack the emoji font). The empty state shows a gold check badge instead. Both locales change the string.
4. **App icon.** Paper-coloured Jejeg `ca` on a terracotta plate, with a gold frame and lozenge (`prototype/icon.html`, with a maskable variant).
5. **Chart detail.** Every tile opens its own glyph's detail (parity P-C03). The prototype's fixed details were only samples.
6. **W10 copy.** The 15 drafted keys in `docs/design/prototype-review.md` ("W10 copy table") are approved as written, in both locales.

## Rework items

Every item is accepted. Each replaces the source behavior named in `.flow/plans/carakan-web-port/PARITY.md` section W.

| ID  | Approved behavior                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W01 | Converter output stays after Copy. The tofu warning shows as a transient toast.                                                                                                                                                                                                                                                             |
| W02 | Drill answers show the selected state (icon + text) and reveal the correct option.                                                                                                                                                                                                                                                          |
| W03 | No pull-to-refresh. The review list refreshes on tab open, on resume and on enqueue.                                                                                                                                                                                                                                                        |
| W04 | Tab-open refresh fires when Ulangi opens.                                                                                                                                                                                                                                                                                                   |
| W05 | The last lesson answer shows feedback, then the done view.                                                                                                                                                                                                                                                                                  |
| W06 | Lessons pass the glyph ids of completed units as `taughtGlyphs`, so questions get up to 4 options.                                                                                                                                                                                                                                          |
| W07 | Settings is also reachable from the gear in the Belajar top bar.                                                                                                                                                                                                                                                                            |
| W08 | Converter errors keep the error title and mark the offending character at `index` in an input echo. The message text follows W15.                                                                                                                                                                                                           |
| W09 | About copy names and links the served paths (`licenses/`, `content/v1/words.json`).                                                                                                                                                                                                                                                         |
| W10 | New strings for loading, errors, update, close, skip link, navigation, unit status, scheme and direction (decision 6).                                                                                                                                                                                                                      |
| W11 | Chart detail, glyph picker and report use bottom-anchored modal `<dialog>` sheets with a close button. Android back closes them.                                                                                                                                                                                                            |
| W12 | Picker section titles use the `section*` message keys.                                                                                                                                                                                                                                                                                      |
| W13 | Picker labels use content display names (`na murda`, `pada adeg-adeg`, long forms via `longFormName`).                                                                                                                                                                                                                                      |
| W14 | New: review cards hide the answer. The card shows the glyph alone, plus a reveal button. Revealing shows the name and the four grade buttons. A card that is graded `again` and moved to the end is hidden again.                                                                                                                           |
| W15 | New: the app shows engine errors and ambiguity reasons in the UI language. The engine messages stay English and unchanged. The app maps every engine message, including the parameterized `Unknown character "<c>"` and `Unrecognized codepoint U+<hex>`, to a message key in both locales. An unknown message falls back to a generic key. |

## Consequences

- Task 10 promotes the tokens and components and applies decisions 3 and 6 to `src/l10n/*.json`.
- W14 changes the Ulangi card flow (Task 13). W15 adds message keys and a mapping module used by the converter (Task 14). The plan amendment of 2026-10-04 adds both.
- `prototype/` is deleted by Task 10 after promotion. This record and the screenshots stay.

## Addendum (Task 11, 2026-10-04)

Found while implementing W06. With more glyphs taught, the source showed raw engine ids (`suku`, `wulu`, `naMurda`) as glyph-to-sound answer options, and it could show the same text twice. It could also show a wrong option that sounds the same as the prompt (`taMurda` and `tha` both read "tha"). The web app shows each option's PUJL reading (or its character for sound-to-glyph), never repeats a displayed option, and never offers a wrong option that reads the same as the prompt. Main accepted this as a direct consequence of W06 and reported it to the user.
