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
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface-sunken);
    color: var(--color-text);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }

  .chip--count {
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
  }

  .chip--choice {
    min-height: var(--touch-min);
    padding-inline: var(--space-4);
    border-width: 2px;
    background: var(--color-surface-raised);
    font-family: var(--font-aksara);
    font-size: var(--aksara-md);
    line-height: var(--aksara-leading);
  }

  .chip--choice[aria-pressed="true"] {
    border-color: var(--color-link);
    box-shadow: inset 0 0 0 1px var(--color-link);
    color: var(--color-link);
  }

  .chip--choice :global(.icon) {
    display: none;
  }

  .chip--choice[aria-pressed="true"] :global(.icon) {
    display: block;
  }
</style>
