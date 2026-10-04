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
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-slip);
  }

  .result__label {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }
</style>
