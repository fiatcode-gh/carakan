<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.ts";

  interface Action {
    label: string;
    onclick: () => void;
    icon?: IconName;
    autofocus?: boolean;
  }

  interface Props {
    primary: Action;
    /** With a secondary action the bar splits 1:2. */
    secondary?: Action;
  }

  let { primary, secondary }: Props = $props();
</script>

<div class={["bar", secondary && "bar--split"]}>
  {#if secondary}
    <button
      type="button"
      class="bar__action bar__action--secondary"
      data-autofocus={secondary.autofocus ? "" : undefined}
      onclick={secondary.onclick}
    >
      {secondary.label}
      {#if secondary.icon}<Icon name={secondary.icon} small />{/if}
    </button>
  {/if}
  <button
    type="button"
    class="bar__action bar__action--primary"
    data-autofocus={primary.autofocus ? "" : undefined}
    onclick={primary.onclick}
  >
    {primary.label}
    <Icon name={primary.icon ?? "arrow-right"} small />
  </button>
</div>

<style>
  .bar {
    position: sticky;
    bottom: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr;
    border-top: var(--border);
    background: var(--color-ink);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bar--split {
    grid-template-columns: 1fr 2fr;
  }

  .bar__action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: var(--bar-height);
    padding: 0 var(--space-4);
    border: 0;
    font: inherit;
    font-size: var(--text-button);
    font-weight: var(--weight-black);
  }

  .bar__action--primary {
    background: var(--color-ink);
    color: var(--color-on-ink);
  }

  .bar__action--secondary {
    background: var(--color-paper);
    color: var(--color-ink);
    border-inline-end: var(--border);
  }

  /* The ring sits inside the cell: the bar is flush with the screen edges. */
  .bar__action:focus-visible {
    outline-offset: -7px;
  }

  .bar__action--primary:focus-visible {
    outline-color: var(--color-on-ink);
  }
</style>
