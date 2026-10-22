<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Icon from "./Icon.svelte";

  /** An interactive toggle (a full touch target); pressed shows a check. */
  interface Props extends Omit<HTMLButtonAttributes, "children"> {
    pressed?: boolean;
    children: Snippet;
  }

  let {
    pressed = false,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<button
  {...rest}
  type="button"
  aria-pressed={pressed}
  class={["chip", "press", className]}
>
  <Icon name="check" small />
  {@render children()}
</button>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch-min);
    padding: var(--space-1) var(--space-4);
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    font-family: var(--font-aksara);
    font-size: var(--aksara-md);
    font-weight: var(--weight-bold);
    line-height: var(--aksara-leading);
  }

  .chip[aria-pressed="true"] {
    background: var(--color-butter);
  }

  .chip :global(.icon) {
    display: none;
  }

  .chip[aria-pressed="true"] :global(.icon) {
    display: block;
  }
</style>
