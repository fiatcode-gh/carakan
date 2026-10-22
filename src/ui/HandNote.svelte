<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    tag?: "p" | "span" | "h2" | "h3";
    /** For `aria-labelledby` references. */
    id?: string;
    /** A slight anticlockwise tilt, as if written in by hand. */
    tilt?: boolean;
    children?: Snippet;
  }

  let { tag = "p", id, tilt = false, children }: Props = $props();
</script>

<svelte:element this={tag} {id} class={["hand", tilt && "hand--tilt"]}>
  {@render children?.()}
</svelte:element>

<style>
  .hand {
    margin: 0;
  }

  .hand--tilt {
    display: inline-block;
    rotate: -1.5deg;
  }
</style>
