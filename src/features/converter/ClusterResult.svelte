<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import type { AksaraCluster } from "../../engine/index.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import {
    clusterAt,
    clusterBoxes,
    type Box,
    type ClusterBox,
  } from "./cluster-geometry.ts";

  interface Props {
    output: string;
    clusters: readonly AksaraCluster[];
    labels: readonly string[];
    selected: number | null;
    onselect: (index: number) => void;
  }

  let { output, clusters, labels, selected, onselect }: Props = $props();

  const { t } = getI18n();
  const uid = $props.id();
  const hintId = `cluster-hint-${uid}`;

  let wrapper = $state<HTMLDivElement>();
  let boxes = $state<readonly ClusterBox[]>([]);
  let em = $state(0);

  function measure(): void {
    if (!wrapper) return;
    const aksara = wrapper.querySelector(".aksara");
    const text = aksara?.firstChild;
    if (!(text instanceof Text)) {
      boxes = [];
      return;
    }
    em = parseFloat(getComputedStyle(aksara!).fontSize);
    const origin = wrapper.getBoundingClientRect();
    const range = document.createRange();
    const glyphs: Box[] = clusters.map((c) => {
      range.setStart(text, c.output.start);
      range.setEnd(text, c.output.end);
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      return {
        x: rect.x - origin.x,
        y: rect.y - origin.y,
        width: rect.width,
        height: rect.height,
      };
    });
    boxes = clusterBoxes(glyphs, {
      width: origin.width,
      height: origin.height,
    });
  }

  // Re-measure on a new output; resizes (and the keep-alive tab showing
  // again) are caught by the observer, a late font by fonts.ready.
  $effect(() => {
    void output;
    void clusters;
    measure();
  });

  $effect(() => {
    if (!wrapper) return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  });

  // The mark covers Jejeg's extent, 1.32 em above to 0.88 em below the
  // baseline (hhea 3300/-2200 per 2500), so a pasangan or suku stays inside.
  // A Range rect is a content area, but engines differ in whose: Chromium
  // uses the primary font (MPLUS Rounded 1c, hhea 1075/-320 per 1000),
  // Firefox the font that draws the glyphs (Jejeg). The rect height tells
  // which, and that font's descent locates the baseline.
  const mplusAscent = 1.075;
  const mplusDescent = 0.32;
  const jejegAscent = 1.32;
  const jejegDescent = 0.88;
  const mark = $derived.by(() => {
    const glyph = selected === null ? undefined : boxes[selected]?.glyph;
    if (!glyph || em === 0) return undefined;
    const midway =
      (mplusAscent + mplusDescent + jejegAscent + jejegDescent) / 2;
    const descent = glyph.height / em > midway ? jejegDescent : mplusDescent;
    const baseline = glyph.y + glyph.height - descent * em;
    return {
      ...glyph,
      y: baseline - jejegAscent * em,
      height: (jejegAscent + jejegDescent) * em,
    };
  });

  function onclick(event: MouseEvent): void {
    const target = event.target as Element;
    const button = target.closest<HTMLElement>(".cluster-result__hit");
    if (button) {
      onselect(Number(button.dataset["index"]));
      return;
    }
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      wrapper?.contains(selection.anchorNode)
    ) {
      return;
    }
    if (!wrapper) return;
    const origin = wrapper.getBoundingClientRect();
    const index = clusterAt(
      boxes,
      event.clientX - origin.x,
      event.clientY - origin.y,
    );
    if (index !== null) onselect(index);
  }
</script>

<!-- The keyboard path is the hit buttons; the wrapper click is the pointer path. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="cluster-result" bind:this={wrapper} {onclick}>
  {#if mark}
    <span
      class="cluster-result__mark"
      aria-hidden="true"
      style:left="{mark.x}px"
      style:top="{mark.y}px"
      style:width="{mark.width}px"
      style:height="{mark.height}px"
    ></span>
  {/if}
  <AksaraText text={output} size="lg" />
  <div class="cluster-result__hits" role="group" aria-labelledby={hintId}>
    {#each clusters as _, index (index)}
      {@const box = boxes[index]?.hit}
      <button
        type="button"
        class="cluster-result__hit"
        data-index={index}
        aria-label={labels[index]}
        aria-pressed={selected === index}
        style:left="{box?.x ?? 0}px"
        style:top="{box?.y ?? 0}px"
        style:width="{box?.width ?? 0}px"
        style:height="{box?.height ?? 0}px"
      ></button>
    {/each}
  </div>
</div>
<p class="cluster-result__hint" id={hintId}>{$t("clusterHint")}</p>

<style>
  .cluster-result {
    display: grid;
    position: relative;
    isolation: isolate;
    cursor: pointer;
  }

  .cluster-result__mark {
    position: absolute;
    z-index: -1;
    pointer-events: none;
    background: var(--color-butter);
    box-shadow: inset 0 -3px 0 var(--color-ink);
  }

  .cluster-result__hits {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Never takes pointer events: long-press text selection must keep working. */
  .cluster-result__hit {
    position: absolute;
    pointer-events: none;
    border: 0;
    padding: 0;
    background: transparent;
  }

  .cluster-result__hint {
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
  }
</style>
