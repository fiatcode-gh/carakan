<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Reading from "../../ui/Reading.svelte";
  import Surface from "../../ui/Surface.svelte";
  import Tape from "../../ui/Tape.svelte";
  import type { Unit } from "../../content/unit.ts";
  import type { UnitAccent } from "../../ui/accent.ts";
  import { splitUnitName } from "./unit-display.ts";

  interface Props {
    unit: Unit;
    /** 1-based position on the ladder. */
    number: number;
    accent: UnitAccent;
    /** The unit's first glyph, drawn huge and cropped behind the text. */
    watermark: string;
    onstart: () => void;
  }

  const { unit, number, accent, watermark, onstart }: Props = $props();
  const { t } = getI18n();

  const name = $derived(splitUnitName(unit.name));
  const titleId = $derived(`hero-${unit.id}`);
</script>

<Surface
  tag="section"
  tone={accent}
  shadow="hero"
  class="hero"
  aria-labelledby={titleId}
>
  <span class="hero__tape"><Tape rotate={-3} on={accent} /></span>
  {#if watermark !== ""}
    <!-- Crops the watermark at the card edge; the card itself does not clip, so the tape can stick out above it. -->
    <span class="hero__crop" aria-hidden="true">
      <AksaraText text={watermark} class="hero__mark" aria-hidden="true" />
    </span>
  {/if}
  <p class="eyebrow hero__eyebrow">
    {String(number).padStart(2, "0")}{name.head === null
      ? ""
      : ` — ${name.head}`}
  </p>
  <h2 id={titleId} class="hero__title">
    <Reading
      text={name.tail}
      class={["hero__reading", name.head !== null && "hero__reading--stack"]}
    />
  </h2>
  <Button
    variant="primary"
    class="hero__start"
    data-unit={unit.id}
    data-status="ready"
    onclick={onstart}
  >
    <Icon name="pencil" />
    {$t("startLessonButton")}
    <span class="visually-hidden"> {unit.name}</span>
  </Button>
</Surface>

<style>
  :global(.hero) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    min-height: 250px;
    padding: var(--space-4);
  }

  .hero__crop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .hero__tape {
    position: absolute;
    top: -10px;
    left: 50%;
    margin-left: -42px;
    z-index: 2;
  }

  /* Big and cropped as decoration, but most of the glyph stays readable. */
  :global(.hero .hero__mark) {
    position: absolute;
    right: -40px;
    bottom: -44px;
    font-size: 300px;
    line-height: 1;
    white-space: nowrap;
    opacity: 0.5;
    pointer-events: none;
  }

  .hero__eyebrow {
    position: relative;
    margin: var(--space-1) 0 0;
  }

  .hero__title {
    position: relative;
    flex: 1;
    margin: 0;
    font-size: var(--text-syllable-l);
    font-weight: var(--weight-black);
    line-height: 0.95;
    letter-spacing: -0.03em;
  }

  :global(.hero .hero__reading--stack) {
    display: block;
    width: min-content;
  }

  :global(.hero .hero__start) {
    position: relative;
    gap: var(--space-2);
    font-size: var(--text-md);
  }
</style>
