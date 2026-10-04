<script lang="ts">
  import type { Snippet } from "svelte";
  import { getI18n } from "../../l10n/context.ts";
  import Icon from "../../ui/Icon.svelte";
  import { localizeEngineMessage } from "./engine-messages.ts";

  interface Props {
    /** Raw engine text; shown in the UI language (W15). */
    message: string;
    echo?: Snippet;
  }

  let { message, echo }: Props = $props();

  const { t } = getI18n();
  const localized = $derived(localizeEngineMessage(message));
</script>

<div class="notice" role="alert">
  <Icon name="triangle-alert" />
  <p class="notice__text">
    <strong>{$t("errorTitle")}</strong>
    {$t(localized.key, localized.params)}
  </p>
  {#if echo}
    <p class="notice__echo">{@render echo()}</p>
  {/if}
</div>

<style>
  .notice {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    align-items: start;
    padding: var(--space-4);
    border: 2px dashed var(--color-danger);
    border-radius: var(--radius-lg);
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }

  .notice__text {
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  .notice__echo {
    grid-column: 1 / -1;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .notice__echo :global(mark) {
    padding-inline: 2px;
    border-radius: 4px;
    background: var(--color-danger);
    color: var(--color-on-accent);
  }
</style>
