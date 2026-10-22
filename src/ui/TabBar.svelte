<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.ts";

  export interface TabItem {
    href: string;
    label: string;
    icon: IconName;
    current: boolean;
    onclick?: (event: MouseEvent) => void;
  }

  interface Props {
    /** Accessible name of the navigation landmark. */
    label: string;
    items: readonly TabItem[];
  }

  let { label, items }: Props = $props();
</script>

<nav class="tab-bar" aria-label={label}>
  {#each items as item (item.href)}
    <a
      class="tab-bar__item"
      href={item.href}
      aria-current={item.current ? "page" : undefined}
      onclick={item.onclick}
    >
      <span class="tab-bar__pill"><Icon name={item.icon} /></span>
      {item.label}
    </a>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    min-height: var(--nav-height);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-card);
    border-top: var(--border);
  }

  .tab-bar__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: var(--nav-height);
    padding: var(--space-2) var(--space-1);
    color: var(--color-ink-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    text-decoration: none;
  }

  .tab-bar__item + .tab-bar__item {
    border-inline-start: var(--border);
  }

  .tab-bar__pill {
    display: grid;
    place-items: center;
  }

  .tab-bar__pill :global(.icon) {
    width: 22px;
    height: 22px;
  }

  /* The selected tab is more than hue: ink fill with paper content. */
  .tab-bar__item[aria-current="page"] {
    background: var(--color-ink);
    color: var(--color-on-ink);
    font-weight: var(--weight-black);
  }

  /* Wide screens: the tab bar becomes a side rail and content stays centred. */
  @media (min-width: 60rem) {
    .tab-bar {
      inset: 0 auto 0 0;
      width: var(--rail-width);
      grid-template-columns: 1fr;
      grid-auto-rows: max-content;
      align-content: start;
      padding: 0;
      border-top: 0;
      border-inline-end: var(--border);
    }

    .tab-bar__item + .tab-bar__item {
      border-inline-start: 0;
      border-top: var(--border);
    }
  }
</style>
