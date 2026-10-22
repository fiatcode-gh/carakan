<script lang="ts">
  import type { Snippet } from "svelte";
  import AksaraText from "./AksaraText.svelte";
  import Reading from "./Reading.svelte";

  interface Props {
    /** Aksara string, built from engine or content data, never typed. */
    glyph: string;
    /** Latin name under the glyph; omit to show the glyph alone. */
    name?: string;
    /** Accessible name of a glyph-only card. */
    label?: string;
    compact?: boolean;
    children?: Snippet;
  }

  let { glyph, name, label, compact = false, children }: Props = $props();
</script>

<div
  class={["flashcard", compact && "flashcard--compact"]}
  role={name === undefined ? "img" : undefined}
  aria-label={name === undefined ? label : undefined}
>
  <p class="flashcard__glyph">
    <AksaraText
      text={glyph}
      size={compact ? "xl" : "hero"}
      aria-hidden="true"
    />
  </p>
  {#if name !== undefined}
    <span class="flashcard__rule"></span>
    <h2 class="flashcard__name"><Reading text={name} /></h2>
  {/if}
  {@render children?.()}
</div>

<style>
  .flashcard {
    position: relative;
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    padding: var(--space-7) var(--space-6) var(--space-6);
    border: var(--border);
    background: var(--color-card);
    box-shadow: var(--shadow-tile);
    text-align: center;
  }

  /* A thin inner frame, like the ruled margin of a manuscript leaf. */
  .flashcard::before {
    content: "";
    position: absolute;
    inset: var(--space-2);
    border: 1px solid var(--color-neutral);
    pointer-events: none;
  }

  .flashcard__glyph {
    min-height: 11rem;
    display: grid;
    align-items: center;
    line-height: 1.5;
  }

  .flashcard__rule {
    width: 6rem;
    height: 2px;
    background: var(--color-ink);
  }

  .flashcard__name {
    font-size: var(--text-2xl);
    font-weight: var(--weight-black);
    line-height: var(--leading-tight);
  }

  .flashcard--compact {
    padding-block: var(--space-6);
  }

  .flashcard--compact .flashcard__glyph {
    min-height: 0;
    line-height: 1.7;
  }
</style>
