<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Chip from "../../ui/Chip.svelte";
  import Flashcard from "../../ui/Flashcard.svelte";
  import Icon from "../../ui/Icon.svelte";
  import OrnamentDivider from "../../ui/OrnamentDivider.svelte";
  import Slip from "../../ui/Slip.svelte";
  import type { LessonSession } from "./lesson-session.ts";

  let { session }: { session: LessonSession } = $props();

  const { t } = getI18n();
  const { glyphInfo } = getServices();
  const lesson = $derived(session.state);
  const current = $derived($lesson);
  const failedStore = $derived(session.failed);
  const failed = $derived($failedStore);

  const viewKey = $derived(
    current.kind === "meet"
      ? `meet-${current.index}`
      : current.kind === "question"
        ? `question-${current.number}`
        : current.kind === "feedback"
          ? `feedback-${current.number}`
          : current.kind,
  );

  // Every step re-creates the view, destroying the button just activated, so
  // focus is placed again: first option, Continue, feedback or the heading.
  // The page's own focus handling covers the first render.
  let lessonEl = $state<HTMLElement>();
  let firstKey = true;
  $effect(() => {
    void viewKey;
    if (firstKey) {
      firstKey = false;
      return;
    }
    lessonEl?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  });

  function promptChar(glyphId: string): string {
    return glyphInfo.byId.get(glyphId)?.char ?? "";
  }

  function promptName(glyphId: string): string {
    return glyphInfo.byId.get(glyphId)?.name ?? "";
  }

  function promptPujl(glyphId: string): string {
    return glyphInfo.byId.get(glyphId)?.pujl ?? "";
  }
</script>

