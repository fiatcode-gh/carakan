<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.ts";

  interface Props {
    kind: "loading" | "empty" | "error";
    title: string;
    /** Overrides the kind's icon (error: alert, empty: check). */
    icon?: IconName;
    /** Retry (or other) action under the title. */
    actionLabel?: string;
    onaction?: () => void;
    /** Fill a page: tall, centred. */
    page?: boolean;
    children?: Snippet;
  }

  let {
    kind,
    title,
    icon,
    actionLabel,
    onaction,
    page = false,
    children,
  }: Props = $props();

  const kindIcon: IconName = $derived(
    icon ?? (kind === "error" ? "triangle-alert" : "check"),
  );
</script>

<div
  class={["state", `state--${kind}`, page && "state--page"]}
  role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}
>
  {#if kind === "loading"}
    <div class="spinner" aria-hidden="true"></div>
  {:else}
    <div class="state__icon" aria-hidden="true"><Icon name={kindIcon} /></div>
  {/if}
  <p class="state__title">{title}</p>
  {@render children?.()}
  {#if actionLabel && onaction}
    <Button variant="primary" onclick={onaction}>
      <Icon name="refresh-cw" />{actionLabel}
    </Button>
  {/if}
</div>

<style>
  .state {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    padding: var(--space-8) var(--space-5);
    text-align: center;
  }

  .state--page {
    min-height: 16rem;
    align-content: center;
  }

  .state__icon {
    display: grid;
    place-items: center;
    width: 4.5rem;
    height: 4.5rem;
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
  }

  .state__icon :global(.icon) {
    width: 2rem;
    height: 2rem;
  }

  .state__title {
    max-width: 22rem;
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  .state--error .state__icon {
    border-color: var(--color-danger);
    border-style: dashed;
    color: var(--color-danger);
  }

  .state--empty .state__icon {
    border-color: var(--color-reward);
    background: var(--color-reward-soft);
  }

  .spinner {
    width: 3rem;
    height: 3rem;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: var(--radius-full);
    animation: spin 900ms linear infinite;
  }

  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
</style>
