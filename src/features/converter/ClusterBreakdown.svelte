<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Icon from "../../ui/Icon.svelte";
  import type { ClusterPart } from "./cluster-parts.ts";
  import ResultCard from "./ResultCard.svelte";

  interface Props {
    parts: readonly ClusterPart[];
    /** Display name per part, in the same order. */
    names: readonly string[];
    reading: string;
    onopen: (chartId: string) => void;
  }

  let { parts, names, reading, onopen }: Props = $props();

  const { t } = getI18n();
</script>

<ResultCard label={$t("breakdownTitle")}>
  <ol class="parts">
    {#each parts as part, index (index)}
      <li>
        {#if part.chartId !== null}
          {@const chartId = part.chartId}
          <button
            type="button"
            class="part part--link"
            aria-label={$t("breakdownOpenChart", { name: names[index]! })}
            onclick={() => onopen(chartId)}
          >
            <AksaraText text={part.char} size="md" />
            <span class="part__name">{names[index]}</span>
            {#if part.sound !== ""}<span class="part__sound">{part.sound}</span
              >{/if}
            <Icon name="chevron-right" />
          </button>
        {:else}
          <div class="part">
            <AksaraText text={part.char} size="md" />
            <span class="part__name">{names[index]}</span>
            {#if part.sound !== ""}<span class="part__sound">{part.sound}</span
              >{/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
  <p class="reading">{$t("breakdownReading", { reading })}</p>
</ResultCard>

<style>
  .parts {
    display: grid;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .part {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    box-sizing: border-box;
    width: 100%;
    min-height: 48px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
    text-align: start;
  }

  .part--link {
    cursor: pointer;
  }

  .part__name {
    flex: 1;
    font-weight: var(--weight-bold);
  }

  .part__sound {
    color: var(--color-text-muted);
  }

  .reading {
    font-weight: var(--weight-bold);
  }
</style>
