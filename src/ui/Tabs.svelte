<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Accessible name of the tab list. */
    label: string;
    tabs: readonly { id: string; label: string }[];
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
      aria-selected={tab.id === selected}
      aria-controls={panelId}
      tabindex={tab.id === selected ? 0 : -1}
      onclick={() => onselect(tab.id)}
      onkeydown={(event) => onkeydown(event, index)}
    >
      {tab.label}
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
  .tabs__panel {
    margin-block-start: var(--space-4);
  }
</style>