{#key viewKey}
  <div class="lesson" bind:this={lessonEl}>
    {#if failed}
      <div class="lesson__failure" role="alert">
        <Icon name="hard-drive" />
        <p>{$t("storageErrorTitle")}</p>
        <Button variant="secondary" onclick={() => void session.retry()}>
          <Icon name="refresh-cw" />{$t("retryButton")}
        </Button>
      </div>
    {/if}
    {#if current.kind === "meet"}
      <div class="lesson__body">
        <p class="lesson__counter">
          <Chip variant="count">{current.index + 1}/{current.total}</Chip>
        </p>
        <Flashcard glyph={current.glyph.char} name={current.glyph.name}>
          {#if current.glyph.pujl !== ""}
            <Chip>{$t("soundLabel")} · {current.glyph.pujl}</Chip>
          {/if}
        </Flashcard>
      </div>
      <div class="lesson__foot">
        <Button
          variant="primary"
          block
          data-autofocus
          onclick={() => void session.meetNext()}
        >
          {$t("continueButton")}
        </Button>
      </div>
    {:else if current.kind === "question" || current.kind === "feedback"}
      {@const { exercise, number, total } = current}
      {@const options =
        exercise.kind === "wordReading"
          ? exercise.glossOptions
          : exercise.options}
      {@const aksaraOptions = exercise.kind === "soundToGlyph"}
      <div class="lesson__body">
        <div class="stack stack--tight">
          <p class="kicker">{$t("questionProgress", { number, total })}</p>
          <div
            class="progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax={total}
            aria-valuenow={number}
            aria-label={$t("questionProgress", { number, total })}
            style:--value="{(number / total) * 100}%"
          >
            <div class="progress__bar"></div>
          </div>
        </div>
        {#if current.kind === "feedback"}
          <div
            class={[
              "feedback",
              current.correct ? "feedback--correct" : "feedback--wrong",
            ]}
            role="status"
            tabindex="-1"
            data-autofocus
          >
            <Icon name={current.correct ? "circle-check" : "circle-x"} />
            <span
              >{current.correct ? $t("answerCorrect") : $t("answerWrong")}</span
            >
          </div>
        {/if}
        {#if exercise.kind === "glyphToSound"}
          <Flashcard
            compact
            glyph={promptChar(exercise.glyphId)}
            label={promptName(exercise.glyphId)}
          />
        {:else if exercise.kind === "soundToGlyph"}
          <Slip raised class="prompt">
            <p class="prompt__sound">{promptPujl(exercise.glyphId)}</p>
          </Slip>
        {:else}
          <Flashcard compact glyph={exercise.word.aksara} />
        {/if}
        <ul class={["options", aksaraOptions && "options--grid"]}>
          {#each options as option, index}
            <li>
              {#if current.kind === "question"}
                <Button
                  variant={aksaraOptions ? "aksara-option" : "option"}
                  data-autofocus={index === 0 ? "" : undefined}
                  onclick={() => void session.answer(index)}
                >
                  {option}
                </Button>
              {:else}
                <Button
                  variant={aksaraOptions ? "aksara-option" : "option"}
                  disabled
                  mark={index === exercise.answerIndex
                    ? "correct"
                    : index === current.selectedIndex
                      ? "wrong"
                      : undefined}
                >
                  {option}
                </Button>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      {#if current.kind === "feedback"}
        <div class="lesson__foot">
          <Button
            variant="primary"
            block
            onclick={() => void session.continueAfterFeedback()}
          >
            {$t("continueButton")}
          </Button>
        </div>
      {/if}
    {:else if current.kind === "done"}
      <div class="lesson__body lesson__body--done">
        <div class="trophy" aria-hidden="true">
          <Icon name="trophy" />
        </div>
        <h2 class="done__title" tabindex="-1" data-autofocus>
          {$t("lessonDone", {
            correct: current.correct,
            total: current.total,
          })}
        </h2>
        <OrnamentDivider />
      </div>
      <div class="lesson__foot">
        <Button variant="primary" block onclick={back}>
          {$t("backButton")}
        </Button>
      </div>
    {/if}
  </div>
{/key}

<style>
  .lesson {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    min-height: calc(100dvh - var(--bar-height) - var(--space-9));
    animation: rise var(--dur-base) var(--ease-out) backwards;
  }

  .lesson__body {
    flex: 1;
    display: grid;
    gap: var(--space-5);
    align-content: start;
  }

  .lesson__body--done {
    align-content: center;
    justify-items: center;
    text-align: center;
  }

  .lesson__failure {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 2px dashed var(--color-danger);
    border-radius: var(--radius-lg);
    background: var(--color-danger-soft);
    color: var(--color-danger);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  .lesson__counter {
    justify-self: center;
  }

  .lesson__foot {
    position: sticky;
    bottom: 0;
    z-index: 10;
    padding: var(--space-4) 0;
    background: linear-gradient(to bottom, transparent, var(--color-bg) 28%);
  }

  .progress {
    height: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface-sunken);
    overflow: hidden;
  }

  .progress__bar {
    width: var(--value, 0%);
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-accent);
  }

  .feedback {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 2px solid currentcolor;
    border-radius: var(--radius-lg);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  .feedback--correct {
    background: var(--color-success-soft);
    color: var(--color-success);
  }

  .feedback--wrong {
    border-style: dashed;
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }

  .prompt__sound {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    text-align: center;
  }

  .options {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .options--grid {
    grid-template-columns: 1fr 1fr;
  }

  .lesson__body--done :global(.ornament) {
    width: min(100%, 14rem);
  }

  /* The heading takes focus when the lesson ends; it is not a control. */
  .done__title:focus {
    outline: none;
  }

  .done__title {
    font-size: var(--text-xl);
  }

  .trophy {
    display: grid;
    place-items: center;
    width: 7rem;
    height: 7rem;
    border: 3px solid var(--color-reward);
    border-radius: var(--radius-full);
    background: var(--color-reward-fill);
    box-shadow: 0 0 0 8px var(--color-reward-soft);
    color: var(--color-text);
  }

  .trophy :global(.icon) {
    width: 3.5rem;
    height: 3.5rem;
  }
</style>
