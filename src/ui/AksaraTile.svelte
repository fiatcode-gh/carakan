<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { accentVar, type UnitAccent } from "./accent.ts";
  import AksaraText from "./AksaraText.svelte";
  import Reading from "./Reading.svelte";

  interface Props extends Omit<HTMLButtonAttributes, "children"> {
    /** Aksara string, built from engine or content data, never typed. */
    glyph: string;
    /** Latin name; the accessible name of the tile, and the strip text unless `label` is set. */
    name: string;
    /** A shorter text for the label strip; the tile is still named by `name`. */
    label?: string;
    /** Unit colour of the label strip; null (no unit teaches it) is neutral. */
    accent: UnitAccent | null;
    /** The glyph hangs deep below its baseline (pasangan): it gets room underneath. */
    stacked?: boolean;
  }

  /** Longer texts (pa cerek (rě) panjang) get a smaller strip face to fit. */
  const LONG_NAME = 7;

  let {
    glyph,
    name,
    label,
    accent,
    stacked = false,
    class: className,
    ...rest
  }: Props = $props();

  const shown = $derived(label ?? name);
</script>

<button
  {...rest}
  type="button"
  aria-label={label === undefined ? undefined : name}
  class={["aksara-tile", stacked && "aksara-tile--stacked", "press", className]}
  style:--accent={accentVar(accent)}
>
  <span class="aksara-tile__glyph">
    <AksaraText text={glyph} aria-hidden="true" />
  </span>
  <span
    class={[
      "aksara-tile__strip",
      shown.length > LONG_NAME && "aksara-tile__strip--long",
    ]}
  >
    <Reading text={shown} />
  </span>
</button>

<style>
  /*
   * Two rows (glyph, strip) of the parent grid, shared through a subgrid: the
   * strips of one row of tiles are as tall as the longest label needs, and
   * stay level, while a short label does not shrink the glyph room.
   */
  .aksara-tile {
    display: grid;
    grid-row: span 2;
    grid-template-rows: subgrid;
    row-gap: 0;
    width: 100%;
    padding: 0;
    overflow: hidden;
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    text-align: center;
  }

  .aksara-tile__glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tile-glyph);
  }

  .aksara-tile__glyph :global(.aksara) {
    font-size: var(--aksara-tile);
  }

  /* Pasangan tails reach below the line box; the room lifts the glyph clear of the strip. */
  .aksara-tile--stacked .aksara-tile__glyph :global(.aksara) {
    padding-block-end: var(--aksara-room);
    line-height: 1.25;
  }

  .aksara-tile__strip {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tile-strip);
    padding: var(--space-1);
    background: var(--accent);
    border-top: var(--border);
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    line-height: 1.1;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .aksara-tile__strip--long {
    padding-inline: 2px;
    font-size: var(--text-caption);
    letter-spacing: -0.02em;
  }

  .aksara-tile__strip :global(.reading) {
    min-width: 0;
    text-wrap: balance;
  }
</style>
