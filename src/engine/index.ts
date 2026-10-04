// Pure TypeScript transliteration engine for the Javanese script (aksara Jawa).
//
// Ruleset `kaj1-2021-simplified-v3`: Kongres Aksara Jawa I Yogyakarta 2021,
// Tata Tulis Simplified; transliteration per JGST (canonical) and PUJL
// (user-facing). See docs/references/CITATIONS.md.
import { aksaraToLatin, type LatinScheme } from "./aksara-to-latin.ts";
import type { ConvertResult } from "./convert-result.ts";
import { latinToAksara } from "./latin-to-aksara.ts";

export * from "./aksara-char.ts";
export * from "./aksara-to-latin.ts";
export * from "./angka.ts";
export * from "./codepoints.ts";
export * from "./convert-result.ts";
export * from "./latin-to-aksara.ts";
export * from "./latin/latin-tokenizer.ts";
export * from "./latin/syllabifier.ts";
export * from "./murda.ts";
export * from "./nglegena.ts";
export * from "./pada.ts";
export * from "./rekan.ts";
export * from "./sandhangan.ts";
export * from "./swara.ts";

/** The versioned ruleset this build of the engine implements. */
export const aksaraEngineRulesetId = "kaj1-2021-simplified-v3";

/** Aksara -> Latin. Stateless; `scheme` defaults to `pujl`. */
export function toLatin(
  aksara: string,
  { scheme = "pujl" }: { scheme?: LatinScheme } = {},
): ConvertResult {
  return aksaraToLatin(aksara, scheme);
}

/** Latin -> aksara. Stateless; murda is opt-in and never applied by default. */
export function toAksara(
  latin: string,
  { useMurda = false }: { useMurda?: boolean } = {},
): ConvertResult {
  return latinToAksara(latin, useMurda);
}
