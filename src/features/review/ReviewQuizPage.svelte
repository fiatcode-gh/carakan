<script lang="ts">
  import { onMount } from "svelte";
  import { back } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Page from "../../ui/Page.svelte";
  import PrimaryBar from "../../ui/PrimaryBar.svelte";
  import StateView from "../../ui/StateView.svelte";
  import Surface from "../../ui/Surface.svelte";
  import QuizStep from "../lessons/QuizStep.svelte";
  import { createReviewQuiz } from "./review-quiz.ts";

  const { t } = getI18n();
  const quiz = createReviewQuiz(getServices());
  const quizState = quiz.state;
  const failedStore = quiz.failed;
  const current = $derived($quizState);

  onMount(() => void quiz.start());

  const viewKey = $derived(
    current.kind === "question" || current.kind === "feedback"
      ? `${current.kind}-${current.number}`
      : current.kind,
  );

  // Every step re-creates the view, destroying the button just activated, so
  // focus is placed again: first option, Continue, feedback or the heading.
  let quizEl = $state<HTMLElement>();
  let firstKey = true;
  $effect(() => {
    void viewKey;
    if (firstKey) {
      firstKey = false;
      return;
    }
    quizEl?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  });
</script>

<Page title={$t("navReview")} chrome="none">
  {#key viewKey}
    <div class="review-quiz" bind:this={quizEl}>
      {#if $failedStore}
        <div class="failure" role="alert">
          <Icon name="triangle-alert" />
          <p>{$t("storageErrorTitle")}</p>
          <Button variant="secondary" onclick={() => void quiz.retry()}>
            <Icon name="refresh-cw" />{$t("retryButton")}
          </Button>
        </div>
      {/if}
      {#if current.kind === "loading"}
        <StateView kind="loading" title={$t("loadingLabel")} page />
      {:else if current.kind === "empty"}
        <div class="quiz-end">
          <div class="quiz-end__body">
            <StateView kind="empty" title={$t("reviewEmpty")} />
          </div>
          <PrimaryBar primary={{ label: $t("backButton"), onclick: back }} />
        </div>
      {:else if current.kind === "question" || current.kind === "feedback"}
        <QuizStep
          exercise={current.exercise}
          number={current.number}
          total={current.total}
          phase={current.kind}
          selectedIndex={current.kind === "feedback"
            ? current.selectedIndex
            : undefined}
          correct={current.kind === "feedback" ? current.correct : undefined}
          onanswer={(index) => void quiz.answer(index)}
          oncontinue={() => quiz.continue()}
          onclose={back}
        />
      {:else}
        <div class="quiz-end quiz-done">
          <div class="quiz-end__body">
            <Surface tone="sage" shadow="hero" class="quiz-end__card">
              <h2 class="quiz-end__title" tabindex="-1" data-autofocus>
                {$t("lessonDone", {
                  correct: current.correct,
                  total: current.total,
                })}
              </h2>
            </Surface>
          </div>
          <PrimaryBar primary={{ label: $t("backButton"), onclick: back }} />
        </div>
      {/if}
    </div>
  {/key}
</Page>

<style>
  .review-quiz {
    display: flex;
    flex-direction: column;
    animation: rise var(--dur-base) var(--ease-out) backwards;
  }

  .failure {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
    margin-block-end: var(--space-4);
    padding: var(--space-4);
    border: 2px dashed var(--color-stamp);
    background: var(--color-card);
    color: var(--color-stamp);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  /* The done and empty views bleed out of the page padding so the primary bar
     spans the column, as the quiz does. */
  .quiz-end {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    margin: calc(-1 * var(--space-4)) calc(-1 * var(--gutter))
      calc(-1 * var(--space-9));
  }

  .quiz-end > :global(.bar) {
    margin-top: auto;
  }

  .quiz-end__body {
    display: grid;
    flex: 1;
    place-items: center;
    padding: var(--gutter);
  }

  .quiz-end :global(.quiz-end__card) {
    width: 100%;
    padding: var(--space-8) var(--space-5);
    text-align: center;
  }

  /* The heading takes focus when the run ends; it is not a control. */
  .quiz-end__title:focus {
    outline: none;
  }

  .quiz-end__title {
    margin: 0;
    font-size: var(--text-xl);
  }
</style>
