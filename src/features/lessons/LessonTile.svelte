<script lang="ts">
  import type { Unit } from "../../content/unit.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Reading from "../../ui/Reading.svelte";
  import Tape from "../../ui/Tape.svelte";
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
  /** Tilt per tape layout: 0 centre, 1 right, 2 left, 3 wide left of centre. */
  const tapeRotations = [3, -5, 4, -2] as const;
  const tapeVariant = $derived(((number - 2) % 4) as 0 | 1 | 2 | 3);
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
  <span class="tile__tape" data-variant={tapeVariant}
    ><Tape rotate={tapeRotations[tapeVariant]} on={accent} /></span
  >
  {#if watermark !== ""}
    <!-- Crops the watermark at the tile edge; the tile itself does not clip, so the tape can stick out above it. -->
    <span class="tile__crop" aria-hidden="true">
      <AksaraText text={watermark} class="tile__mark" aria-hidden="true" />
    </span>
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
    border: var(--border);
    background: var(--accent);
    color: var(--color-ink);
    text-align: start;
  }

  /*
   * Four tape layouts along the top edge, cycled by tile number so a grid
   * looks stuck on by hand. The tape sits above the row with the number and
   * the status icon, so it covers neither. The grid's row gap leaves room for
   * the part that sticks out above the tile.
   */
  .tile__tape {
    position: absolute;
    top: -12px;
    z-index: 1;
  }

  .tile__tape :global(.tape) {
    height: 18px;
  }

  .tile__tape[data-variant="0"] {
    left: calc(50% - 28px);
  }

  .tile__tape[data-variant="0"] :global(.tape) {
    width: 56px;
  }

  .tile__tape[data-variant="1"] {
    right: 14px;
  }

  .tile__tape[data-variant="1"] :global(.tape) {
    width: 48px;
  }

  .tile__tape[data-variant="2"] {
    left: 14px;
  }

  .tile__tape[data-variant="2"] :global(.tape) {
    width: 52px;
  }

  .tile__tape[data-variant="3"] {
    left: 30%;
  }

  .tile__tape[data-variant="3"] :global(.tape) {
    width: 64px;
  }

  .tile__crop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  /* Big and cropped as decoration, but most of the glyph stays readable. */
  .tile :global(.tile__mark) {
    position: absolute;
    right: -24px;
    bottom: -26px;
    font-size: 140px;
    line-height: 1;
    white-space: nowrap;
    opacity: 0.25;
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
