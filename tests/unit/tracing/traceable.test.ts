import { describe, expect, test } from "vitest";
import { nglegena } from "../../../src/engine/index.ts";
import { isTraceable } from "../../../src/features/tracing/traceable.ts";

describe("[P-B20] isTraceable", () => {
  test("all 20 base letters are traceable", () => {
    expect(nglegena).toHaveLength(20);
    for (const letter of nglegena) {
      expect(isTraceable(letter.id), letter.id).toBe(true);
    }
  });

  test.each(["wulu", "naMurda", "a", "pasangan-ha", "angka-1", "nope"])(
    "%s is not traceable",
    (id) => {
      expect(isTraceable(id)).toBe(false);
    },
  );
});
