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

  /** Quiet buttons are flat text; everything else presses like a tile. */
  const pressable = $derived(variant !== "quiet");
</script>

{#if href !== undefined && !disabled}
  <a
    {...rest}
    {href}
    class={[
      "btn",
      `btn--${variant}`,
      pressable && "press",
      block && "btn--block",
      className,
    ]}
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
      pressable && "press",
      block && "btn--block",
      mark && `is-${mark}`,
      className,
    ]}
  >
    {@render children()}
    {#if mark}
      <Icon name={mark === "correct" ? "check" : "x"} class="btn__mark" />
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
    border: var(--border-width) solid transparent;
    background: transparent;
    color: var(--color-ink);
    font-weight: var(--weight-black);
    font-size: var(--text-button);
    line-height: var(--leading-snug);
    text-align: center;
    text-decoration: none;
    transition:
      translate var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out);
  }

  .btn:disabled {
    cursor: not-allowed;
    background: var(--color-neutral);
    border-color: var(--color-ink);
    box-shadow: none;
    color: var(--color-ink-muted);
  }

  .btn--primary {
    background: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-on-ink);
    --press-depth: 0px;
  }

  .btn--secondary {
    background: var(--color-card);
    border: var(--border);
  }

  .btn--danger {
    background: var(--color-card);
    border: 2px dashed var(--color-stamp);
    color: var(--color-stamp);
    --press-depth: 0px;
  }

  .btn--quiet {
    color: var(--color-ink);
    padding-inline: var(--space-3);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .btn--block {
    width: 100%;
  }

  .btn--icon {
    width: var(--icon-button);
    height: var(--icon-button);
    padding: 0;
    border: var(--border);
    background: var(--color-paper);
    color: var(--color-ink);
  }

  /* AnswerTile: card, 2px border, 3px shadow; state carried by fill + icon. */
  .btn--option,
  .btn--aksara-option {
    position: relative;
    width: 100%;
    min-height: var(--answer-height);
    background: var(--color-card);
    border: var(--border);
    font-size: var(--text-lg);
  }

  .btn--option {
    justify-content: flex-start;
    padding-inline: var(--space-5);
    text-align: start;
  }

  .btn--aksara-option {
    font-family: var(--font-aksara);
    font-size: var(--aksara-lg);
    font-weight: var(--weight-regular);
    line-height: var(--aksara-leading);
  }

  .btn :global(.btn__mark) {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
  }

  .btn.is-correct {
    background: var(--color-sage);
    color: var(--color-ink);
  }

  .btn.is-wrong {
    background: var(--color-coral);
    color: var(--color-ink);
  }

  .btn--option:disabled:not(.is-correct, .is-wrong),
  .btn--aksara-option:disabled:not(.is-correct, .is-wrong) {
    box-shadow: none;
  }
</style>
