// Pure TypeScript transliteration engine for the Javanese script (aksara Jawa).
//
// Rulesets: `pedoman-2002-v1` (Pedoman Ejaan Bahasa Jawa yang Disempurnakan
// 2002, the app default) and `kaj1-2021-simplified-v3` (Kongres Aksara Jawa I
// Yogyakarta 2021, Tata Tulis Simplified, the frozen differential ruleset);
// transliteration per JGST (canonical) and PUJL (user-facing). See
// docs/references/CITATIONS.md.
import { aksaraToLatin, type LatinScheme } from "./aksara-to-latin.ts";
import type { ConvertResult, ToAksaraResult } from "./convert-result.ts";
import { latinToAksara } from "./latin-to-aksara.ts";
import { kajRulesetId, type RulesetId } from "./ruleset.ts";

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
export * from "./ruleset.ts";
export * from "./sandhangan.ts";
export * from "./swara.ts";

/** Aksara -> Latin. Stateless; `scheme` defaults to `pujl`. */
export function toLatin(
  aksara: string,
  { scheme = "pujl" }: { scheme?: LatinScheme } = {},
): ConvertResult {
  return aksaraToLatin(aksara, scheme);
}

/**
 * Latin -> aksara. Stateless; murda is opt-in and never applied by default.
 * `ruleset` defaults to the frozen differential ruleset (KAJ v3); the app
 * always passes its active ruleset.
 */
export function toAksara(
  latin: string,
  {
    useMurda = false,
    ruleset = kajRulesetId,
  }: { useMurda?: boolean; ruleset?: RulesetId } = {},
): ToAksaraResult {
  return latinToAksara(latin, useMurda, ruleset);
}
