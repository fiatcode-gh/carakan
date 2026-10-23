<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLElement> {
    tag?: "div" | "article" | "section" | "li";
    tone?: "card" | "paper" | "coral" | "periwinkle" | "butter" | "sage";
    shadow?: "none" | "tile" | "hero";
    children: Snippet;
  }

  let {
    tag = "div",
    tone = "card",
    shadow = "tile",
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={tag}
  {...rest}
  class={[
    "surface",
    `surface--${tone}`,
    `surface--shadow-${shadow}`,
    className,
  ]}
>
  {@render children()}
</svelte:element>

<style>
  .surface {
    position: relative;
    padding: var(--space-4);
    border: var(--border);
    background: var(--color-card);
  }

  .surface--paper {
    background: var(--color-paper);
  }
  .surface--coral {
    background: var(--color-coral);
  }
  .surface--periwinkle {
    background: var(--color-periwinkle);
  }
  .surface--butter {
    background: var(--color-butter);
  }
  .surface--sage {
    background: var(--color-sage);
  }

  .surface--shadow-tile {
    box-shadow: var(--shadow-tile);
  }
  .surface--shadow-hero {
    box-shadow: var(--shadow-hero);
  }
</style>
