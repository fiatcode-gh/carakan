import { describe, expect, it } from "vitest";
import {
  PAD_HEIGHT_PX,
  padSize,
} from "../../../src/features/tracing/pad-size.ts";
import { PAD } from "./support/pad.ts";

describe("[P-B20] padSize", () => {
  it("keeps scale 1 on the phone pad at any phone width", () => {
    expect(padSize(320, 336)).toEqual({ width: 320, height: 336, scale: 1 });
    expect(padSize(354, 336)).toEqual({ width: 354, height: 336, scale: 1 });
  });

  it("magnifies a taller pad back to the phone pad's logical height", () => {
    expect(padSize(400, 420)).toEqual({ width: 320, height: 336, scale: 1.25 });
    expect(padSize(PAD.width * 1.5, PAD.height * 1.5)).toEqual({
      width: PAD.width,
      height: PAD.height,
      scale: 1.5,
    });
  });

  it("ties the logical height to the fixture's pad", () => {
    expect(PAD_HEIGHT_PX).toBe(PAD.height);
  });

  it("reports an unlaid pad as empty at scale 1", () => {
    expect(padSize(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
    expect(padSize(320, 0)).toEqual({ width: 0, height: 0, scale: 1 });
  });
});
