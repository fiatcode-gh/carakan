<script lang="ts">
  import type { Unit } from "../../content/unit.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Reading from "../../ui/Reading.svelte";
  import type { UnitStatus } from "./ladder.ts";
  import { accentVar, type UnitAccent } from "../../ui/accent.ts";
  import { splitUnitName } from "./unit-display.ts";

  interface Props {
    unit: Unit;
    /** 1-based position on the ladder. */
    number: number;
    status: UnitStatus;
    accent: UnitAccent;
    watermark: string;
    /** Absent while locked. */
    onopen?: () => void;
  }

  const { unit, number, status, accent, watermark, onopen }: Props = $props();
  const { t } = getI18n();

  const name = $derived(splitUnitName(unit.name));
  const statusLabel = $derived(
    {
      locked: $t("unitStatusLocked"),
      ready: $t("unitStatusReady"),
      completed: $t("unitStatusCompleted"),
    }[status],
  );
  const statusIcon = {
    locked: "lock",
    ready: "play",
    completed: "circle-check",
  } as const;
</script>

<button
  type="button"
  class="tile press"
  style:--accent={accentVar(accent)}
  data-unit={unit.id}
  data-status={status}
  aria-disabled={status === "locked" ? "true" : undefined}
  onclick={status === "locked" ? undefined : onopen}
>
  {#if watermark !== ""}
    <AksaraText text={watermark} class="tile__mark" aria-hidden="true" />
  {/if}
  <span class="eyebrow tile__number" aria-hidden="true"
    >{String(number).padStart(2, "0")}</span
  >
  <Icon
    name={statusIcon[status]}
    class="tile__status"
    data-icon={statusIcon[status]}
  />
  <span class="visually-hidden">{number}. {unit.name}, {statusLabel}</span>
  <span class="tile__title" aria-hidden="true"
    ><Reading text={name.tail} /></span
  >
</button>

<style>
  .tile {
    --press-depth: 0px;
    position: relative;
    display: block;
    width: 100%;
    height: 130px;
    padding: 0;
    overflow: hidden;
    border: var(--border);
    background: var(--accent);
    color: var(--color-ink);
    text-align: start;
  }

  .tile :global(.tile__mark) {
    position: absolute;
    right: -12px;
    bottom: -40px;
    font-size: 120px;
    line-height: 1;
    white-space: nowrap;
    opacity: 0.28;
    pointer-events: none;
  }

  .tile__number {
    position: absolute;
    top: 10px;
    left: 12px;
  }

  .tile :global(.tile__status) {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 20px;
    height: 20px;
  }

  .tile__title {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    font-size: 22px;
    font-weight: var(--weight-black);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .tile[aria-disabled="true"] {
    cursor: not-allowed;
  }
</style>
