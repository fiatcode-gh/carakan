<script lang="ts">
  import { tick } from "svelte";
  import { navigate } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Chip from "../../ui/Chip.svelte";
  import Icon from "../../ui/Icon.svelte";
  import TextField from "../../ui/TextField.svelte";
  import ChartDetailSheet from "../chart/ChartDetailSheet.svelte";
  import {
    buildChartTabs,
    findChartEntry,
    type ChartLocation,
  } from "../chart/chart-catalog.ts";
  import { chartStrings } from "../chart/chart-strings.ts";
  import ClusterBreakdown from "./ClusterBreakdown.svelte";
  import ClusterResult from "./ClusterResult.svelte";
  import { ClusterPartTable, clusterReading } from "./cluster-parts.ts";
  import { splitAtIndex } from "./error-echo.ts";
  import { ambiguityTitleKey } from "./engine-messages.ts";
  import ErrorNotice from "./ErrorNotice.svelte";
  import { LatinToAksaraConverter } from "./latin-to-aksara-state.ts";
  import SoundButton from "../../ui/SoundButton.svelte";
  import ResultCard from "./ResultCard.svelte";
  import { markSpans } from "./source-echo.ts";

  let { oncopied }: { oncopied: () => void } = $props();

  const { t } = getI18n();
  const { content, clips } = getServices();
  const partTable = ClusterPartTable.build(content);
  // The page keys this panel on direction: a fresh converter, empty input (P-U02).
  const converter = new LatinToAksaraConverter(content.ruleset.id);
  const result = converter.state;
  let value = $state("");
  let chartLocation = $state<ChartLocation | null>(null);

  /** The modal sheet must be closed before the shell goes inert for the pushed page. */
  async function trace(glyphId: string): Promise<void> {
    chartLocation = null;
    await tick();
    navigate({ kind: "trace", glyphId });
  }

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
    chartLocation = findChartEntry(
      buildChartTabs({
        aksara: content.aksara,
        sandhangan: content.sandhangan,
        strings: chartStrings($t),
        ruleset: content.ruleset,
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
  <div class="panel__source">
    <TextField
      label={$t("inputHintLatin")}
      labelStyle="hand"
      multiline
      rows={2}
      bind:value
      oninput={onInput}
      invalid={$result.kind === "error"}
    />
    {#if detail}
      <p class="source-echo latin">
        <span class="source-echo__label">{$t("sourceEchoLabel")}</span>
        {#each detail.echoParts as part, index (index)}
          {#if part.marked}<mark>{part.text}</mark>{:else}{part.text}{/if}
        {/each}
      </p>
    {/if}
  </div>

  <div class="panel__result">
    {#if $result.kind === "error"}
      {@const parts = splitAtIndex(value.trim(), $result.index)}
      <ErrorNotice message={$result.message}>
        {#snippet echo()}
          {parts.before}{#if parts.marked !== ""}<mark>{parts.marked}</mark
            >{/if}{parts.after}
        {/snippet}
      </ErrorNotice>
    {:else if $result.kind === "ambiguous"}
      <ResultCard label={$t(ambiguityTitleKey($result.reason))}>
        <div class="chips">
          {#each $result.candidates as candidate, index (index)}
            <Chip onclick={() => converter.choose(index)}>
              <AksaraText text={candidate.output} size="md" />
            </Chip>
          {/each}
        </div>
      </ResultCard>
    {:else if $result.kind === "idle" && detail}
      <ResultCard label={$t("outputLabel")} tone="coral" tape>
        <ClusterResult
          output={$result.output}
          clusters={$result.clusters}
          labels={detail.labels}
          selected={$result.selected}
          onselect={(i) => converter.select(i)}
        />
        {#snippet actions()}
          <button type="button" onclick={copy}>
            <Icon name="copy" />{$t("copyButton")}
          </button>
          <SoundButton
            player={clips}
            clipKey={$result.input.trim()}
            label={$t("playSound", { reading: $result.input.trim() })}
            text={$t("listenButton")}
          />
        {/snippet}
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
</div>

{#if chartLocation}
  <ChartDetailSheet
    location={chartLocation}
    examples={content.chartExamples.get(chartLocation.entry.id) ?? []}
    onclose={() => (chartLocation = null)}
    ontrace={(glyphId) => void trace(glyphId)}
  />
{/if}

<style>
  .panel {
    display: grid;
    gap: var(--space-4);
  }

  .panel__source,
  .panel__result {
    display: contents;
  }

  @media (min-width: 64rem) {
    .panel {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }

    .panel__source,
    .panel__result {
      display: grid;
      gap: var(--space-4);
    }
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .source-echo {
    padding: var(--space-3) var(--space-4);
    border: var(--border);
    background: var(--color-card);
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .source-echo__label {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
  }

  .source-echo mark {
    padding-inline: 2px;
    background: var(--color-butter);
    color: var(--color-ink);
    font-weight: var(--weight-bold);
    text-decoration: underline;
    text-decoration-thickness: 3px;
  }
</style>
