<script lang="ts">
  import { tick } from "svelte";
  import { routeLink } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import type { ReviewGrade } from "../../core/srs/srs-scheduler.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";
  import Slip from "../../ui/Slip.svelte";
  import StateView from "../../ui/StateView.svelte";
  import { drillSession } from "./drill-session.ts";
  import DrillSection from "./DrillSection.svelte";
  import { reviewSession, type ReviewItemKind } from "./review-session.ts";

  const { t } = getI18n();
  const services = getServices();
  const { glyphInfo, activeTab } = services;
  const review = reviewSession(services);
  const drill = drillSession(services);
  const reviewState = review.state;
  const drillState = drill.state;

  let list = $state<HTMLElement>();

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

  const groupTitle = $derived({
    fresh: $t("reviewGroupFresh"),
    due: $t("reviewGroupDue"),
    retry: $t("reviewGroupRetry"),
  } satisfies Record<ReviewItemKind, string>);

  const grades: readonly {
    grade: ReviewGrade;
    variant: "secondary" | "primary";
  }[] = [
    { grade: "again", variant: "secondary" },
    { grade: "hard", variant: "secondary" },
    { grade: "good", variant: "primary" },
    { grade: "easy", variant: "secondary" },
  ];
  const gradeLabel = $derived({
    again: $t("gradeAgain"),
    hard: $t("gradeHard"),
    good: $t("gradeGood"),
    easy: $t("gradeEasy"),
  } satisfies Record<ReviewGrade, string>);

  /** Consecutive items of one kind form a run under one header. */
  const runs = $derived(
    $reviewState.kind === "ready"
      ? $reviewState.items.reduce<
          { kind: ReviewItemKind; items: typeof $reviewState.items }[]
        >((acc, item) => {
          const last = acc.at(-1);
          if (last?.kind === item.kind) {
            return [
              ...acc.slice(0, -1),
              { ...last, items: [...last.items, item] },
            ];
          }
          return [...acc, { kind: item.kind, items: [item] }];
        }, [])
      : [],
  );

  async function reveal(itemId: string): Promise<void> {
    await review.reveal(itemId);
    await tick();
    // The reveal button is gone; focus must not fall back to <body>.
    list
      ?.querySelector<HTMLElement>(`[data-grade-again="${CSS.escape(itemId)}"]`)
      ?.focus();
  }
</script>

<svelte:document onvisibilitychange={onVisibility} />

<Page title={$t("reviewTitle")}>
  {#snippet actions()}
    <IconButton
      icon="circle-help"
      label={$t("reviewHelpTitle")}
      {...routeLink({ kind: "reviewHelp" })}
    />
  {/snippet}
  <div class="stack stack--loose">
    {#if $drillState.kind === "ready"}
      {#key $drillState.exercises}
        <DrillSection session={drill} drill={$drillState} />
      {/key}
    {/if}
    {#if $reviewState.kind === "empty"}
      <StateView kind="empty" title={$t("reviewEmpty")} />
    {:else}
      <div class="stack stack--loose" bind:this={list}>
        {#each runs as run, r (r)}
          <section class="stack" aria-labelledby="review-group-{r}">
            <h2 id="review-group-{r}" class="section-title">
              {groupTitle[run.kind]}
            </h2>
            <ul class="cards">
              {#each run.items as item (item.itemId)}
                {@const info = glyphInfo.byId.get(item.itemId)}
                <li>
                  <Slip raised class="card">
                    <p class="card__glyph">
                      <AksaraText text={info?.char ?? item.itemId} size="xl" />
                    </p>
                    {#if item.revealed}
                      <p class="card__name">{info?.name ?? item.itemId}</p>
                      <div class="grades">
                        {#each grades as { grade, variant }}
                          <Button
                            {variant}
                            data-grade-again={grade === "again"
                              ? item.itemId
                              : undefined}
                            onclick={() =>
                              void review.grade(item.itemId, grade)}
                          >
                            {gradeLabel[grade]}
                          </Button>
                        {/each}
                      </div>
                    {:else}
                      <Button
                        variant="primary"
                        block
                        onclick={() => void reveal(item.itemId)}
                      >
                        {$t("revealAnswerButton")}
                      </Button>
                    {/if}
                  </Slip>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {/if}
  </div>
</Page>

<style>
  .stack--loose {
    gap: var(--space-6);
  }

  .section-title {
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
  }

  .cards {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  :global(.card) {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    text-align: center;
  }

  .card__glyph {
    line-height: 1.7;
  }

  .card__name {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
  }

  .grades {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    width: 100%;
  }
</style>
