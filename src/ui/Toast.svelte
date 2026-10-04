<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  interface Props {
    /** Milliseconds before `onclose` fires. */
    duration?: number;
    onclose?: () => void;
    children: Snippet;
  }

  let { duration = 4000, onclose, children }: Props = $props();

  $effect(() => {
    const timer = setTimeout(() => onclose?.(), duration);
    return () => clearTimeout(timer);
  });
</script>

<div class="toast" role="status" aria-live="polite">
  <Icon name="info" small />
  <span>{@render children()}</span>
</div>

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(var(--tab-height) + var(--space-4));
    z-index: 60;
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    width: min(calc(100% - var(--space-8)), 26rem);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-text);
    color: var(--color-bg);
    box-shadow: var(--shadow-sheet);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
    translate: -50% 0;
    animation: rise var(--dur-base) var(--ease-out) both;
  }

  .toast :global(.icon) {
    margin-top: 1px;
  }

  :global(body[data-chrome="none"]) .toast {
    bottom: var(--space-5);
  }

  @media (min-width: 60rem) {
    :global(body[data-chrome="tabs"]) .toast {
      bottom: var(--space-6);
    }
  }
</style>
