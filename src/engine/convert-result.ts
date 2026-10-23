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

/** Half-open range [start, end) in UTF-16 code units. */
export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

/** One written cluster of a Latin -> aksara output. */
export interface AksaraCluster {
  /** Range of `output` the cluster occupies. */
  readonly output: TextSpan;
  /**
   * Ranges of the input that produced the cluster: ascending, disjoint,
   * non-adjacent and non-empty. Offsets are into the exact string passed to
   * `toAksara`.
   */
  readonly sources: readonly TextSpan[];
}

/** A Latin -> aksara success: `output` split into its written clusters. */
export interface ToAksaraSuccess extends ConvertSuccess {
  /** Cover `output` in order; empty when `output` is empty. */
  readonly clusters: readonly AksaraCluster[];
}

/** A plain `e` the caller must resolve (spec 6.2). */
export interface BareE {
  /** UTF-16 offset of the `e` in the input. */
  readonly index: number;
  /** The word that holds it. */
  readonly word: TextSpan;
}

/** Ambiguous Latin -> aksara input; every candidate carries its clusters. */
export interface ToAksaraAmbiguous extends ConvertAmbiguous {
  readonly candidates: readonly ToAksaraSuccess[];
  /** Every plain e of the input, ascending; empty when only ai/au is ambiguous. */
  readonly bareE: readonly BareE[];
}

export type ToAksaraResult = ToAksaraSuccess | ToAksaraAmbiguous | ConvertError;
