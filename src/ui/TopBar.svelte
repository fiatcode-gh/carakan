<script lang="ts">
  import type { Snippet } from "svelte";
  import { getI18n } from "../l10n/context.ts";
  import IconButton from "./IconButton.svelte";

  interface Props {
    title: string;
    chrome: "tab" | "pushed";
    onback?: () => void;
    note?: Snippet;
    actions?: Snippet;
  }

  let { title, chrome, onback, note, actions }: Props = $props();

  const { t } = getI18n();

  // The title breaks after its first word; the space stays in the accessible name.
  const split = $derived.by(() => {
    const at = title.indexOf(" ");
    return at < 0
      ? { first: title, rest: "" }
      : { first: title.slice(0, at), rest: title.slice(at + 1) };
  });
</script>

{#if chrome === "tab"}
  <header class="top-bar top-bar--tab">
    <h1 class="screen-title">
      <span>{split.first}</span>
      {#if split.rest !== ""}
        <span class="screen-title__rest">{split.rest}</span>
      {/if}
    </h1>
    {#if actions}
      <div class="top-bar__actions">{@render actions()}</div>
    {/if}
    {#if note}
      <div class="top-bar__note">{@render note()}</div>
    {/if}
  </header>
{:else}
  <header class="top-bar top-bar--pushed">
    <IconButton
      icon="chevron-left"
      label={$t("backButton")}
      tone="paper"
      onclick={onback}
    />
    <h1 class="top-bar__title">{title}</h1>
    {#if actions}
      <div class="top-bar__actions">{@render actions()}</div>
    {/if}
  </header>
{/if}

<style>
  .top-bar {
    max-width: var(--page-max, var(--content-max));
    margin-inline: auto;
  }

  .top-bar--tab {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto 1fr;
    column-gap: var(--space-3);
    padding: var(--space-6) var(--gutter) var(--space-3);
  }

  .screen-title {
    grid-row: 1 / -1;
    align-self: end;
    min-width: 0;
    font-size: var(--text-2xl);
    font-weight: var(--weight-black);
    line-height: var(--leading-title);
    letter-spacing: var(--tracking-title);
    overflow-wrap: anywhere;
  }

  .screen-title__rest {
    display: block;
  }

  .top-bar--tab .top-bar__actions {
    grid-column: 2;
    grid-row: 1;
    align-self: start;
    justify-self: end;
  }

  .top-bar__note {
    grid-column: 2;
    grid-row: 2;
    align-self: end;
    justify-self: end;
    text-align: end;
    padding-block-start: var(--space-2);
  }

  .top-bar--pushed {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--bar-height);
    padding: var(--space-2) var(--gutter) var(--space-2) var(--space-2);
  }

  .top-bar__title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xl);
    font-weight: var(--weight-black);
    letter-spacing: var(--tracking-title);
  }

  .top-bar__actions {
    display: flex;
    gap: var(--space-2);
  }
</style>
