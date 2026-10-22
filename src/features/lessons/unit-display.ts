import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import type { Unit } from "../../content/unit.ts";

/** The unit colours (D4), cycled over the active ruleset's ladder. */
export type UnitAccent = "coral" | "periwinkle" | "butter";

const accents: readonly UnitAccent[] = ["coral", "periwinkle", "butter"];

/** `ladderIndex` is the unit's position in `services.content.units`. */
export function unitAccent(ladderIndex: number): UnitAccent {
  if (!Number.isInteger(ladderIndex) || ladderIndex < 0) {
    throw new RangeError(`not a ladder index: ${ladderIndex}`);
  }
  return accents[ladderIndex % accents.length]!;
}

export interface GlyphUnit {
  readonly unit: Unit;
  readonly index: number;
  readonly accent: UnitAccent;
}

/** Glyph id → the first unit, in ladder order, that teaches it. */
export function glyphUnits(
  units: readonly Unit[],
): ReadonlyMap<string, GlyphUnit> {
  const map = new Map<string, GlyphUnit>();
  units.forEach((unit, index) => {
    const entry = { unit, index, accent: unitAccent(index) };
    for (const glyph of unit.glyphs) {
      if (!map.has(glyph)) map.set(glyph, entry);
    }
  });
  return map;
}

/** A CSS value for an accent fill; no unit (a glyph no unit teaches) is neutral. */
export function accentVar(accent: UnitAccent | null): string {
  return accent === null ? "var(--color-neutral)" : `var(--color-${accent})`;
}

/**
 * Unit names read "Kelompok 1: pa ha ya": the head is the eyebrow, the tail
 * the title. A name without ": " is all title.
 */
export function splitUnitName(name: string): {
  head: string | null;
  tail: string;
} {
  const at = name.indexOf(": ");
  if (at < 0) return { head: null, tail: name };
  return { head: name.slice(0, at), tail: name.slice(at + 2) };
}

/** The first glyph char of the unit ("" when none has one). */
export function unitWatermark(unit: Unit, glyphInfo: GlyphInfoTable): string {
  for (const id of unit.glyphs) {
    const char = glyphInfo.byId.get(id)?.char ?? "";
    if (char !== "") return char;
  }
  return "";
}
