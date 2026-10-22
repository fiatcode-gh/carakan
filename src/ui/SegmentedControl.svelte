<script lang="ts" generics="V extends string">
  interface Props {
    /** Accessible name of the radio group. */
    label: string;
    options: readonly { value: V; label: string }[];
    value: V;
    onchange?: (value: V) => void;
  }

  let { label, options, value = $bindable(), onchange }: Props = $props();

  const uid = $props.id();
  const name = `segmented-${uid}`;
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <label class="segmented__option">
      <input
        type="radio"
        {name}
        value={option.value}
        checked={value === option.value}
        onchange={() => {
          value = option.value;
          onchange?.(option.value);
        }}
      />
      <span class="segmented__label">{option.label}</span>
    </label>
  {/each}
</div>

<style>
  .segmented {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border: var(--border);
    background: var(--color-card);
  }

  .segmented__option {
    position: relative;
    display: flex;
  }

  .segmented__option input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }

  .segmented__label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    min-height: var(--touch-min);
    padding: var(--space-1) var(--space-3);
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    text-align: center;
    line-height: var(--leading-snug);
  }

  .segmented__option + .segmented__option {
    border-inline-start: var(--border);
  }

  .segmented__option input:checked + .segmented__label {
    background: var(--color-ink);
    color: var(--color-on-ink);
  }

  .segmented__option input:focus-visible + .segmented__label {
    outline: var(--focus-ring);
    outline-offset: calc(var(--focus-offset) * -1);
  }
</style>
