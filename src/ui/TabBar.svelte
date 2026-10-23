<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.ts";

  export interface TabItem {
    href: string;
    label: string;
    icon: IconName;
    current: boolean;
    onclick?: (event: MouseEvent) => void;
    accent: "coral" | "periwinkle" | "sage" | "butter";
    /** Decorative aksara drawn on the index tab (wide screens only). */
    mark: string;
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
      style:--tab-accent="var(--color-{item.accent})"
    >
      <span class="tab-bar__mark aksara" lang="jv-Java" aria-hidden="true"
        >{item.mark}</span
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

  /* The mark is wide-only decoration. */
  .tab-bar__mark {
    display: none;
  }

  /* From 48rem the bar becomes index tabs on the book's right edge: coloured
     dividers, the current one sticks out further and carries the shadow. */
  @media (min-width: 48rem) {
    .tab-bar {
      inset: auto;
      top: calc(var(--desk-block) + var(--space-8));
      left: calc(100% - var(--book-right));
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      min-height: 0;
      padding: 0;
      border: 0;
      background: none;
    }

    .tab-bar__item,
    .tab-bar__item + .tab-bar__item {
      position: relative;
      width: 6rem;
      min-height: 0;
      height: 76px;
      border: var(--border);
      border-inline-start: 0;
      background: var(--tab-accent);
      color: var(--color-ink);
      font-size: var(--text-sm);
      font-weight: var(--weight-black);
    }

    .tab-bar__item[aria-current="page"] {
      width: 6.75rem;
      margin-inline-start: calc(-1 * var(--border-width));
      background: var(--tab-accent);
      color: var(--color-ink);
      box-shadow: var(--shadow-tile);
    }

    .tab-bar__mark {
      display: block;
      position: absolute;
      top: 2px;
      inset-inline-end: 6px;
      font-size: 22px;
      line-height: 1;
      opacity: 0.45;
      pointer-events: none;
    }
  }
</style>
