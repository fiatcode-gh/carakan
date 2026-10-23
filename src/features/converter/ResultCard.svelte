<script lang="ts">
  import type { Snippet } from "svelte";
  import Surface from "../../ui/Surface.svelte";
  import Tape from "../../ui/Tape.svelte";

  interface Props {
    label: string;
    tone?: "coral" | "card";
    /** A strip of tape across the top edge. */
    tape?: boolean;
    children: Snippet;
    /** Buttons along the bottom edge, one equal cell each. */
    actions?: Snippet;
  }

  let {
    label,
    tone = "card",
    tape = false,
    children,
    actions,
  }: Props = $props();

  const uid = $props.id();
  const labelId = `result-${uid}`;
</script>

<Surface
  tag="section"
  {tone}
  shadow="hero"
  aria-labelledby={labelId}
  style="padding: 0"
>
  {#if tape}
    <span class="result__tape"><Tape rotate={4} /></span>
  {/if}
  <div class="result__body">
    <h2 class="eyebrow" id={labelId}>{label}</h2>
    {@render children()}
  </div>
  {#if actions}
    <div class="result__actions">{@render actions()}</div>
  {/if}
</Surface>

<style>
  .result__tape {
    position: absolute;
    top: -9px;
    inset-inline-end: 36px;
    width: 70px;
    pointer-events: none;
  }

  .result__tape :global(.tape) {
    width: 70px;
    height: 20px;
  }

  .result__body {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-4);
  }

  .result__actions {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border-top: var(--border);
  }

  .result__actions :global(button) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 50px;
    border: 0;
    background: var(--color-card);
    color: var(--color-ink);
    font: inherit;
    font-size: var(--text-button);
    font-weight: var(--weight-black);
  }

  .result__actions :global(button + button) {
    border-inline-start: var(--border);
  }

  /* A sound cell reads like its siblings (reference 07), not like the butter tile. */
  .result__actions :global(.sound.sound--text) {
    height: auto;
    min-height: 50px;
    padding: 0;
    background: var(--color-card);
    box-shadow: none;
    --press-depth: 0px;
  }

  .result__actions :global(.sound.sound--text[data-state="playing"]) {
    background: var(--color-ink);
    color: var(--color-on-ink);
  }
</style>
