import type { AksaraChar } from "./aksara-char.ts";
import { onset } from "./aksara-char.ts";
import { angkaCharToDigit, angkaFlanker } from "./angka.ts";
import type { ConvertResult } from "./convert-result.ts";
import { murdaLinks } from "./murda.ts";
import { nglegenaByCodepoint } from "./nglegena.ts";
import { padaByCodepoint, zeroWidthNonJoiner } from "./pada.ts";
import { cecakTelu } from "./rekan.ts";
import {
  sandhanganByCodepoint,
  sandhanganCakra,
  sandhanganCecak,
  sandhanganKeret,
  sandhanganLayar,
  sandhanganPangkon,
  sandhanganPengkal,
  sandhanganPepet,
  sandhanganSuku,
  sandhanganTaling,
  sandhanganTarung,
  sandhanganWignyan,
  sandhanganWulu,
} from "./sandhangan.ts";
import { swaraByCodepoint, swaraLongForms } from "./swara.ts";

/**
 * Latin output scheme.
 *
 * `pujl` — Pelatinan Umum Jawa Latin, the school spelling (KAJ I Yogyakarta
 * 2021, PUJL column). Friendly, slightly lossy.
 * `jgst` — Javanese General System of Transliteration (KAJ I Komisi I).
 * Lossless for the in-scope repertoire; the canonical corpus scheme.
 */
export type LatinScheme = "pujl" | "jgst";

/** Post-base ai/au vowel sign (dirga mure). */
const dirgaMure = 0xa9bb;

const consonants: ReadonlyMap<number, AksaraChar> = new Map<number, AksaraChar>(
  [
    ...nglegenaByCodepoint,
    ...murdaLinks.map((m): [number, AksaraChar] => [
      m.aksara.codepoint,
      m.aksara,
    ]),
  ],
);

function isVowelSign(r: number): boolean {
  return (
    r === sandhanganWulu.codepoint ||
    r === sandhanganSuku.codepoint ||
    r === sandhanganPepet.codepoint ||
    r === sandhanganTarung.codepoint ||
    r === sandhanganTaling.codepoint ||
    r === dirgaMure // post-base ai/au
  );
}

/**
 * Aksara -> Latin converter (the mechanical direction, spec milestone 2).
 * Ruleset kaj1-2021-simplified-v3.
 */
