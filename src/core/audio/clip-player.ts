import { writable, type Readable } from "svelte/store";
import { parseClipManifest } from "./clip-manifest.ts";

type AudioEvent = "ended" | "pause" | "error";

/** The part of `HTMLAudioElement` the player uses. */
export interface AudioLike {
  play(): Promise<void>;
  pause(): void;
  currentTime: number;
  addEventListener(type: AudioEvent, listener: () => void): void;
  removeEventListener(type: AudioEvent, listener: () => void): void;
}

interface Deps {
  loadManifest: () => Promise<string>;
  createAudio: (path: string) => AudioLike;
}

const events: readonly AudioEvent[] = ["ended", "pause", "error"];

/**
 * Plays the recorded clip of a reading, one at a time. The manifest loads
 * lazily; a failed load is retried by the next `play`.
 */
export class ClipPlayer {
  readonly #deps: Deps;
  readonly #playing = writable<string | null>(null);
  #manifest: Promise<ReadonlyMap<string, string>> | null = null;
  #current: { audio: AudioLike; detach: () => void } | null = null;
  #request = 0;

  /** Key of the clip that is playing, null when idle. */
  readonly playing: Readable<string | null> = {
    subscribe: this.#playing.subscribe,
  };

  constructor(deps: Deps) {
    this.#deps = deps;
  }

  #clips(): Promise<ReadonlyMap<string, string>> {
    if (this.#manifest === null) {
      const loading = this.#deps.loadManifest().then(parseClipManifest);
      this.#manifest = loading;
      loading.catch(() => {
        if (this.#manifest === loading) this.#manifest = null;
      });
    }
    return this.#manifest;
  }

  /**
   * "unavailable" when the reading has no clip or the clip cannot play. A play
   * replaced by a later one resolves "playing" without touching the state.
   */
  async play(key: string): Promise<"playing" | "unavailable"> {
    this.stop();
    const request = this.#request;
    let path: string | undefined;
    try {
      path = (await this.#clips()).get(key);
    } catch {
      return "unavailable";
    }
    if (request !== this.#request) return "playing";
    if (path === undefined) return "unavailable";

    const audio = this.#deps.createAudio(path);
    const clear = () => {
      if (this.#current?.audio === audio) this.#clear();
    };
    for (const type of events) audio.addEventListener(type, clear);
    const detach = () => {
      for (const type of events) audio.removeEventListener(type, clear);
    };
    this.#current = { audio, detach };
    try {
      await audio.play();
    } catch {
      if (this.#current?.audio === audio) this.#clear();
      return "unavailable";
    }
    if (request !== this.#request) return "playing";
    this.#playing.set(key);
    return "playing";
  }

  stop(): void {
    this.#request++;
    const current = this.#current;
    if (current === null) return;
    this.#clear();
    current.audio.pause();
  }

  #clear(): void {
    this.#current?.detach();
    this.#current = null;
    this.#playing.set(null);
  }
}
