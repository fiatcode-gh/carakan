import type { ConfusionPair } from "../../content/confusion-pair.ts";
import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";

const pasanganPrefix = "pasangan-";

/**
 * Resolves (target glyph, chosen option string) to a confusion-pair key, or
 * null when no pair exists: only wrong answers whose (target, chosen) pair is
 * in the list are logged. The chosen option is matched against the first
 * non-pasangan table entry (insertion order) whose char (aksara options) or
 * pujl (sound options) equals it.
 */
export function confusionPairKeyFor(args: {
  targetGlyphId: string;
  chosenOption: string;
  optionIsAksara: boolean;
  glyphInfo: GlyphInfoTable;
  pairs: readonly ConfusionPair[];
}): string | null {
  const { targetGlyphId, chosenOption, optionIsAksara, glyphInfo, pairs } =
    args;
  const targetBase = targetGlyphId.startsWith(pasanganPrefix)
    ? targetGlyphId.substring(pasanganPrefix.length)
    : targetGlyphId;
  let chosenId: string | null = null;
  for (const [id, info] of glyphInfo.byId) {
    if (id.startsWith(pasanganPrefix)) continue;
    if ((optionIsAksara ? info.char : info.pujl) === chosenOption) {
      chosenId = id;
      break;
    }
  }
  if (chosenId === null) return null;
  for (const pair of pairs) {
    if (pair.contains(targetBase) && pair.contains(chosenId)) return pair.key;
  }
  return null;
}
