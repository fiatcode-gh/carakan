<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import Icon from "./Icon.svelte";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    href?: string;
    /** `option` and `aksara-option` are full-width answer choices. */
    variant?:
      | "primary"
      | "secondary"
      | "quiet"
      | "danger"
      | "icon"
      | "option"
      | "aksara-option";
    /** Answer state of an option: icon + border, never hue alone. */
    mark?: "correct" | "wrong";
    block?: boolean;
    disabled?: boolean;
    type?: "button" | "submit";
    children: Snippet;
  }

  let {
    variant = "secondary",
    mark,
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
    class={[
      "btn",
      `btn--${variant}`,
      block && "btn--block",
      mark && `is-${mark}`,
      className,
    ]}
  >
    {@render children()}
    {#if mark}
      <Icon
        name={mark === "correct" ? "check" : "circle-x"}
        class="btn__mark"
      />
    {/if}
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

  .btn--danger {
    background: var(--color-surface-raised);
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .btn--danger:active:not(:disabled) {
    background: var(--color-danger-soft);
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

  /* Answer options: full-width, thumb-sized, state carried by icon + border. */
  .btn--option,
  .btn--aksara-option {
    position: relative;
    width: 100%;
    min-height: 3.5rem;
    background: var(--color-surface-raised);
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-slip);
    font-size: var(--text-lg);
  }

  .btn--option {
    justify-content: flex-start;
    padding-inline: var(--space-5);
    text-align: start;
  }

  .btn--aksara-option {
    min-height: 5rem;
    background: var(--color-surface);
    font-family: var(--font-aksara);
    font-size: var(--aksara-lg);
    font-weight: var(--weight-regular);
    line-height: var(--aksara-leading);
  }

  .btn :global(.btn__mark) {
    margin-inline-start: auto;
  }

  .btn--aksara-option :global(.btn__mark) {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
  }

  .btn.is-correct {
    background: var(--color-success-soft);
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .btn.is-wrong {
    background: var(--color-danger-soft);
    border-color: var(--color-danger);
    border-style: dashed;
    color: var(--color-danger);
  }

  .btn--option:disabled:not(.is-correct, .is-wrong),
  .btn--aksara-option:disabled:not(.is-correct, .is-wrong) {
    box-shadow: none;
  }
</style>
