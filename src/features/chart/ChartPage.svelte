<script lang="ts">
  import { tick } from "svelte";
  import { navigate } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import type { MessageKey } from "../../l10n/i18n.ts";
  import AksaraTile from "../../ui/AksaraTile.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import Page from "../../ui/Page.svelte";
  import Tabs from "../../ui/Tabs.svelte";
  import TextField from "../../ui/TextField.svelte";
  import { accentVar, type UnitAccent } from "../../ui/accent.ts";
  import { glyphUnits, splitUnitName } from "../lessons/unit-display.ts";
  import ChartDetailSheet from "./ChartDetailSheet.svelte";
  import {
    buildChartTabs,
    chartTabCount,
    filterChartTabs,
    findChartEntry,
    type ChartLocation,
    type ChartTab,
    type ChartTabId,
  } from "./chart-catalog.ts";
  import { chartStrings } from "./chart-strings.ts";

  interface LegendItem {
    index: number;
    accent: UnitAccent;
    label: string;
  }

  const { t } = getI18n();
  const { content, activeTab } = getServices();
  const uid = $props.id();
  const units = glyphUnits(content.units);

  // Rebuilt only when the UI language changes; the content is fixed.
  const chartTabs = $derived(
    buildChartTabs({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings: chartStrings($t),
      ruleset: content.ruleset,
    }),
  );
  const tabLabels = {
    carakan: "sectionCarakan",
    sandhangan: "chartTabSandhangan",
    pasangan: "pasanganLabel",
  } as const satisfies Record<ChartTabId, MessageKey>;

  // Page state: it survives a switch to another tab of the app (keep-alive).
  let selectedTab = $state<ChartTabId>("carakan");
  let opened = $state<ChartLocation | null>(null);
  let query = $state("");
  const shownTabs = $derived(filterChartTabs(chartTabs, query));

  // The page stays mounted when the learner leaves Bagan, so it clears itself.
  $effect(() => {
    if ($activeTab !== "chart") query = "";
  });

  /** The detail sheet counts an entry within its whole section, whatever the query shows. */
  function open(tabId: ChartTabId, entryId: string): void {
    opened = findChartEntry(
      chartTabs.filter((tab) => tab.id === tabId),
      entryId,
    );
  }

  /** The modal sheet must be closed before the shell goes inert for the pushed page. */
  async function trace(glyphId: string): Promise<void> {
    opened = null;
    await tick();
    navigate({ kind: "trace", glyphId });
  }

  /** Units that colour at least one tile of the tab, in ladder order. */
  function legendOf(tab: ChartTab): LegendItem[] {
    const used = new Map<number, LegendItem>();
    for (const section of tab.sections) {
      for (const entry of section.entries) {
        const glyphUnit = units.get(entry.id);
        if (glyphUnit === undefined) continue;
        const { unit, index, accent } = glyphUnit;
        used.set(index, {
          index,
          accent,
          label: splitUnitName(unit.name).head ?? unit.name,
        });
      }
    }
    return [...used.values()].sort((a, b) => a.index - b.index);
  }
</script>

<Page title={$t("chartTitle")} width="wide">
  {#snippet note()}
    <HandNote tilt>{$t("chartNote")}</HandNote>
  {/snippet}
  <div class="search">
    <TextField label={$t("chartSearchLabel")} bind:value={query} />
  </div>
  <Tabs
    label={$t("chartTabsLabel")}
    tabs={shownTabs.map((tab) => ({
      id: tab.id,
      label:
        shownTabs === chartTabs
          ? $t(tabLabels[tab.id])
          : $t("chartTabCount", {
              name: $t(tabLabels[tab.id]),
              count: chartTabCount(tab),
            }),
    }))}
    selected={selectedTab}
    onselect={(id) => (selectedTab = id as ChartTabId)}
  >
    {#snippet panel(id)}
      {@const tab = shownTabs.find((candidate) => candidate.id === id)!}
      <div class="stack">
        {#if chartTabCount(tab) === 0}
          <p class="none" role="status">{$t("searchNoMatch")}</p>
        {/if}
        {#each tab.sections as section (section.id)}
          <section class="section" aria-labelledby={`${uid}-h-${section.id}`}>
            <h2
              id={`${uid}-h-${section.id}`}
              class={section.id === "carakan" || section.id === "pasangan"
                ? "visually-hidden"
                : "eyebrow"}
            >
              {section.title}
            </h2>
            <div class="grid">
              {#each section.entries as entry (entry.id)}
                <AksaraTile
                  glyph={entry.char}
                  name={entry.name}
                  label={entry.tileLabel}
                  accent={units.get(entry.id)?.accent ?? null}
                  title={entry.name}
                  data-entry={entry.id}
                  onclick={() => open(tab.id, entry.id)}
                />
              {/each}
            </div>
          </section>
        {/each}
        <ul class="legend" aria-label={$t("chartLegendLabel")}>
          {#each legendOf(tab) as item (item.index)}
            <li>
              <span
                class="legend__swatch"
                style:background={accentVar(item.accent)}
                aria-hidden="true"
              ></span>
              {item.label}
            </li>
          {/each}
        </ul>
      </div>
    {/snippet}
  </Tabs>
</Page>

{#if opened}
  <ChartDetailSheet
    location={opened}
    examples={content.chartExamples.get(opened.entry.id) ?? []}
    onclose={() => (opened = null)}
    ontrace={(glyphId) => void trace(glyphId)}
  />
{/if}

<style>
  .search {
    margin-block-end: var(--space-4);
  }

  /* The tab panel is a focus stop: with only this line inside it stays a touch target. */
  .none {
    padding-block: var(--space-4);
    color: var(--color-ink-muted);
  }

  .section {
    display: grid;
    gap: var(--space-3);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
    gap: 10px;
  }

  @media (min-width: 48rem) {
    .grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  @media (min-width: 75rem) {
    .grid {
      grid-template-columns: repeat(10, minmax(0, 1fr));
    }
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--color-ink-muted);
    font-size: var(--text-caption);
    font-weight: var(--weight-bold);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .legend__swatch {
    flex: none;
    width: 22px;
    height: 22px;
    box-sizing: border-box;
    border: var(--border);
  }
</style>
