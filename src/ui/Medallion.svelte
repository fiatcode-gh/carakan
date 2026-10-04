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
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
    color: var(--color-text);
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
    border: 2px solid var(--color-bg);
    border-radius: var(--radius-full);
    background: var(--color-text);
    color: var(--color-bg);
  }

  .medallion__badge :global(.icon) {
    width: 0.75rem;
    height: 0.75rem;
    stroke-width: 3;
  }

  .medallion--completed {
    border-color: var(--color-reward);
    background: var(--color-reward-fill);
  }

  .medallion--ready {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px var(--color-accent-soft);
  }

  .medallion--ready .medallion__badge {
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  .medallion--locked {
    border-style: dashed;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
  }

  .medallion--locked .medallion__badge {
    background: var(--color-text-muted);
  }
</style>
