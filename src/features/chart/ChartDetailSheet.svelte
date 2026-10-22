<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import { nglegenaById, sandhanganById } from "../../engine/index.ts";
  import type { Word } from "../../content/word.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import Reading from "../../ui/Reading.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import { accentVar, glyphUnits } from "../lessons/unit-display.ts";
  import { pasanganBaseId, type ChartLocation } from "./chart-catalog.ts";
  import {
    detailForNglegena,
    detailForSandhangan,
    sandhanganFunctionMessageKey,
  } from "./detail-data.ts";

  interface Props {
    location: ChartLocation;
    examples: readonly Word[];
    onclose: () => void;
  }

  let { location, examples, onclose }: Props = $props();

  const { t } = getI18n();
  const { content } = getServices();
  const units = glyphUnits(content.units);

  const entry = $derived(location.entry);
  const reading = $derived(entry.reading ?? entry.name);
  const accent = $derived(units.get(entry.id)?.accent ?? null);
  const nglegena = $derived(
    nglegenaById(entry.id) === null
      ? null
      : detailForNglegena(entry.id, content.ruleset),
  );
  const sandhangan = $derived(
    sandhanganById(entry.id) === null ? null : detailForSandhangan(entry.id),
  );
  const baseLetter = $derived.by(() => {
    const baseId = pasanganBaseId(entry.id);
    return baseId === null ? null : nglegenaById(baseId)!.char;
  });
</script>

<Sheet
  title={$t("chartDetailTitle", {
    name: entry.name,
    section: location.section.title,
    number: String(location.position).padStart(2, "0"),
    total: location.section.entries.length,
  })}
  titleStyle="eyebrow"
  {onclose}
>
  <div class="head">
    <span
      class="glyph-box"
      style:--accent={accentVar(accent)}
      role="img"
      aria-label={$t("aksaraName", { reading })}
    >
      <AksaraText text={entry.char} size="xl" />
    </span>
    <div class="head__text">
      <p class="eyebrow head__label">{$t("readingLabel")}</p>
      <p class="head__reading" style:--chars={reading.length}>
        <Reading text={reading} />
      </p>
      <p class="subtitle"><Reading text={entry.subtitle} /></p>
    </div>
  </div>

  {#if nglegena || sandhangan || baseLetter}
    <div class="boxes">
      {#if nglegena}
        <div class="box">
          <p class="eyebrow box__label">{$t("pasanganLabel")}</p>
          <AksaraText
            class="box__aksara"
            text={nglegena.pasanganDemo}
            size="lg"
          />
        </div>
        {#if nglegena.murda !== null}
          <div class="box">
            <p class="eyebrow box__label">{$t("murdaLabel")}</p>
            <AksaraText class="box__aksara" text={nglegena.murda} size="lg" />
          </div>
        {/if}
      {:else if sandhangan}
        <div class="box">
          <p class="eyebrow box__label">{$t("functionLabel")}</p>
          <p class="box__value">
            {$t(sandhanganFunctionMessageKey(sandhangan.function))}
          </p>
        </div>
      {:else if baseLetter}
        <div class="box">
          <p class="eyebrow box__label">{$t("baseLetterLabel")}</p>
          <AksaraText class="box__aksara" text={baseLetter} size="lg" />
        </div>
      {/if}
    </div>
  {/if}

  {#if examples.length > 0}
    <section class="examples">
      <HandNote tag="h3">{$t("exampleWordsHeading")}</HandNote>
      <ul class="words">
        {#each examples as word (word.id)}
          <li>
            <Reading class="word-reading" text={word.display} />
            <AksaraText class="word-aksara" text={word.aksara} size="lg" />
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</Sheet>

<style>
  .head {
    display: flex;
    gap: var(--space-4);
    align-items: stretch;
  }

  .glyph-box {
    display: grid;
    place-items: center;
    flex: none;
    width: 9.375rem;
    min-height: 10rem;
    border: var(--border);
    background: var(--accent);
    box-shadow: var(--shadow-hero);
  }

  .head__text {
    flex: 1;
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-width: 0;
  }

  .head__label {
    margin: 0;
    color: var(--color-ink-muted);
  }

  /* Long names (pa cerek (rě)) shrink to fit the column rather than clip. */
  .head__reading {
    margin: 0;
    font-size: min(var(--text-syllable-xl), calc(20rem / var(--chars, 1)));
    font-weight: var(--weight-black);
    line-height: 1;
    letter-spacing: var(--tracking-title);
    overflow-wrap: anywhere;
  }

  .head__reading :global(.reading) {
    font-weight: var(--weight-black);
  }

  .subtitle {
    margin: 0;
    color: var(--color-ink-muted);
  }

  .boxes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .box {
    padding: var(--space-2) var(--space-3);
    border: var(--border);
    background: var(--color-card);
  }

  .box__label {
    margin: 0;
    color: var(--color-ink-muted);
  }

  .box__value {
    margin: var(--space-1) 0 0;
  }

  .box :global(.box__aksara) {
    display: block;
    line-height: 1.5;
    padding-block-end: 0.3em;
  }

  .examples {
    display: grid;
    gap: var(--space-1);
  }

  .words {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .words li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 4.5rem;
    border-bottom: var(--border-dashed);
  }

  .words :global(.word-reading) {
    font-size: var(--text-lg);
    font-weight: var(--weight-black);
  }

  .words :global(.word-aksara) {
    padding-block-end: var(--aksara-room);
    line-height: 1.25;
    text-align: end;
  }
</style>
