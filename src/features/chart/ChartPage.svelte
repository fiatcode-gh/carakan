<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import GlyphTile from "../../ui/GlyphTile.svelte";
  import OrnamentDivider from "../../ui/OrnamentDivider.svelte";
  import Page from "../../ui/Page.svelte";
  import ChartDetailSheet from "./ChartDetailSheet.svelte";
  import { buildChartSections, type ChartEntry } from "./chart-catalog.ts";
  import { chartStrings } from "./chart-strings.ts";

  const { t } = getI18n();
  const { content } = getServices();
  const uid = $props.id();

  // Rebuilt only when the UI language changes; the content is fixed.
  const sections = $derived(
    buildChartSections({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings: chartStrings($t),
    }),
  );

  let selected = $state<ChartEntry | null>(null);
</script>

<Page title={$t("chartTitle")}>
  <div class="stack">
    {#each sections as section, index (index)}
      <section class="section" aria-labelledby={`${uid}-h-${index}`}>
        <h2 class="section-title" id={`${uid}-h-${index}`}>{section.title}</h2>
        <OrnamentDivider />
        <div class="grid">
          {#each section.entries as entry (entry.id)}
            <GlyphTile
              glyph={entry.char}
              name={entry.name}
              title={entry.name}
              data-entry={entry.id}
              onclick={() => (selected = entry)}
            />
          {/each}
        </div>
      </section>
    {/each}
  </div>
</Page>

{#if selected}
  <ChartDetailSheet
    entry={selected}
    examples={content.chartExamples.get(selected.id) ?? []}
    onclose={() => (selected = null)}
  />
{/if}

<style>
  .section {
    display: grid;
    gap: var(--space-3);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
    gap: var(--space-3);
  }
</style>
