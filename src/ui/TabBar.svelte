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
    min-height: var(--tab-height);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-surface-sunken);
    border-top: 1px solid var(--color-border);
  }

  .tab-bar__item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: var(--touch-min);
    padding: var(--space-2) var(--space-1);
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    text-decoration: none;
  }

  .tab-bar__pill {
    display: grid;
    place-items: center;
    width: 4rem;
    height: 2rem;
    border-radius: var(--radius-full);
    transition: background-color var(--dur-fast) var(--ease-out);
  }

  /* The selected tab is more than hue: pill behind the icon, bold ink label and
     a bar on the tab edge. */
  .tab-bar__item[aria-current="page"] {
    color: var(--color-text);
    font-weight: var(--weight-bold);
  }

  .tab-bar__item[aria-current="page"] .tab-bar__pill {
    background: var(--color-reward-soft);
    box-shadow: inset 0 0 0 1.5px var(--color-reward);
  }

  .tab-bar__item[aria-current="page"]::before {
    content: "";
    position: absolute;
    top: 0;
    left: 25%;
    right: 25%;
    height: 3px;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    background: var(--color-accent);
  }

  /* Wide screens: the tab bar becomes a side rail and content stays centred. */
  @media (min-width: 60rem) {
    .tab-bar {
      inset: 0 auto 0 0;
      width: var(--rail-width);
      grid-template-columns: 1fr;
      grid-auto-rows: max-content;
      align-content: start;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-2);
      border-top: 0;
      border-inline-end: 1px solid var(--color-border);
    }

    .tab-bar__item {
      padding-block: var(--space-3);
    }

    .tab-bar__item[aria-current="page"]::before {
      top: 25%;
      bottom: 25%;
      left: calc(var(--space-2) * -1);
      right: auto;
      width: 3px;
      height: auto;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }
  }
</style>
