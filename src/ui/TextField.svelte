<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    value: string;
    /** Visually hide the label (it stays the accessible name). */
    hideLabel?: boolean;
    placeholder?: string;
    /** Helper text under the field, announced with it. */
    hint?: string;
    multiline?: boolean;
    rows?: number;
    /** Aksara input: Jejeg line metrics. */
    aksara?: boolean;
    invalid?: boolean;
    /** The native control, for caret handling. */
    element?: HTMLInputElement | HTMLTextAreaElement;
    oninput?: (event: Event) => void;
    trailing?: Snippet;
  }

  let {
    label,
    value = $bindable(),
    hideLabel = false,
    placeholder,
    hint,
    multiline = false,
    rows = 3,
    aksara = false,
    invalid = false,
    element = $bindable(),
    oninput,
    trailing,
  }: Props = $props();

  const uid = $props.id();
  const id = `field-${uid}`;
  const hintId = `${id}-hint`;
</script>

<div class="field">
  <label class={["field__label", hideLabel && "visually-hidden"]} for={id}>
    {label}
  </label>
  <div class="field__control">
    {#if multiline}
      <textarea
        {id}
        class={[
          "field__input",
          aksara && "field__input--aksara",
          invalid && "field__input--error",
        ]}
        {rows}
        {placeholder}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={hint ? hintId : undefined}
        bind:value
        bind:this={element}
        {oninput}></textarea>
    {:else}
      <input
        {id}
        class={[
          "field__input",
          aksara && "field__input--aksara",
          invalid && "field__input--error",
        ]}
        type="text"
        {placeholder}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={hint ? hintId : undefined}
        bind:value
        bind:this={element}
        {oninput}
      />
    {/if}
    {#if trailing}
      <div class="field__trailing">{@render trailing()}</div>
    {/if}
  </div>
  {#if hint}
    <p class="field__hint" id={hintId}>{hint}</p>
  {/if}
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-2);
  }

  .field__label {
    font-weight: var(--weight-bold);
    font-size: var(--text-sm);
  }

  .field__control {
    position: relative;
  }

  .field__trailing {
    position: absolute;
    top: var(--space-2);
    inset-inline-end: var(--space-2);
  }

  .field__input {
    width: 100%;
    min-height: 5.5rem;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
    color: var(--color-text);
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
    resize: vertical;
  }

  .field__input::placeholder {
    color: var(--color-text-muted);
    opacity: 1;
  }

  .field__input:focus-visible {
    border-color: var(--color-link);
    background: var(--color-surface-raised);
    outline: var(--focus-ring);
    outline-offset: 2px;
  }

  .field__input--aksara {
    font-family: var(--font-aksara);
    font-size: var(--aksara-md);
    line-height: var(--aksara-leading);
  }

  .field__input--error {
    border-color: var(--color-danger);
    border-style: dashed;
  }

  .field__hint {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
