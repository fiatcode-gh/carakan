/** The unit colours (D4); features pick one per unit, the design system paints it. */
export type UnitAccent = "coral" | "periwinkle" | "butter";

/** A CSS value for an accent fill; no unit (a glyph no unit teaches) is neutral. */
export function accentVar(accent: UnitAccent | null): string {
  return accent === null ? "var(--color-neutral)" : `var(--color-${accent})`;
}
