# Word list licensing — findings (2026-08-12)

## Wiktionary (en.wiktionary.org, Javanese entries)

- License: CC BY-SA 4.0 (and 3.0 for older content). Usable with
  attribution. Verified: the license page and entry footer text.
- Attribution implemented: per-word `source: "wiktionary:<word>"` in
  words.json + a credit line on the About page (Task 4) naming Wiktionary
  and the license.
- A word's Javanese section is verified with:
  `curl -sL "https://en.wiktionary.org/wiki/<word>" | grep -c 'id="Javanese"'`
  (must be >= 1). Words failing the check are sourced `"author"` instead
  (native-speaker review) and noted in the batch commit message.

## Bausastra / dictionary scans

- Status: still under investigation. Copyright in Indonesia runs 50 years
  after the author's death; many Bausastra editions are newer than that or
  have unclear authorship. NOT used in v1 until confirmed.
- Decision: v1 corpus uses only (a) Wiktionary Javanese entries with
  attribution, and (b) author-sourced entries (native-speaker review by the
  project owner). If a later edition is cleared, it becomes `v2` content
  with its own source tag — never a silent edit.

---

## Research record (2026-08-12 web check)

### Wiktionary — claim verified

- Checked: https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- Confirmed: entry texts are dual-licensed under CC BY-SA 4.0 and the GNU
  Free Documentation License (GFDL) 1.1+; attribution is a required
  condition under both licenses. The plan's "CC BY-SA 4.0, usable with
  attribution" claim holds.
- The "3.0 for older content" nuance is historically accurate: Wikimedia
  adopted CC BY-SA 3.0 in the 2009 licensing update and upgraded the
  default license to CC BY-SA 4.0 in the June 2023 Terms of Use update
  (effective 2023-06-07; see diff.wikimedia.org/2023/06/29/
  stepping-into-the-future-wikimedia-projects-transition-to-creative-commons-4-0-license/).
  Content added between 2009 and 2023 remains available under CC BY-SA 3.0.
  For this project the current 4.0 terms are what matter.

### Bausastra — claim partially outdated, decision kept

- The plan states Indonesian copyright runs "50 years after the author's
  death". That was the term under the old Law No. 19/2002. The current law,
  Law No. 28/2014 (in force 2014-10-16; WIPO Lex
  https://www.wipo.int/wipolex/en/legislation/details/15600), protects
  works for the author's life plus 70 years. Recorded here so the plan's
  number is not repeated as current law.
- Public info found:
  - Baoesastra Djawa, W.J.S. Poerwadarminta, 1939, J.B. Wolters,
    670 pages — catalog record:
    https://manuskripedia.id/pustaka/mp-t0134/ (also Wikidata
    https://www.wikidata.org/wiki/Q118108886 for the 1939 bilingual
    dictionary).
  - Poerwadarminta: 1904-09-12 to 1968-11-28 (id.wikipedia.org/wiki/
    W.J.S._Poerwadarminta). Under Law 28/2014 his 1939 Bausastra would
    stay protected until 2038 (life + 70), not yet public domain.
  - Later editions, e.g. Bausastra Jawa-Indonesia by S. Prawiroatmodjo
    (Gunung Agung, 1980/1985; UGM library catalog
    https://langka.lib.ugm.ac.id/viewer/index/3783,
    Jakarta library catalog
    https://perpustakaan.jakarta.go.id/book/detail?cn=INLIS000000000861859),
    are clearly within life + 70 of their author and not public domain.
- No public statement found declaring any Bausastra edition public domain
  or freely licensed. Outcome: the plan's decision stands — copyright
  status stays "under investigation" and Bausastra content is NOT used in
  v1. If anything, the finding makes "not used" the only safe reading.
