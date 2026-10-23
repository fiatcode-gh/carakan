<script lang="ts">
  import { navigate, routeLink } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import Icon from "../../ui/Icon.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";
  import Reading from "../../ui/Reading.svelte";
  import StateView from "../../ui/StateView.svelte";
  import StrengthBar from "../../ui/StrengthBar.svelte";
  import Surface from "../../ui/Surface.svelte";
  import { accentVar } from "../../ui/accent.ts";
  import { glyphUnits } from "../lessons/unit-display.ts";
  import { drillSession } from "./drill-session.ts";
  import DrillSection from "./DrillSection.svelte";
  import { reviewSession } from "./review-session.ts";
  import { strengthLabelKey } from "./strength.ts";

  const { t } = getI18n();
  const services = getServices();
  const { glyphInfo, activeTab } = services;
  const review = reviewSession(services);
  const drill = drillSession(services);
  const reviewState = review.state;
  const strengths = review.strengths;
  const drillState = drill.state;
  const units = glyphUnits(services.content.units);

  // W04: the list is re-queried whenever Ulangi opens (W03: no pull-to-refresh).
  $effect(() => {
    if ($activeTab === "review") void review.refresh();
  });

  // Resume: a long-hidden tab may have cards that came due meanwhile.
  function onVisibility(): void {
    if (document.visibilityState === "visible" && $activeTab === "review") {
      void review.refresh();
    }
  }

  // Positions of up to three cards, back to front; fewer cards sit at the right.
  const fan = [
    { rotate: -8, left: "0rem" },
    { rotate: 0, left: "1.1rem" },
    { rotate: 8, left: "2.2rem" },
  ];

  /** The first due glyphs, back card first; the front card is the next one due. */
  const stack = $derived.by(() => {
    if ($reviewState.kind !== "ready") return [];
    const front = $reviewState.items.slice(0, 3).reverse();
    return front.map(({ itemId }, i) => ({
      itemId,
      ...(fan[fan.length - front.length + i] as (typeof fan)[number]),
      accent:
        i === front.length - 1
          ? accentVar(units.get(itemId)?.accent ?? null)
          : "var(--color-card)",
    }));
  });

  const readingOf = (itemId: string): string => {
    const info = glyphInfo.byId.get(itemId);
    return info?.pujl || info?.name || itemId;
  };
</script>

<svelte:document onvisibilitychange={onVisibility} />

<Page title={$t("reviewTitle")}>
  {#snippet note()}
    <HandNote tilt>{$t("reviewNote")}</HandNote>
  {/snippet}
  {#snippet actions()}
    <IconButton
      icon="circle-help"
      label={$t("reviewHelpTitle")}
      {...routeLink({ kind: "reviewHelp" })}
    />
  {/snippet}
  <div class="stack stack--loose">
    {#if $reviewState.kind === "error"}
      <StateView
        kind="error"
        title={$t("storageErrorTitle")}
        icon="hard-drive"
        actionLabel={$t("retryButton")}
        onaction={() => void review.refresh()}
      />
    {:else}
      <Surface
        tag="section"
        tone="sage"
        shadow="hero"
        class="review-today"
        aria-labelledby="review-today-title"
      >
        <p class="eyebrow">{$t("reviewTodayLabel")}</p>
        {#if $reviewState.kind === "ready"}
          <div class="today__head">
            <h2 id="review-today-title" class="today__title">
              {$t("reviewDueCount", { count: $reviewState.items.length })}
            </h2>
            <div class="today__stack" aria-hidden="true">
              {#each stack as card (card.itemId)}
                <span
                  class="today__card"
                  style:--card-fill={card.accent}
                  style:--card-rotate="{card.rotate}deg"
                  style:--card-left={card.left}
                >
                  <AksaraText
                    text={glyphInfo.byId.get(card.itemId)?.char ?? card.itemId}
                    size="lg"
                  />
                </span>
              {/each}
            </div>
          </div>
          <Button
            variant="primary"
            block
            onclick={() => navigate({ kind: "reviewQuiz" })}
          >
            {$t("reviewStartButton")}
            <Icon name="arrow-right" small />
          </Button>
        {:else}
          <div class="today__empty">
            <Icon name="circle-check" />
            <h2 id="review-today-title" class="today__empty-title">
              {$t("reviewEmpty")}
            </h2>
          </div>
        {/if}
      </Surface>
    {/if}
    {#if $drillState.kind === "ready"}
      {#key $drillState.exercises}
        <DrillSection session={drill} drill={$drillState} />
      {/key}
    {:else if $drillState.kind === "error"}
      <StateView
        kind="error"
        title={$t("storageErrorTitle")}
        icon="hard-drive"
        actionLabel={$t("retryButton")}
        onaction={() => void drill.refresh()}
      />
    {/if}
    {#if $strengths.length > 0}
      <section class="stack" aria-labelledby="review-strength-title">
        <HandNote tag="h2" id="review-strength-title">
          {$t("strengthHeading")}
        </HandNote>
        <ul class="strengths">
          {#each $strengths as { itemId, level } (itemId)}
            {@const reading = readingOf(itemId)}
            <li class="strength-row">
              <span
                class="strength-row__glyph"
                role="img"
                aria-label={$t("aksaraName", { reading })}
              >
                <AksaraText
                  text={glyphInfo.byId.get(itemId)?.char ?? itemId}
                  size="md"
                  aria-hidden="true"
                />
              </span>
              <Reading class="strength-row__reading" text={reading} />
              <StrengthBar {level} />
              <span class="strength-row__label"
                >{$t(strengthLabelKey(level))}</span
              >
              <span class="visually-hidden">
                {$t("strengthSegments", { filled: level })}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</Page>

<style>
  .stack--loose {
    gap: var(--space-6);
  }

  .stack--loose > :global(.review-today) {
    padding: var(--space-4);
  }

  .today__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 9.5rem;
    margin-block: var(--space-2) var(--space-4);
  }

  .today__title {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: var(--text-syllable-l);
    font-weight: var(--weight-black);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .today__stack {
    position: relative;
    flex: none;
    width: 7.5rem;
    height: 8.5rem;
  }

  .today__card {
    position: absolute;
    top: 0.75rem;
    inset-inline-start: var(--card-left, 0);
    display: grid;
    place-items: center;
    width: 5.25rem;
    height: 6.5rem;
    box-sizing: border-box;
    border: var(--border);
    background: var(--card-fill, var(--color-card));
    rotate: var(--card-rotate, 0deg);
  }

  .today__card :global(.aksara) {
    font-size: var(--aksara-lg);
    line-height: 1;
    padding-block-end: 0.35em;
  }

  .today__empty {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 5rem;
    margin-block-start: var(--space-2);
  }

  .today__empty :global(.icon) {
    width: 2.5rem;
    height: 2.5rem;
  }

  .today__empty-title {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--weight-black);
    line-height: 1.1;
  }

  .strengths {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .strength-row {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 60px;
    box-sizing: border-box;
    padding: 0 12px;
    border: var(--border);
    background: var(--color-card);
  }

  .strength-row__glyph {
    display: grid;
    flex: none;
    place-items: center;
    width: 40px;
  }

  .strength-row__glyph :global(.aksara) {
    font-size: 28px;
    line-height: 1;
    padding-block-end: 0.35em;
  }

  .strength-row :global(.strength-row__reading) {
    flex: none;
    min-width: 36px;
    font-size: 18px;
    font-weight: var(--weight-black);
  }

  .strength-row__label {
    flex: none;
    min-width: 56px;
    color: var(--color-ink-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    text-align: end;
  }
</style>
