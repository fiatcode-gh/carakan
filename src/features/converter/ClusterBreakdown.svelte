<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { nglegenaById, sandhanganById } from "../../engine/index.ts";
  import { getI18n } from "../../l10n/context.ts";
  import HandNote from "../../ui/HandNote.svelte";
  import { sandhanganFunctionMessageKey } from "../chart/detail-data.ts";
  import { glyphUnits } from "../lessons/unit-display.ts";
  import BreakdownRow from "./BreakdownRow.svelte";
  import type { ClusterPart } from "./cluster-parts.ts";

  interface Props {
    parts: readonly ClusterPart[];
    /** Display name per part, in the same order. */
    names: readonly string[];
    reading: string;
    onopen: (chartId: string) => void;
  }

  let { parts, names, reading, onopen }: Props = $props();

  const { t } = getI18n();
  const { content } = getServices();
  const units = glyphUnits(content.units);
  const uid = $props.id();
  const titleId = `breakdown-${uid}`;

  function captionOf(part: ClusterPart): string | null {
    if (part.subjoined || part.chartId === null) return null;
    if (nglegenaById(part.chartId) !== null) {
      return $t("breakdownCaptionCarakan");
    }
    const sandhangan = sandhanganById(part.chartId);
    return sandhangan === null
      ? null
      : $t(sandhanganFunctionMessageKey(sandhangan.function));
  }
</script>

<section class="breakdown" aria-labelledby={titleId}>
  <HandNote tag="h2" id={titleId}>{$t("breakdownTitle")}</HandNote>
  <ol class="parts">
    {#each parts as part, index (index)}
      {@const chartId = part.chartId}
      <li>
        <BreakdownRow
          {part}
          name={names[index]!}
          caption={captionOf(part)}
          accent={units.get(chartId ?? "")?.accent ?? null}
          onopen={chartId === null ? undefined : () => onopen(chartId)}
        />
      </li>
    {/each}
  </ol>
  <p class="reading latin">{$t("breakdownReading", { reading })}</p>
</section>

<style>
  .breakdown {
    display: grid;
    gap: var(--space-2);
  }

  .parts {
    display: grid;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .reading {
    font-weight: var(--weight-bold);
  }
</style>
