<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Icon from "./Icon.svelte";

  interface Props extends Omit<HTMLButtonAttributes, "children"> {
    /** `choice` is an interactive toggle (a full touch target). */
    variant?: "default" | "count" | "choice";
    pressed?: boolean;
    children: Snippet;
  }

  let {
    variant = "default",
    pressed = false,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

{#if variant === "choice"}
  <button
    {...rest}
    type="button"
    aria-pressed={pressed}
    class={["chip", "chip--choice", className]}
  >
    <Icon name="check" small />
    {@render children()}
  </button>
{:else}
  <span
    {...rest as object}
    class={["chip", variant === "count" && "chip--count", className]}
  >
    {@render children()}
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 2rem;
    padding: var(--space-1) var(--space-3);
    border: var(--border);
    background: var(--color-neutral);
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }

  .chip--count {
    background: var(--color-card);
  }

  .chip--choice {
    min-height: var(--touch-min);
    padding-inline: var(--space-4);
    background: var(--color-card);
    font-family: var(--font-aksara);
    font-size: var(--aksara-md);
    line-height: var(--aksara-leading);
  }

  .chip--choice[aria-pressed="true"] {
    background: var(--color-butter);
    box-shadow: var(--shadow-tile);
  }

  .chip--choice :global(.icon) {
    display: none;
  }

  .chip--choice[aria-pressed="true"] :global(.icon) {
    display: block;
  }
</style>
