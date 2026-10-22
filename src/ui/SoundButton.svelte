<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import type { ClipPlayer } from "../core/audio/clip-player.ts";
  import { getI18n } from "../l10n/context.ts";
  import Icon from "./Icon.svelte";
  import Toast from "./Toast.svelte";

  interface Props {
    player: ClipPlayer;
    /** Reading text the clip is listed under in `audio/clips.json`. */
    clipKey: string;
    /** Accessible name of the icon-only button. */
    label: string;
    size?: "md" | "lg";
    /** Wide button with icon and this text; it names the button. */
    text?: string;
  }

  let { player, clipKey, label, size = "md", text }: Props = $props();

  const { t } = getI18n();
  const playingKey = $derived(player.playing);
  const playing = $derived($playingKey === clipKey);

  // The counter keys the toast, so each tap restarts its timer.
  let taps = $state(0);
  let notice = $state(false);

  async function tap(): Promise<void> {
    if ((await player.play(clipKey)) === "unavailable") {
      taps++;
      notice = true;
    } else {
      notice = false;
    }
  }

  // The button can go (next step, closed sheet) while its clip plays.
  onDestroy(() => {
    if (get(player.playing) === clipKey) player.stop();
  });
</script>

<button
  type="button"
  class={[
    "sound",
    "press",
    `sound--${size}`,
    text !== undefined && "sound--text",
  ]}
  data-state={playing ? "playing" : "idle"}
  aria-label={text === undefined ? label : undefined}
  onclick={tap}
>
  <Icon name={playing ? "audio-lines" : "volume-2"} />
  {#if text !== undefined}{text}{/if}
</button>
{#if notice}
  {#key taps}
    <span class="notice">
      <Toast onclose={() => (notice = false)}>{$t("audioComingSoon")}</Toast>
    </span>
  {/key}
{/if}

<style>
  .sound {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-width: var(--touch-min);
    min-height: var(--touch-min);
    padding: 0;
    border: var(--border);
    background: var(--color-butter);
    color: var(--color-ink);
    font-family: inherit;
    font-size: var(--text-button);
    font-weight: var(--weight-black);
    transition:
      translate var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out);
  }

  .notice {
    display: contents;
  }

  /* Lesson and trace screens end in a PrimaryBar; keep it tappable. */
  :global(body[data-chrome="none"]) .notice :global(.toast) {
    bottom: calc(var(--bar-height) + var(--space-5));
  }

  .sound--lg {
    width: var(--sound-button-lg);
    height: var(--sound-button-lg);
  }

  .sound--md {
    height: var(--touch-min);
  }

  .sound--text {
    width: auto;
    height: 48px;
    padding-inline: var(--space-5);
  }

  .sound[data-state="playing"] {
    background: var(--color-ink);
    color: var(--color-on-ink);
  }
</style>
