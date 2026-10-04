/**
 * Result of a conversion. The engine never silently guesses: ambiguity and
 * failure are explicit values (spec section 6.2).
 */
export type ConvertResult = ConvertSuccess | ConvertAmbiguous | ConvertError;

/** Conversion succeeded; `output` is the full converted string. */
export interface ConvertSuccess {
  readonly kind: "success";
  readonly output: string;
}

/**
 * Input is ambiguous; `candidates` holds every interpretation the ruleset
 * allows. The UI decides which to present (converter disambiguation toggle).
 */
export interface ConvertAmbiguous {
  readonly kind: "ambiguous";
  readonly input: string;
  readonly candidates: readonly ConvertSuccess[];
  readonly reason: string;
}

/** Input is not convertible; `index` points at the offending position. */
export interface ConvertError {
  readonly kind: "error";
  readonly input: string;
  readonly index: number;
  readonly message: string;
}
