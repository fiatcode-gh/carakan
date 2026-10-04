<script lang="ts">
  import type { Snippet } from "svelte";
  import { getI18n } from "../l10n/context.ts";
  import IconButton from "./IconButton.svelte";

  interface Props {
    title: string;
    /** Pushed pages show a back control. */
    onback?: () => void;
    actions?: Snippet;
  }

  let { title, onback, actions }: Props = $props();

  const { t } = getI18n();
</script>

<header class={["top-bar", onback && "top-bar--back"]}>
  <div class="top-bar__inner">
    {#if onback}
      <IconButton icon="arrow-left" label={$t("backButton")} onclick={onback} />
    {/if}
    <h1 class="top-bar__title">{title}</h1>
    {#if actions}
      <div class="top-bar__actions">{@render actions()}</div>
    {/if}
  </div>
</header>

<style>
  .top-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .top-bar__inner {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    max-width: var(--content-max);
    min-height: var(--bar-height);
    margin-inline: auto;
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-4);
  }

  .top-bar--back .top-bar__inner {
    padding-inline-start: var(--space-2);
  }

  .top-bar__title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xl);
    letter-spacing: -0.02em;
  }

  .top-bar__actions {
    display: flex;
    gap: 0;
  }
</style>
