<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    href?: string;
    variant?: "primary" | "secondary" | "quiet" | "icon";
    block?: boolean;
    disabled?: boolean;
    type?: "button" | "submit";
    children: Snippet;
  }

  let {
    variant = "secondary",
    block = false,
    disabled = false,
    type = "button",
    href,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

{#if href !== undefined && !disabled}
  <a
    {...rest}
    {href}
    class={["btn", `btn--${variant}`, block && "btn--block", className]}
  >
    {@render children()}
  </a>
{:else}
  <button
    {...rest}
    {type}
    {disabled}
    class={["btn", `btn--${variant}`, block && "btn--block", className]}
  >
    {@render children()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--touch-min);
    min-width: var(--touch-min);
    padding: var(--space-2) var(--space-5);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--color-text);
    font-weight: var(--weight-bold);
    font-size: var(--text-md);
    line-height: var(--leading-snug);
    text-align: center;
    text-decoration: none;
    transition:
      background-color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }

  .btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .btn:disabled {
    cursor: not-allowed;
    background: var(--color-surface-sunken);
    border-color: var(--color-border);
    color: var(--color-text-muted);
  }

  .btn--primary {
    background: var(--color-accent);
    color: var(--color-on-accent);
    box-shadow: 0 2px 0 var(--color-accent-pressed);
  }

  .btn--primary:active:not(:disabled) {
    background: var(--color-accent-pressed);
    box-shadow: none;
  }

  .btn--secondary {
    background: var(--color-surface-raised);
    border-color: var(--color-border-strong);
  }

  .btn--quiet {
    color: var(--color-link);
    padding-inline: var(--space-3);
  }

  .btn--block {
    width: 100%;
  }

  .btn--icon {
    width: var(--touch-min);
    padding: 0;
    border-radius: var(--radius-full);
    color: var(--color-text);
  }

  .btn--icon:active {
    background: var(--color-surface-sunken);
  }
</style>
