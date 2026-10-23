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
  /** Tilt per tape layout: 0 top centre, 1 right edge, 2 left edge, 3 top left. */
  const tapeRotations = [3, 6, -5, -2] as const;
  // Tiles sit two per row from number 2. Rows alternate between tapes on the
  // top edge and tapes on the outer side edge, so no two tapes meet in a gap.
  const tapeVariant = $derived.by(() => {
    const row = Math.floor((number - 2) / 2);
    const leftColumn = number % 2 === 0;
    if (row % 2 === 1) return leftColumn ? 2 : 1;
    return (row % 4 === 0) === leftColumn ? 0 : 3;
  });
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
   * Four tape layouts, picked by grid position so a grid looks stuck on by hand.
   * Each stays clear of the number (top left), the status icon (top right)
   * and the title (bottom left).
   */
  .tile__tape {
    position: absolute;
    top: -9px;
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

  /*
   * Side tapes are upright strips with a slight tilt, not rotated horizontal
   * ones: a rotated strip's layout box would still poke past the page edge.
   * Each sticks out 9px past the outer edge of its column.
   */
  .tile__tape[data-variant="1"] {
    top: 50px;
    right: -9px;
  }

  .tile__tape[data-variant="2"] {
    top: 34px;
    left: -9px;
  }

  .tile__tape[data-variant="1"] :global(.tape),
  .tile__tape[data-variant="2"] :global(.tape) {
    width: 18px;
    height: 44px;
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
