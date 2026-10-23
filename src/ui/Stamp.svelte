<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** `meaning` carries information; `decor` is hidden from assistive tech. */
    variant: "meaning" | "decor";
    children: Snippet;
  }

  let { variant, children }: Props = $props();
</script>

<span
  class={["stamp", `stamp--${variant}`]}
  aria-hidden={variant === "decor" ? "true" : undefined}
>
  {@render children()}
</span>

<style>
  .stamp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border: var(--border-width) solid currentcolor;
    border-radius: 50%;
    rotate: -12deg;
    font-family: var(--font-hand);
    font-size: var(--text-sm);
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
  }

  .stamp--meaning {
    color: var(--color-stamp);
  }

  .stamp--decor {
    color: var(--color-stamp-decor);
  }
</style>
