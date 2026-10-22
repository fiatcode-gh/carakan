<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import {
    accentVar,
    type UnitAccent,
  } from "../features/lessons/unit-display.ts";
  import AksaraText from "./AksaraText.svelte";
  import Reading from "./Reading.svelte";

  interface Props extends Omit<HTMLButtonAttributes, "children"> {
    /** Aksara string, built from engine or content data, never typed. */
    glyph: string;
    /** Latin name on the label strip; the accessible name of the tile. */
    name: string;
    /** Unit colour of the label strip; null (no unit teaches it) is neutral. */
    accent: UnitAccent | null;
  }

  /** Longer names (pasangan nya, pa cerek (rě)) get a smaller strip face to fit. */
  const LONG_NAME = 7;

  let { glyph, name, accent, class: className, ...rest }: Props = $props();
</script>

<button
  {...rest}
  type="button"
  class={["aksara-tile", "press", className]}
  style:--accent={accentVar(accent)}
>
  <span class="aksara-tile__glyph">
    <AksaraText text={glyph} aria-hidden="true" />
  </span>
  <span
    class={[
      "aksara-tile__strip",
      name.length > LONG_NAME && "aksara-tile__strip--long",
    ]}
  >
    <Reading text={name} />
  </span>
</button>

<style>
  .aksara-tile {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: var(--tile-height);
    padding: 0;
    overflow: hidden;
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    text-align: center;
  }

  .aksara-tile__glyph {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .aksara-tile__glyph :global(.aksara) {
    font-size: var(--aksara-tile);
  }

  .aksara-tile__strip {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    height: var(--tile-strip);
    padding-inline: var(--space-1);
    background: var(--accent);
    border-top: var(--border);
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    line-height: 1;
    white-space: nowrap;
  }

  .aksara-tile__strip--long {
    padding-inline: 0;
    font-size: var(--text-caption);
    letter-spacing: -0.02em;
  }

  .aksara-tile__strip :global(.reading) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
