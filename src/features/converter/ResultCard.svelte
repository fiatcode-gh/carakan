<script lang="ts">
  import type { Snippet } from "svelte";

  let { label, children }: { label: string; children: Snippet } = $props();

  const uid = $props.id();
  const labelId = `result-${uid}`;
</script>

<section class="result" aria-labelledby={labelId}>
  <h2 class="result__label" id={labelId}>{label}</h2>
  {@render children()}
</section>

<style>
  .result {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-4);
    border: var(--border);
    background: var(--color-card);
    box-shadow: var(--shadow-tile);
  }

  .result__label {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }
</style>
