<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import Chip from "../../ui/Chip.svelte";
  import Icon from "../../ui/Icon.svelte";
  import TextField from "../../ui/TextField.svelte";
  import ChartDetailSheet from "../chart/ChartDetailSheet.svelte";
  import {
    buildChartSections,
    findChartEntry,
    type ChartEntry,
  } from "../chart/chart-catalog.ts";
  import { chartStrings } from "../chart/chart-strings.ts";
  import ClusterBreakdown from "./ClusterBreakdown.svelte";
  import ClusterResult from "./ClusterResult.svelte";
  import { ClusterPartTable, clusterReading } from "./cluster-parts.ts";
  import { splitAtIndex } from "./error-echo.ts";
  import ErrorNotice from "./ErrorNotice.svelte";
  import { LatinToAksaraConverter } from "./latin-to-aksara-state.ts";
  import ResultCard from "./ResultCard.svelte";
  import { markSpans } from "./source-echo.ts";

  let { oncopied }: { oncopied: () => void } = $props();

  const { t } = getI18n();
  const { content } = getServices();
  const partTable = ClusterPartTable.build(content);
  // The page keys this panel on direction: a fresh converter, empty input (P-U02).
  const converter = new LatinToAksaraConverter();
  const result = converter.state;
  let value = $state("");
  let chartEntry = $state<ChartEntry | null>(null);

  const detail = $derived.by(() => {
    const state = $result;
    if (state.kind !== "idle") return null;
    const { input, output, clusters, selected } = state;
    const selection = selected === null ? null : clusters[selected]!;
    const labels = clusters.map((c) =>
      $t("clusterLabel", { reading: clusterReading(input, c) }),
    );
    const parts = selection
      ? partTable.partsOf(
          output.slice(selection.output.start, selection.output.end),
        )
      : [];
    const names = parts.map((p) =>
      p.subjoined ? $t("breakdownPasangan", { name: p.name }) : p.name,
    );
    const reading = selection ? clusterReading(input, selection) : "";
    return {
      selection,
      labels,
      parts,
      names,
      reading,
      echoParts: markSpans(input, selection?.sources ?? []),
      announcement: selection
        ? $t("clusterAnnouncement", { reading, parts: names.join(", ") })
        : "",
    };
  });

  function onInput(): void {
    converter.input(value);
  }

  function openChart(id: string): void {
    chartEntry = findChartEntry(
      buildChartSections({
        aksara: content.aksara,
        sandhangan: content.sandhangan,
        strings: chartStrings($t),
      }),
      id,
    );
  }

  async function copy(): Promise<void> {
    const copied = await converter.copy((s) =>
      navigator.clipboard.writeText(s),
    );
    if (copied) oncopied();
  }
</script>

<div class="panel">
  <TextField
    label={$t("inputHintLatin")}
    multiline
    bind:value
    oninput={onInput}
    invalid={$result.kind === "error"}
  />

  {#if detail}
    <p class="source-echo">
      <span class="source-echo__label">{$t("sourceEchoLabel")}</span>
      {#each detail.echoParts as part, index (index)}
        {#if part.marked}<mark>{part.text}</mark>{:else}{part.text}{/if}
      {/each}
    </p>
  {/if}

  {#if $result.kind === "error"}
    {@const parts = splitAtIndex(value.trim(), $result.index)}
    <ErrorNotice message={$result.message}>
      {#snippet echo()}
        {parts.before}{#if parts.marked !== ""}<mark>{parts.marked}</mark
          >{/if}{parts.after}
      {/snippet}
    </ErrorNotice>
  {:else if $result.kind === "ambiguous"}
    <ResultCard label={$t("ambiguousTitle")}>
      <div class="chips">
        {#each $result.candidates as candidate, index (index)}
          <Chip variant="choice" onclick={() => converter.choose(index)}>
            <AksaraText text={candidate.output} size="sm" />
          </Chip>
        {/each}
      </div>
    </ResultCard>
  {:else if $result.kind === "idle" && detail}
    <ResultCard label={$t("outputLabel")}>
      <ClusterResult
        output={$result.output}
        clusters={$result.clusters}
        labels={detail.labels}
        selected={$result.selected}
        onselect={(i) => converter.select(i)}
      />
      <Button variant="primary" block onclick={copy}>
        <Icon name="copy" />{$t("copyButton")}
      </Button>
    </ResultCard>
    {#if detail.selection}
      <ClusterBreakdown
        parts={detail.parts}
        names={detail.names}
        reading={detail.reading}
        onopen={openChart}
      />
    {/if}
  {/if}

  {#if detail}
    <p class="visually-hidden cluster-status" role="status">
      {detail.announcement}
    </p>
  {/if}
</div>

{#if chartEntry}
  <ChartDetailSheet
    entry={chartEntry}
    examples={content.chartExamples.get(chartEntry.id) ?? []}
    onclose={() => (chartEntry = null)}
  />
{/if}

<style>
  .panel {
    display: grid;
    gap: var(--space-4);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .source-echo {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .source-echo__label {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .source-echo mark {
    padding-inline: 2px;
    border-radius: 4px;
    background: var(--color-reward-soft);
    color: var(--color-text);
    font-weight: var(--weight-bold);
    text-decoration: underline;
    text-decoration-thickness: 3px;
  }
</style>
