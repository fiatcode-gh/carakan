<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import AksaraText from "./AksaraText.svelte";

  interface Props extends Omit<HTMLButtonAttributes, "children"> {
    /** Aksara string, built from engine or content data, never typed. */
    glyph: string;
    /** Latin name; the accessible name of the tile. */
    name: string;
  }

  let { glyph, name, class: className, ...rest }: Props = $props();
</script>

<button {...rest} type="button" class={["glyph-tile", className]}>
  <AksaraText text={glyph} aria-hidden="true" />
  <span class="glyph-tile__name">{name}</span>
</button>

<style>
  .glyph-tile {
    display: grid;
    justify-items: center;
    align-content: center;
    width: 100%;
    min-height: 5.25rem;
    padding: var(--space-1) var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-slip);
    color: var(--color-text);
    text-align: center;
  }

  .glyph-tile:active {
    background: var(--color-surface-sunken);
  }

  .glyph-tile__name {
    max-width: 100%;
    margin-top: var(--space-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    line-height: 1.2;
  }
</style>
