<script lang="ts">
  interface Props {
    /** Filled segments, 1 to 4. */
    level: 1 | 2 | 3 | 4;
  }

  let { level }: Props = $props();
</script>

<span class="strength-bar" aria-hidden="true">
  {#each [1, 2, 3, 4] as segment}
    <span class="strength-bar__segment" data-filled={segment <= level}></span>
  {/each}
</span>

<style>
  .strength-bar {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }

  .strength-bar__segment {
    height: var(--segment-height);
    box-sizing: border-box;
    border: var(--border);
    background: var(--color-card);
  }

  .strength-bar__segment[data-filled="true"] {
    background: var(--color-sage);
  }
</style>
