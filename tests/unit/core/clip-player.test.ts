import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import {
  ClipPlayer,
  type AudioLike,
} from "../../../src/core/audio/clip-player.ts";

type Type = "ended" | "pause" | "error";

class FakeAudio implements AudioLike {
  currentTime = 0;
  paused = 0;
  readonly listeners = new Map<Type, Set<() => void>>();
  #resolve!: () => void;
  #reject!: (e: Error) => void;
  readonly started = new Promise<void>((resolve, reject) => {
    this.#resolve = resolve;
    this.#reject = reject;
  });
  readonly path: string;
  constructor(path: string) {
    this.path = path;
  }
  play() {
    return this.started;
  }
  pause() {
    this.paused++;
    this.emit("pause");
  }
  addEventListener(type: Type, listener: () => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: Type, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: Type) {
    for (const l of [...(this.listeners.get(type) ?? [])]) l();
  }
  count() {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
  start() {
    this.#resolve();
  }
  fail() {
    this.#reject(new Error("blocked"));
  }
}

function setup(manifests: (() => Promise<string>)[] | string) {
  const audios: FakeAudio[] = [];
  let loads = 0;
  const player = new ClipPlayer({
    loadManifest: () => {
      loads++;
      return typeof manifests === "string"
        ? Promise.resolve(manifests)
        : manifests[Math.min(loads, manifests.length) - 1]!();
    },
    createAudio: (path) => {
      const audio = new FakeAudio(path);
      audios.push(audio);
      return audio;
    },
  });
  return { player, audios, loads: () => loads };
}

const json = (clips: Record<string, string>) =>
  JSON.stringify({ version: 1, clips });

/** Lets queued microtasks (manifest load, play call) run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("ClipPlayer [P-S11]", () => {
  test("a key without a clip is unavailable and creates no audio", async () => {
    const { player, audios } = setup(json({}));
    expect(await player.play("pa")).toBe("unavailable");
    expect(audios).toHaveLength(0);
    expect(get(player.playing)).toBeNull();
  });

  test("a listed clip plays, then ended clears the playing key", async () => {
    const { player, audios } = setup(json({ pa: "audio/pa.wav" }));
    const result = player.play("pa");
    await tick();
    audios[0]!.start();
    expect(await result).toBe("playing");
    expect(audios[0]!.path).toBe("audio/pa.wav");
    expect(get(player.playing)).toBe("pa");
    audios[0]!.emit("ended");
    expect(get(player.playing)).toBeNull();
  });

  test("a second play pauses the first and listens only to the new audio", async () => {
    const { player, audios } = setup(
      json({ pa: "audio/pa.wav", ha: "audio/ha.wav" }),
    );
    const first = player.play("pa");
    await tick();
    audios[0]!.start();
    await first;
    const second = player.play("ha");
    await tick();
    audios[1]!.start();
    await second;
    expect(audios[0]!.paused).toBe(1);
    expect(audios[0]!.count()).toBe(0);
    expect(get(player.playing)).toBe("ha");
    audios[0]!.emit("ended");
    expect(get(player.playing)).toBe("ha");
  });

  test("a rejected play is unavailable and not playing", async () => {
    const { player, audios } = setup(json({ pa: "audio/pa.wav" }));
    const result = player.play("pa");
    await tick();
    audios[0]!.fail();
    expect(await result).toBe("unavailable");
    expect(get(player.playing)).toBeNull();
  });

  test("an error event clears the playing key", async () => {
    const { player, audios } = setup(json({ pa: "audio/pa.wav" }));
    const result = player.play("pa");
    await tick();
    audios[0]!.start();
    await result;
    audios[0]!.emit("error");
    expect(get(player.playing)).toBeNull();
  });

  test("stop pauses the current clip", async () => {
    const { player, audios } = setup(json({ pa: "audio/pa.wav" }));
    const result = player.play("pa");
    await tick();
    audios[0]!.start();
    await result;
    player.stop();
    expect(get(player.playing)).toBeNull();
    expect(audios[0]!.paused).toBe(1);
  });

  test("a failed manifest load is unavailable and retried on the next play", async () => {
    const { player, audios, loads } = setup([
      () => Promise.reject(new Error("offline")),
      () => Promise.resolve(json({ pa: "audio/pa.wav" })),
    ]);
    expect(await player.play("pa")).toBe("unavailable");
    const result = player.play("pa");
    await tick();
    audios[0]!.start();
    expect(await result).toBe("playing");
    expect(loads()).toBe(2);
  });

  test("the manifest loads once after a success", async () => {
    const { player, loads } = setup(json({}));
    await player.play("a");
    await player.play("b");
    expect(loads()).toBe(1);
  });

  test("an invalid manifest is unavailable", async () => {
    const { player, audios } = setup(json({ pa: "https://e.x/a.mp3" }));
    expect(await player.play("pa")).toBe("unavailable");
    expect(audios).toHaveLength(0);
  });
});
