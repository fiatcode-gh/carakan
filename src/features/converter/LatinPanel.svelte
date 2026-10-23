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
  import { bareEChoices, eLetters, writeE, type EReading } from "./bare-e.ts";
  import { insertAtCursor, trackCaret } from "./insert-at-cursor.ts";

  let { oncopied }: { oncopied: () => void } = $props();

  const { t } = getI18n();
  const { content, clips } = getServices();
  const partTable = ClusterPartTable.build(content);
  // The page keys this panel on direction: a fresh converter, empty input (P-U02).
  const converter = new LatinToAksaraConverter(content.ruleset.id);
  const result = converter.state;
  let value = $state("");
  let chartLocation = $state<ChartLocation | null>(null);
  let element = $state<HTMLInputElement | HTMLTextAreaElement>();
  let resultElement = $state<HTMLElement>();
  // Null until the field has had a caret: a key then appends (as the picker).
  let caret: number | null = null;

  const accentKeys = [
    { reading: "pepet", labelKey: "latinKeyPepet", nameKey: "ePepetName" },
    { reading: "taling", labelKey: "latinKeyTaling", nameKey: "eTalingName" },
  ] as const;
  const eReadings = ["pepet", "taling"] as const;

  $effect(() => {
    const field = element;
    if (field === undefined) return;
    return trackCaret(field, (c) => (caret = c));
  });

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

  async function typeLetter(letter: string): Promise<void> {
    const offset = Math.min(Math.max(caret ?? value.length, 0), value.length);
    value = insertAtCursor(value, offset, letter);
    converter.input(value);
    await tick();
    const end = offset + letter.length;
    element?.focus();
    element?.setSelectionRange(end, end);
    caret = end;
  }

  async function chooseE(index: number, reading: EReading): Promise<void> {
    const leading = value.length - value.trimStart().length;
    value = writeE(value, leading + index, reading);
    converter.input(value);
    await tick();
    resultElement?.querySelector("button")?.focus();
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
      bind:element
      oninput={onInput}
      invalid={$result.kind === "error"}
    />
    <div class="accent-keys" role="group" aria-label={$t("latinKeysLabel")}>
      {#each accentKeys as key (key.reading)}
        <button
          type="button"
          class="accent-key press"
          aria-label={$t(key.labelKey)}
          onclick={() => void typeLetter(eLetters[key.reading])}
        >
          <span class="accent-key__letter">{eLetters[key.reading]}</span>
          <span class="accent-key__name">{$t(key.nameKey)}</span>
        </button>
      {/each}
    </div>
    {#if detail}
      <p class="source-echo latin">
        <span class="source-echo__label">{$t("sourceEchoLabel")}</span>
        {#each detail.echoParts as part, index (index)}
          {#if part.marked}<mark>{part.text}</mark>{:else}{part.text}{/if}
        {/each}
      </p>
    {/if}
  </div>

  <div class="panel__result" bind:this={resultElement}>
    {#if $result.kind === "error"}
      {@const parts = splitAtIndex(value.trim(), $result.index)}
      <ErrorNotice message={$result.message}>
        {#snippet echo()}
          {parts.before}{#if parts.marked !== ""}<mark>{parts.marked}</mark
            >{/if}{parts.after}
        {/snippet}
      </ErrorNotice>
    {:else if $result.kind === "bareE"}
      <ResultCard label={$t("ambiguousTitle")}>
        <ul class="e-choices">
          {#each bareEChoices($result.input, $result.bareE) as choice (choice.index)}
            <li class="e-choice">
              <span class="e-choice__word latin"
                >{choice.before}<mark>{choice.marked}</mark>{choice.after}</span
              >
              <span class="e-choice__options">
                {#each eReadings as reading (reading)}
                  <button
                    type="button"
                    class="e-option press"
                    aria-label={$t(
                      reading === "pepet" ? "eChoicePepet" : "eChoiceTaling",
                      { position: choice.position, word: choice.word },
                    )}
                    onclick={() => void chooseE(choice.index, reading)}
                  >
                    <span class="e-option__letter">{eLetters[reading]}</span>
                    {$t(reading === "pepet" ? "ePepetName" : "eTalingName")}
                  </button>
                {/each}
              </span>
            </li>
          {/each}
        </ul>
      </ResultCard>
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

  .accent-keys {
    display: flex;
    gap: var(--space-3);
  }

  .accent-key,
  .e-option {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
    min-height: var(--touch-min);
    min-width: var(--touch-min);
    padding: var(--space-1) var(--space-4);
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    font-family: var(--font-latin);
  }

  .accent-key__letter,
  .e-option__letter {
    font-size: var(--text-xl);
    font-weight: var(--weight-black);
  }

  .accent-key__name {
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .e-choices {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .e-choice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  .e-choice__word {
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .e-choice__options {
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

  .source-echo mark,
  .e-choice__word mark {
    padding-inline: 2px;
    background: var(--color-butter);
    color: var(--color-ink);
    font-weight: var(--weight-bold);
    text-decoration: underline;
    text-decoration-thickness: 3px;
  }
</style>
