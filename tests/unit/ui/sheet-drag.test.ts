import { describe, expect, test } from "vitest";
import { closesSheet, releaseVelocity } from "../../../src/ui/sheet-drag.ts";

describe("closesSheet", () => {
  test("[P-C03] a slow release closes the sheet only past a quarter of its height", () => {
    expect(closesSheet({ distance: 99, height: 400, velocity: 0 })).toBe(false);
    expect(closesSheet({ distance: 101, height: 400, velocity: 0 })).toBe(true);
  });

  test("[P-C03] a fast downward fling closes it after a short drag", () => {
    expect(closesSheet({ distance: 40, height: 400, velocity: 1.2 })).toBe(
      true,
    );
  });

  test("[P-C03] a twitch of the hand is not a fling, however fast", () => {
    expect(closesSheet({ distance: 8, height: 400, velocity: 3 })).toBe(false);
  });

  test("[P-C03] a drag that reversed upward (negative velocity) springs back", () => {
    expect(closesSheet({ distance: 60, height: 400, velocity: -2 })).toBe(
      false,
    );
  });
});

describe("releaseVelocity", () => {
  test("[P-C03] is the speed over the last 100 ms before the release, in px per ms", () => {
    const samples = [
      { y: 0, t: 0 },
      { y: 10, t: 100 },
      { y: 50, t: 150 },
      { y: 90, t: 190 },
    ];
    // 80 px over 90 ms: the sample at t = 100 is the oldest within the window.
    expect(releaseVelocity(samples, 190)).toBeCloseTo(80 / 90);
  });

  test("[P-C03] a pause before the release leaves no speed", () => {
    const samples = [
      { y: 0, t: 0 },
      { y: 60, t: 40 },
    ];
    expect(releaseVelocity(samples, 400)).toBe(0);
  });

  test("[P-C03] one sample, or samples at one instant, have no speed", () => {
    expect(releaseVelocity([{ y: 5, t: 10 }], 20)).toBe(0);
    expect(
      releaseVelocity(
        [
          { y: 5, t: 10 },
          { y: 90, t: 10 },
        ],
        20,
      ),
    ).toBe(0);
  });
});
