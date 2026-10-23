/** One pointer position during a drag: `y` in CSS px, `t` in ms. */
export interface Sample {
  readonly y: number;
  readonly t: number;
}

/** A slow release closes the sheet once it was dragged past this share of its height. */
export const CLOSE_FRACTION = 0.25;

/** A downward release at least this fast (px per ms) is a fling that closes the sheet. */
export const FLING_VELOCITY = 0.5;

/** A fling needs at least this much travel (px), so a twitch of the hand is not one. */
export const FLING_MIN_DISTANCE = 24;

/** Only the motion this close to the release (ms) says how fast it ended. */
const VELOCITY_WINDOW = 100;

/**
 * Speed of the pointer at release, px per ms, positive downward. A pointer
 * that paused before letting go has none.
 */
export function releaseVelocity(
  samples: readonly Sample[],
  releasedAt: number,
): number {
  const recent = samples.filter((s) => releasedAt - s.t <= VELOCITY_WINDOW);
  const first = recent[0];
  const last = recent.at(-1);
  if (first === undefined || last === undefined) return 0;
  const elapsed = last.t - first.t;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

/** Whether releasing a drag of `distance` px closes a sheet `height` px tall. */
export function closesSheet({
  distance,
  height,
  velocity,
}: {
  distance: number;
  height: number;
  velocity: number;
}): boolean {
  return (
    distance > height * CLOSE_FRACTION ||
    (distance >= FLING_MIN_DISTANCE && velocity >= FLING_VELOCITY)
  );
}
