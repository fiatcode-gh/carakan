<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    value: string;
    /**
     * `hidden` keeps the label as the accessible name only; `hand` sets it
     * above the field in the handwritten face.
     */
    labelStyle?: "default" | "hidden" | "hand";
    placeholder?: string;
    /** Helper text under the field, announced with it. */
    hint?: string;
    multiline?: boolean;
    rows?: number;
    /** Aksara input: Jejeg line metrics. */
    aksara?: boolean;
    invalid?: boolean;
    /** A search box: the phone keyboard must not correct, capitalise or spell-check the query. */
    search?: boolean;
    /** The native control, for caret handling. */
    element?: HTMLInputElement | HTMLTextAreaElement;
    oninput?: (event: Event) => void;
    trailing?: Snippet;
  }

  let {
    label,
    value = $bindable(),
    labelStyle = "default",
    placeholder,
    hint,
    multiline = false,
    rows = 3,
    aksara = false,
    invalid = false,
    search = false,
    element = $bindable(),
    oninput,
    trailing,
  }: Props = $props();

  const uid = $props.id();
  const id = `field-${uid}`;
  const hintId = `${id}-hint`;
</script>

<div class="field">
  <label
    class={[
      labelStyle !== "hand" && "field__label",
      labelStyle === "hidden" && "visually-hidden",
      labelStyle === "hand" && "hand",
    ]}
    for={id}
  >
    {label}
  </label>
  <div class="field__control">
    {#if multiline}
      <textarea
        {id}
        class={[
          "field__input",
          labelStyle === "hand" && "field__input--hand",
          trailing && "field__input--trailing",
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
          "field__input--line",
          labelStyle === "hand" && "field__input--hand",
          trailing && "field__input--trailing",
          aksara && "field__input--aksara",
          invalid && "field__input--error",
        ]}
        type="text"
        autocapitalize={search ? "off" : undefined}
        autocorrect={search ? "off" : undefined}
        spellcheck={search ? false : undefined}
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
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    font-family: var(--font-latin);
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
    resize: vertical;
  }

  /* One line of text: a search box is not the tall multi-line field. */
  .field__input--line {
    min-height: 3rem;
    resize: none;
  }

  .field__input::placeholder {
    color: var(--color-ink-subtle);
    opacity: 1;
  }

  .field__input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .field__input--hand {
    min-height: 56px;
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
  }

  .field__input--trailing {
    padding-inline-end: calc(var(--icon-button) + var(--space-4));
  }

  .field__input--aksara {
    font-family: var(--font-aksara);
    font-size: var(--aksara-md);
    line-height: var(--aksara-leading);
  }

  .field__input--error {
    border: 2px dashed var(--color-stamp);
  }

  .field__hint {
    color: var(--color-ink-muted);
    font-size: var(--text-sm);
  }
</style>
