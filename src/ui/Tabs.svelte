<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Accessible name of the tab list. */
    label: string;
    tabs: readonly {
      id: string;
      label: string;
      /** A number shown as a small badge after the label. */
      count?: number;
      /** Accessible name when it must state the count; the badge is then hidden from it. */
      name?: string;
    }[];
    selected: string;
    onselect: (id: string) => void;
    /** The one tab panel; receives the selected tab's id. */
    panel: Snippet<[string]>;
  }

  let { label, tabs, selected, onselect, panel }: Props = $props();

  const uid = $props.id();
  const panelId = `${uid}-panel`;
  const tabId = (id: string) => `${uid}-tab-${id}`;
  let list: HTMLDivElement;

  // WAI-ARIA automatic activation: arrows, Home and End move focus and select.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const count = tabs.length;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % count
        : event.key === "ArrowLeft"
          ? (index - 1 + count) % count
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    onselect(tabs[next]!.id);
    list.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }
</script>

<div class="segmented" role="tablist" aria-label={label} bind:this={list}>
  {#each tabs as tab, index (tab.id)}
    <button
      type="button"
      role="tab"
      class="segmented__cell"
      id={tabId(tab.id)}
      class:segmented__cell--counted={tab.count !== undefined}
      aria-label={tab.name}
      aria-selected={tab.id === selected}
      aria-controls={panelId}
      tabindex={tab.id === selected ? 0 : -1}
      onclick={() => onselect(tab.id)}
      onkeydown={(event) => onkeydown(event, index)}
    >
      {tab.label}
      {#if tab.count !== undefined}
        <span class="tabs__count" aria-hidden="true">{tab.count}</span>
      {/if}
    </button>
  {/each}
</div>

<div
  class="tabs__panel"
  role="tabpanel"
  id={panelId}
  tabindex="0"
  aria-labelledby={tabId(selected)}
>
  {@render panel(selected)}
</div>

<style>
  /*
   * A counted cell stays one line on a phone: the badge is small and the
   * cell gives up some side padding, so the row never grows when a query is
   * typed.
   */
  .segmented__cell--counted {
    gap: var(--space-1);
    padding-inline: var(--space-1);
    white-space: nowrap;
  }

  .tabs__count {
    min-width: 1.25rem;
    padding: 0 var(--space-1);
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    font-size: var(--text-caption);
    font-weight: var(--weight-black);
    line-height: 1.25rem;
  }

  .tabs__panel {
    margin-block-start: var(--space-4);
  }
</style>
