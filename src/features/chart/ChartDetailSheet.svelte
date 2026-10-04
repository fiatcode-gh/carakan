<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import { nglegenaById, sandhanganById } from "../../engine/index.ts";
  import type { Word } from "../../content/word.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import OrnamentDivider from "../../ui/OrnamentDivider.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import type { ChartEntry } from "./chart-catalog.ts";
  import {
    detailForNglegena,
    detailForSandhangan,
    sandhanganFunctionMessageKey,
  } from "./detail-data.ts";

  interface Props {
    entry: ChartEntry;
    examples: readonly Word[];
    onclose: () => void;
  }

  let { entry, examples, onclose }: Props = $props();

  const { t } = getI18n();

  const nglegena = $derived(
    nglegenaById(entry.id) === null ? null : detailForNglegena(entry.id),
  );
  const sandhangan = $derived(
    sandhanganById(entry.id) === null ? null : detailForSandhangan(entry.id),
  );
</script>

<Sheet title={entry.name} {onclose}>
  <div class="head">
    <span class="frame"><AksaraText text={entry.char} size="xl" /></span>
    <p class="subtitle">{entry.subtitle}</p>
  </div>

  {#if nglegena || sandhangan}
    <OrnamentDivider />
    <dl class="rows">
      {#if nglegena}
        <dt>{$t("soundLabel")}</dt>
        <dd>{nglegena.pujl} (JGST {nglegena.jgst})</dd>
        <dt>{$t("pasanganLabel")}</dt>
        <dd><AksaraText text={nglegena.pasanganDemo} size="lg" /></dd>
        {#if nglegena.murda !== null}
          <dt>{$t("murdaLabel")}</dt>
          <dd><AksaraText text={nglegena.murda} size="lg" /></dd>
        {/if}
      {:else if sandhangan}
        <dt>{$t("functionLabel")}</dt>
        <dd>{$t(sandhanganFunctionMessageKey(sandhangan.function))}</dd>
      {/if}
    </dl>
  {/if}

  {#if examples.length > 0}
    <OrnamentDivider />
    <section class="examples">
      <h3>{$t("exampleWordsHeading")}</h3>
      <ul class="words">
        {#each examples as word (word.id)}
          <li>
            <span class="reading">{word.display}</span>
            <AksaraText text={word.aksara} size="lg" />
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</Sheet>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .frame {
    display: grid;
    place-items: center;
    min-width: 5rem;
    min-height: 5rem;
    padding: 0 var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
  }

  .subtitle {
    color: var(--color-text-muted);
  }

  .rows {
    display: grid;
    grid-template-columns: 6.25rem 1fr;
    gap: var(--space-3) var(--space-3);
    align-items: center;
  }

  .rows dt {
    color: var(--color-text-muted);
  }

  .rows dd {
    margin: 0;
  }

  .examples {
    display: grid;
    gap: var(--space-2);
  }

  .examples h3 {
    font-size: var(--text-md);
  }

  .words {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Same label column as the rows above, so readings and aksara align. */
  .words li {
    display: grid;
    grid-template-columns: 6.25rem 1fr;
    gap: var(--space-3);
    align-items: center;
  }

  .reading {
    font-weight: var(--weight-bold);
  }
</style>
