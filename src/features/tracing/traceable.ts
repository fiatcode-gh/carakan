import { nglegenaById } from "../../engine/index.ts";

/** Only the 20 base letters can be traced; murda, swara, sandhangan and pasangan cannot. */
export function isTraceable(glyphId: string): boolean {
  return nglegenaById(glyphId) !== null;
}
