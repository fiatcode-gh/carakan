/** The phone pad's inner height (340px less its 2px borders): the pad's logical height at every size. */
export const PAD_HEIGHT_PX = 336;

export interface PadSize {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

/**
 * The pad's logical size. A taller pad is the phone pad magnified by
 * `scale`, so glyph layout, ink and the judge work on the phone's pixels.
 */
export function padSize(clientWidth: number, clientHeight: number): PadSize {
  if (clientWidth === 0 || clientHeight === 0) {
    return { width: 0, height: 0, scale: 1 };
  }
  const scale = clientHeight / PAD_HEIGHT_PX;
  return {
    width: Math.round(clientWidth / scale),
    height: PAD_HEIGHT_PX,
    scale,
  };
}
