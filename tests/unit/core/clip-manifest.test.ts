import { describe, expect, test } from "vitest";
import { parseClipManifest } from "../../../src/core/audio/clip-manifest.ts";

const manifest = (clips: unknown, version: unknown = 1) =>
  JSON.stringify({ version, clips });

describe("parseClipManifest [P-S11]", () => {
  test("an empty manifest has no clips", () => {
    expect(parseClipManifest(manifest({})).size).toBe(0);
  });

  test("a valid entry is kept", () => {
    const clips = parseClipManifest(manifest({ pa: "audio/pa.opus" }));
    expect(clips.get("pa")).toBe("audio/pa.opus");
  });

  test.each([
    "../x.mp3",
    "https://e.x/a.mp3",
    "/audio/a.mp3",
    "audio/a.exe",
    "audio/sub/a.mp3",
    "audio/../a.mp3",
  ])("the path %s rejects the whole manifest", (path) => {
    expect(() =>
      parseClipManifest(manifest({ ok: "audio/ok.mp3", bad: path })),
    ).toThrow(Error);
  });

  test("another version is rejected", () => {
    expect(() => parseClipManifest(manifest({}, 2))).toThrow(Error);
  });

  test.each([null, [], "x", 3])("clips %j is rejected", (clips) => {
    expect(() => parseClipManifest(manifest(clips))).toThrow(Error);
  });

  test("an empty key is rejected", () => {
    expect(() => parseClipManifest(manifest({ "": "audio/a.mp3" }))).toThrow(
      Error,
    );
  });

  test("text that is not JSON is rejected", () => {
    expect(() => parseClipManifest("nope")).toThrow(Error);
  });
});
