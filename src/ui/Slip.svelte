<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLElement> {
    tag?: "div" | "article" | "section" | "li";
    raised?: boolean;
    children: Snippet;
  }

  let {
    tag = "div",
    raised = false,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={tag}
  {...rest}
  class={["slip", raised && "slip--raised", className]}
>
  {@render children()}
</svelte:element>

<style>
  .slip {
    position: relative;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-slip);
  }

  .slip--raised {
    background: var(--color-surface-raised);
  }
</style>
