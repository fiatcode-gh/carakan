<script lang="ts">
  import type { Snippet } from "svelte";
  import type { GlyphInfo } from "../../content/glyph-info-table.ts";
  import { getI18n } from "../../l10n/context.ts";
  import type { MessageKey } from "../../l10n/i18n.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import PrimaryBar from "../../ui/PrimaryBar.svelte";
  import Reading from "../../ui/Reading.svelte";
  import SegmentedProgress from "../../ui/SegmentedProgress.svelte";
  import { accentVar, type UnitAccent } from "../../ui/accent.ts";
  import TracingPad, { type Point } from "./TracingPad.svelte";

  interface Props {
    glyph: GlyphInfo;
    /** Unit colour of the header; null (no unit teaches the glyph) is neutral. */
    accent: UnitAccent | null;
    /** `x` when the screen closes an activity rather than going back a page. */
    backIcon?: "chevron-left" | "x";
    onback: () => void;
    onfinish: () => void;
    /** The sound button, placed by the caller. */
    sound?: Snippet;
  }

  const PASSES = 3;

  let {
    glyph,
    accent,
    backIcon = "chevron-left",
    onback,
    onfinish,
    sound,
  }: Props = $props();

  const { t } = getI18n();

  let pad = $state<ReturnType<typeof TracingPad>>();
  let strokes = $state<Point[][]>([]);
  let passes = $state(0);
  let message = $state<MessageKey | null>(null);
  // A check is in flight: a second tap must not score the same ink twice.
  let checking = false;

  async function check(): Promise<void> {
    if (checking) return;
    if (strokes.length === 0) {
      message = "traceEmpty";
      return;
    }
    checking = true;
    try {
      const result = await pad!.score();
      if (result.passed) {
        passes += 1;
        pad!.clear();
        message = passes === PASSES ? "tracePassLast" : "tracePass";
      } else {
        message = "traceFail";
      }
    } finally {
      checking = false;
    }
  }

  function clear(): void {
    pad!.clear();
    message = null;
  }
</script>

<div class="trace" style:--accent={accentVar(accent)}>
  <header class="trace__head">
    <span class="trace__watermark aksara" lang="jv-Java" aria-hidden="true"
      >{glyph.char}</span
    >
    <div class="trace__bar">
      <IconButton
        icon={backIcon}
        label={$t("backButton")}
        tone="paper"
        onclick={onback}
      />
      <div class="trace__progress">
        <SegmentedProgress
          segmented={false}
          value={passes}
          max={PASSES}
          label={$t("traceSlotsLabel", { count: passes })}
        />
      </div>
      <span class="trace__count">{passes}/{PASSES}</span>
    </div>
    <div class="trace__title">
      <div>
        <p class="eyebrow trace__eyebrow">{$t("traceEyebrow")}</p>
        <p class="trace__reading"><Reading text={glyph.pujl} /></p>
      </div>
      {@render sound?.()}
    </div>
  </header>

  <div class="trace__body">
    <!-- The result sits above the pad, where the sticky bar cannot cover it. -->
    <div class="trace__hint">
      <div class="trace__note">
        <div class="trace__guide" data-replaced={message !== null}>
          <HandNote tilt>{$t("traceHint")}</HandNote>
        </div>
        <p class="trace__status" role="status" aria-live="polite">
          {#if message !== null}{$t(message)}{/if}
        </p>
      </div>
      <Button variant="quiet" onclick={onfinish}>{$t("traceSkip")}</Button>
    </div>

    <div class="trace__pad">
      <TracingPad
        bind:this={pad}
        bind:strokes
        char={glyph.char}
        label={$t("tracePadLabel", { name: glyph.name })}
      />
    </div>

    <ul
      class="trace__slots"
      aria-label={$t("traceSlotsLabel", { count: passes })}
    >
      {#each { length: PASSES } as _, index}
        <li class="slot" data-done={index < passes}>
          {#if index < passes}
            <AksaraText text={glyph.char} size="md" aria-hidden="true" />
          {/if}
        </li>
      {/each}
    </ul>
  </div>

  <PrimaryBar
    secondary={{ label: $t("traceClear"), onclick: clear }}
    primary={passes === PASSES
      ? {
          label: $t("continueButton"),
          onclick: onfinish,
          autofocus: true,
        }
      : {
          label: $t("traceCheck"),
          onclick: () => void check(),
          autofocus: true,
        }}
  />
</div>

<style>
  /* Bleeds out of the page padding: the header and the bar span the column. */
  .trace {
    display: flex;
    flex-direction: column;
    min-height: var(--screen-min-height);
    margin: calc(-1 * var(--space-4)) calc(-1 * var(--gutter))
      calc(-1 * var(--space-9));
  }

  .trace__head {
    position: relative;
    display: grid;
    gap: 14px;
    padding: var(--gutter);
    overflow: hidden;
    border-bottom: var(--border);
    background: var(--accent);
  }

  .trace__watermark {
    position: absolute;
    inset-inline-end: -10px;
    bottom: -50px;
    font-size: 170px;
    line-height: 1;
    opacity: 0.22;
    pointer-events: none;
  }

  .trace__bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .trace__progress {
    flex: 1;
  }

  .trace__count {
    font-size: var(--text-button);
    font-weight: var(--weight-black);
  }

  .trace__title {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .trace__eyebrow,
  .trace__reading {
    margin: 0;
  }

  .trace__reading {
    font-size: 56px;
    font-weight: var(--weight-black);
    line-height: 0.9;
    letter-spacing: var(--tracking-title);
  }

  .trace__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    padding: 20px var(--gutter) var(--space-4);
  }

  .trace__hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* The hint and the result share one cell: the result covers the hint. */
  .trace__note {
    display: grid;
    flex: 1;
    align-items: center;
    min-width: 0;
  }

  .trace__note > * {
    grid-area: 1 / 1;
  }

  .trace__guide[data-replaced="true"] {
    visibility: hidden;
  }

  .trace__slots {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .slot {
    display: grid;
    place-items: center;
    height: 70px;
    box-sizing: border-box;
    border: var(--border-dashed);
    background: var(--color-card);
  }

  .slot[data-done="true"] {
    border: var(--border);
  }

  .slot :global(.aksara) {
    padding-block-end: var(--aksara-room);
    line-height: 1.25;
  }

  .trace__status {
    margin: 0;
    font-weight: var(--weight-bold);
  }

  .trace__pad {
    display: contents;
  }

  @media (min-width: 48rem) {
    .trace__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 6rem;
      grid-template-rows: auto minmax(340px, 1fr);
      grid-template-areas:
        "hint hint"
        "pad slots";
    }

    .trace__hint {
      grid-area: hint;
    }

    .trace__pad {
      grid-area: pad;
      display: grid;
      place-items: center;
      container-type: size;
    }

    .trace__slots {
      grid-area: slots;
      grid-template-columns: 1fr;
      align-content: start;
    }
  }
</style>
