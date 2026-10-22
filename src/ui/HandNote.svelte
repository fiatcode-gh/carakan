<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    tag?: "p" | "span" | "h2" | "h3";
    /** A slight anticlockwise tilt, as if written in by hand. */
    tilt?: boolean;
    children?: Snippet;
  }

  let { tag = "p", tilt = false, children }: Props = $props();
</script>

<svelte:element this={tag} class={["hand", tilt && "hand--tilt"]}>
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
