import type { MessageKey } from "../../l10n/i18n.ts";

/**
 * One engine message and its UI-language key (W15). The engine keeps its
 * English text; only the page localizes it.
 */
export interface EngineMessageEntry {
  /** The engine's literal text, every `${…}` substitution written `${}`. */
  readonly source: string;
  readonly key: MessageKey;
  /** Anchored; one capture group when `param` is set. */
  readonly match: RegExp;
  readonly param?: "char" | "codepoint";
}

const exact = (text: string): RegExp =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "su");

const literal = (source: string, key: MessageKey): EngineMessageEntry => ({
  source,
  key,
  match: exact(source),
});

/** Engine text → message key, in the order the engine's rules are checked. */
export const ENGINE_MESSAGES: readonly EngineMessageEntry[] = [
  {
    source: 'Unknown character "${}"',
    key: "engineErrorUnknownCharacter",
    match: /^Unknown character "(.+)"$/su,
    param: "char",
  },
  literal(
    'A "/" must directly follow a final consonant',
    "engineErrorSlashPlacement",
  ),
  literal(
    "Cluster marker without a leading consonant",
    "engineErrorClusterWithoutConsonant",
  ),
  literal(
    "Cluster marker cannot close a syllable",
    "engineErrorClusterClosesSyllable",
  ),
  literal("Unsupported consonant cluster", "engineErrorUnsupportedCluster"),
  literal("Unsupported onset cluster", "engineErrorUnsupportedOnset"),
  literal("Syllable without a vowel", "engineErrorSyllableWithoutVowel"),
  literal(
    "Vowel hiatus after a pepet is not supported",
    "engineErrorPepetHiatus",
  ),
  literal(
    "Vowel required for a vowel-only syllable",
    "engineErrorVowelOnlySyllable",
  ),
  // An internal invariant, unreachable from the UI: generic on purpose.
  literal(
    "Bare e reached the renderer; ambiguity must be resolved first",
    "engineErrorGeneric",
  ),
  literal(
    "Sandhangan without a base aksara",
    "engineErrorSandhanganWithoutBase",
  ),
  literal("Cecak telu on an unsupported base", "engineErrorCecakTeluBase"),
  literal("Second vowel sign on one aksara", "engineErrorSecondVowelSign"),
  {
    source: "Unrecognized codepoint U+${}",
    key: "engineErrorUnrecognizedCodepoint",
    match: /^Unrecognized codepoint U\+([0-9A-Fa-f]+)$/su,
    param: "codepoint",
  },
  literal(
    'Bare "e" is pepet (ě) or taling (é) — PUJL does not mark the difference ' +
      "(KAJ I Daftar Transliterasi). Choose a reading, or type ě/ê/é/è.",
    "engineAmbiguousBareE",
  ),
];

/** Control, format and separator characters are invisible in the UI. */
const invisible = /^[\p{C}\p{Z}]$/u;

function displayChar(captured: string): string {
  if (!invisible.test(captured)) return captured;
  const hex = captured.codePointAt(0)!.toString(16).toUpperCase();
  return `U+${hex.padStart(4, "0")}`;
}

export function localizeEngineMessage(text: string): {
  key: MessageKey;
  params?: Record<string, string>;
} {
  for (const entry of ENGINE_MESSAGES) {
    const hit = entry.match.exec(text);
    if (hit === null) continue;
    if (entry.param === undefined) return { key: entry.key };
    const captured = hit[1]!;
    return {
      key: entry.key,
      params: {
        [entry.param]:
          entry.param === "char"
            ? displayChar(captured)
            : `U+${captured.toUpperCase()}`,
      },
    };
  }
  return { key: "engineErrorGeneric" };
}
