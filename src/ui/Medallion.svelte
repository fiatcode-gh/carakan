<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    number: number | string;
    /** Completed: gold fill + check; ready: terracotta ring + play; locked: dashed + lock. */
    state: "completed" | "ready" | "locked";
  }

  let { number, state }: Props = $props();

  const badge = { completed: "check", ready: "play", locked: "lock" } as const;
</script>

<span class="medallion medallion--{state}" aria-hidden="true">
  {number}
  <span class="medallion__badge"><Icon name={badge[state]} /></span>
</span>

<style>
  .medallion {
    position: relative;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border: 3px solid var(--color-ink);
    border-radius: 50%;
    background: var(--color-card);
    color: var(--color-ink);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    line-height: 1;
  }

  .medallion__badge {
    position: absolute;
    right: -0.35rem;
    bottom: -0.35rem;
    display: grid;
    place-items: center;
    width: 1.375rem;
    height: 1.375rem;
    border: 2px solid var(--color-paper);
    border-radius: 50%;
    background: var(--color-ink);
    color: var(--color-on-ink);
  }

  .medallion__badge :global(.icon) {
    width: 0.75rem;
    height: 0.75rem;
    stroke-width: 3;
  }

  .medallion--completed {
    background: var(--color-butter);
  }

  .medallion--ready {
    background: var(--color-coral);
    box-shadow: 0 0 0 4px var(--color-neutral);
  }

  .medallion--ready .medallion__badge {
    background: var(--color-ink);
    color: var(--color-on-ink);
  }

  .medallion--locked {
    border-style: dashed;
    background: var(--color-neutral);
    color: var(--color-ink-muted);
  }

  .medallion--locked .medallion__badge {
    background: var(--color-ink-muted);
  }
</style>
