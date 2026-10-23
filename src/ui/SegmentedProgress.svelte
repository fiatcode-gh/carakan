<script lang="ts">
  interface Props {
    value: number;
    max: number;
    /** Separate cells (one per step) or one continuous bar. */
    segmented: boolean;
    label: string;
  }

  let { value, max, segmented, label }: Props = $props();
</script>

<div
  class={["progress", segmented && "progress--segmented"]}
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax={max}
  aria-valuenow={value}
  aria-label={label}
>
  {#if segmented}
    {#each { length: max } as _, index}
      <span class={["progress__cell", index < value && "is-done"]}></span>
    {/each}
  {:else}
    <span class="progress__bar" style:width="{(value / max) * 100}%"></span>
  {/if}
</div>

<style>
  .progress {
    display: flex;
    gap: var(--space-1);
    height: var(--segment-height);
    box-sizing: content-box;
    border: var(--border);
    background: var(--color-paper);
  }

  .progress--segmented {
    gap: 2px;
    background: var(--color-ink);
  }

  .progress__bar {
    height: 100%;
    background: var(--color-ink);
    transition: width var(--dur-base) var(--ease-out);
  }

  .progress__cell {
    flex: 1;
    background: var(--color-paper);
  }

  .progress__cell.is-done {
    background: var(--color-ink);
  }
</style>