export function aksaraToLatin(
  input: string,
  scheme: LatinScheme = "pujl",
): ConvertResult {
  const jgst = scheme === "jgst";
  const runes = Array.from(input, (c) => c.codePointAt(0)!);
  let out = "";
  let i = 0;

  const latinOf = (c: AksaraChar): string => (jgst ? c.latinJgst : c.latinPujl);

  while (i < runes.length) {
    const r = runes[i]!;

    if (r === zeroWidthNonJoiner) {
      i++;
      continue;
    }

    if (r === 0x20) {
      out += " ";
      i++;
      continue;
    }

    // Pada. Active pada map to , and . — catalogue pada pass through.
    const pada = padaByCodepoint.get(r);
    if (pada !== undefined) {
      out += pada.latin ?? String.fromCodePoint(r);
      i++;
      continue;
    }

    // Angka flanker (pada pangkat) — consumed; the digits carry the value.
    if (r === angkaFlanker.codepoint) {
      i++;
      continue;
    }

    // Angka digits.
    const digit = angkaCharToDigit(String.fromCodePoint(r));
    if (digit !== null) {
      out += String(digit);
      i++;
      continue;
    }

    // Swara (independent vowels), incl. long forms with tarung.
    const sw = swaraByCodepoint.get(r);
    if (sw !== undefined) {
      // KAJ I Swara Mandiri: independent pepet = A + pepet, transliterated
      // ě (JGST) / e (PUJL). The long-form rule only matches tarung, so
      // A + pepet falls through to this check — the swara letter itself is
      // not written (A + pepet = ě, never aě).
      if (
        sw.id === "a" &&
        i + 1 < runes.length &&
        runes[i + 1] === sandhanganPepet.codepoint
      ) {
        out += jgst ? sandhanganPepet.latinJgst : sandhanganPepet.latinPujl;
        i += 2;
      } else {
        out += latinOf(sw);
        i++;
        const long = swaraLongForms.get(sw.id);
        if (
          long !== undefined &&
          i < runes.length &&
          runes[i] === sandhanganTarung.codepoint
        ) {
          out += jgst ? long.latinJgst : long.latinPujl;
          i++;
        }
      }
      continue;
    }

    // Base consonant (nglegena or murda).
    const base = consonants.get(r);
    if (base === undefined) {
      if (sandhanganByCodepoint.has(r)) {
        return {
          kind: "error",
          input,
          index: i,
          message: "Sandhangan without a base aksara",
        };
      }
      return {
        kind: "error",
        input,
        index: i,
        message: `Unrecognized codepoint U+${r.toString(16).toUpperCase().padStart(4, "0")}`,
      };
    }

    // Rekan: cecak telu after PA/WA reads as f/v — the base onset is
    // NOT written (KAJ I Bab I A.4).
    if (i + 1 < runes.length && runes[i + 1] === cecakTelu.codepoint) {
      if (base.id === "pa") {
        out += "f";
      } else if (base.id === "wa") {
        out += "v";
      } else {
        return {
          kind: "error",
          input,
          index: i,
          message: "Cecak telu on an unsupported base",
        };
      }
      i += 2; // base + cecak telu
    } else {
      out += onset(base, { jgst });
      i++;
    }

    // Consonant medials (cakra, keret, pengkal).
    let medialsDone = false;
    let keretSeen = false;
    while (!medialsDone && i < runes.length) {
      const m = sandhanganByCodepoint.get(runes[i]!);
      if (
        m === sandhanganCakra ||
        m === sandhanganKeret ||
        m === sandhanganPengkal
      ) {
        if (m === sandhanganKeret) keretSeen = true;
        out += jgst ? m.latinJgst : m.latinPujl;
        i++;
      } else {
        medialsDone = true;
      }
    }

    // Pasangan chain: pangkon + consonant continues the onset cluster.
    // Word-final pangkon (no link) falls through to the closing check.
    while (i + 1 < runes.length && runes[i] === sandhanganPangkon.codepoint) {
      if (!consonants.has(runes[i + 1]!)) break;
      i++; // Consume the pangkon.
      const p = consonants.get(runes[i]!)!;
      out += onset(p, { jgst });
      i++;
      let pairMedialsDone = false;
      while (!pairMedialsDone && i < runes.length) {
        const m = sandhanganByCodepoint.get(runes[i]!);
        if (
          m === sandhanganCakra ||
          m === sandhanganKeret ||
          m === sandhanganPengkal
        ) {
          if (m === sandhanganKeret) keretSeen = true;
          out += jgst ? m.latinJgst : m.latinPujl;
          i++;
        } else {
          pairMedialsDone = true;
        }
      }
    }

    // Vowel.
    let vowel: string;
    if (keretSeen) {
      // Keret = cakra + pepet fused: it carries its own vowel
      // (KAJ I Bab I A.5.e). No further vowel is written.
      vowel = "";
      if (i < runes.length && isVowelSign(runes[i]!)) {
        return {
          kind: "error",
          input,
          index: i,
          message: "Second vowel sign on one aksara",
        };
      }
    } else if (i < runes.length && isVowelSign(runes[i]!)) {
      const vr = runes[i]!;
      i++;
      if (vr === sandhanganWulu.codepoint) {
        vowel = "i";
      } else if (vr === sandhanganSuku.codepoint) {
        vowel = "u";
      } else if (vr === sandhanganPepet.codepoint) {
        vowel = jgst ? sandhanganPepet.latinJgst : sandhanganPepet.latinPujl;
      } else if (vr === sandhanganTarung.codepoint) {
        vowel = jgst ? sandhanganTarung.latinJgst : sandhanganTarung.latinPujl;
      } else if (vr === dirgaMure) {
        // Post-base diphthong: dirga mure = ai; + tarung = au
        // (WG2 n3319: kau = KA + DIRGA MURE + TARUNG).
        vowel = "ai";
        if (i < runes.length && runes[i] === sandhanganTarung.codepoint) {
          vowel = "au";
          i++;
        }
      } else if (vr === sandhanganTaling.codepoint) {
        // Unicode order: taling follows the (cluster) onset; taling +
        // tarung together is o.
        vowel = sandhanganTaling.latinPujl; // é in both schemes.
        if (i < runes.length && runes[i] === sandhanganTarung.codepoint) {
          vowel = "o";
          i++;
        }
      } else {
        // Unreachable: isVowelSign admits only the signs handled above.
        throw new Error(`Unhandled vowel sign U+${vr.toString(16)}`);
      }
    } else {
      vowel = "a";
    }

    // Syllable-closing signs.
    if (i < runes.length) {
      const cr = runes[i]!;
      if (
        cr === sandhanganLayar.codepoint ||
        cr === sandhanganCecak.codepoint ||
        cr === sandhanganWignyan.codepoint
      ) {
        out += vowel;
        const s = sandhanganByCodepoint.get(cr)!;
        out += jgst ? s.latinJgst : s.latinPujl;
        i++;
        continue;
      }
      if (cr === sandhanganPangkon.codepoint) {
        // Bare pangkon — the pasangan chain above did not consume it.
        // It kills the vowel; JGST marks it with a trailing slash.
        i++;
        if (jgst) out += "/";
        continue;
      }
    }

    out += vowel;
  }
  return { kind: "success", output: out };
}
