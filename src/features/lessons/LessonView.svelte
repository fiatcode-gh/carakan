<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import Icon from "../../ui/Icon.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import PrimaryBar from "../../ui/PrimaryBar.svelte";
  import Reading from "../../ui/Reading.svelte";
  import SoundButton from "../../ui/SoundButton.svelte";
  import Surface from "../../ui/Surface.svelte";
  import Tape from "../../ui/Tape.svelte";
  import TracePractice from "../tracing/TracePractice.svelte";
  import QuizStep from "./QuizStep.svelte";
  import { accentVar } from "../../ui/accent.ts";
  import { splitUnitName, unitAccent } from "./unit-display.ts";
  import type { LessonSession } from "./lesson-session.ts";

  let { session }: { session: LessonSession } = $props();

  const { t, locale } = getI18n();
  const { glyphInfo, content, clips } = getServices();
  const lesson = $derived(session.state);
  const current = $derived($lesson);
  const failedStore = $derived(session.failed);
  const failed = $derived($failedStore);

  const viewKey = $derived(
    current.kind === "meet"
      ? `meet-${current.index}`
      : current.kind === "trace"
        ? `trace-${current.index}`
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

  function accentOf(unitId: string) {
    return unitAccent(content.units.findIndex((u) => u.id === unitId));
  }
</script>

{#key viewKey}
  <div class="lesson" bind:this={lessonEl}>
    {#if failed}
      <div class="lesson__failure" role="alert">
        <Icon name="triangle-alert" />
        <p>{$t("storageErrorTitle")}</p>
        <Button variant="secondary" onclick={() => void session.retry()}>
          <Icon name="refresh-cw" />{$t("retryButton")}
        </Button>
      </div>
    {/if}
    {#if current.kind === "meet"}
      {@const { unit, glyph, index, total } = current}
      {@const note = content.shapeNotes.get(glyph.id)}
      <div class="meet">
        <header class={["meet__head", total > 5 && "meet__head--wrap"]}>
          <IconButton
            icon="chevron-left"
            label={$t("backButton")}
            tone="paper"
            onclick={back}
          />
          <h2 class="eyebrow meet__eyebrow">
            {$t("meetEyebrow", {
              unit: splitUnitName(unit.name).head ?? unit.name,
            })}
          </h2>
          <ol
            class="meet-progress"
            aria-hidden="true"
            style:--accent-chip={accentVar(accentOf(unit.id))}
          >
            {#each unit.glyphs as glyphId, position}
              <li
                class="chip"
                data-state={position < index
                  ? "done"
                  : position === index
                    ? "current"
                    : "upcoming"}
              >
                {#if position < index}
                  <Icon name="check" />
                {:else}
                  <AksaraText
                    text={glyphInfo.byId.get(glyphId)?.char ?? ""}
                    size="sm"
                  />
                {/if}
              </li>
            {/each}
          </ol>
          <span class="visually-hidden"
            >{$t("meetProgressLabel", { number: index + 1, total })}</span
          >
        </header>

        <Surface tone={accentOf(unit.id)} shadow="hero" class="meet__card">
          <span class="meet__tape"
            ><Tape rotate={-3} on={accentOf(unit.id)} /></span
          >
          <div
            class="meet__glyph"
            role="img"
            aria-label={$t("aksaraName", {
              reading: glyph.pujl || glyph.name,
            })}
          >
            <AksaraText text={glyph.char} size="hero" aria-hidden="true" />
          </div>
          <div class="meet__foot">
            <div>
              <p class="eyebrow meet__label">{$t("readingLabel")}</p>
              <p class="meet__reading">
                <Reading text={glyph.pujl || glyph.name} />
              </p>
            </div>
            <SoundButton
              player={clips}
              clipKey={glyph.pujl || glyph.name}
              label={$t("playSound", { reading: glyph.pujl || glyph.name })}
              size="lg"
            />
          </div>
        </Surface>

        {#if note !== undefined}
          <div class="meet__note">
            <Icon name="lightbulb" />
            <HandNote>{note[$locale]}</HandNote>
          </div>
        {/if}

        <PrimaryBar
          primary={{
            label: $t(
              current.traceable ? "tryWritingButton" : "continueButton",
            ),
            onclick: () => void session.meetNext(),
            autofocus: true,
          }}
        />
      </div>
    {:else if current.kind === "trace"}
      <TracePractice
        glyph={current.glyph}
        accent={accentOf(current.unit.id)}
        backIcon="chevron-left"
        onback={back}
        onfinish={() => void session.finishTrace()}
      >
        {#snippet sound()}
          <SoundButton
            player={clips}
            clipKey={current.glyph.pujl || current.glyph.name}
            label={$t("playSound", {
              reading: current.glyph.pujl || current.glyph.name,
            })}
            size="lg"
          />
        {/snippet}
      </TracePractice>
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
        onanswer={(index) => void session.answer(index)}
        oncontinue={() => void session.continueAfterFeedback()}
        onclose={back}
      />
    {:else if current.kind === "done"}
      <div class="lesson-done">
        <div class="lesson-done__body">
          <Surface tone="sage" shadow="hero" class="lesson-done__card">
            <h2 class="lesson-done__title" tabindex="-1" data-autofocus>
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

<style>
  .lesson {
    display: flex;
    flex-direction: column;
    animation: rise var(--dur-base) var(--ease-out) backwards;
  }

  .lesson__failure {
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

  /* The meet, quiz and done screens bleed out of the page padding so the
     primary bar spans the column. */
  .meet,
  .lesson-done {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    margin: calc(-1 * var(--space-4)) calc(-1 * var(--gutter))
      calc(-1 * var(--space-9));
  }

  .meet__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: var(--gutter);
  }

  .meet__eyebrow {
    flex: 1;
    margin: 0;
  }

  .meet-progress {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .meet__head--wrap .meet-progress {
    flex-basis: 100%;
  }

  .chip {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    box-sizing: border-box;
    border: var(--border);
    background: var(--accent-chip, var(--color-coral));
  }

  /* Done: card fill and a check. Current: accent fill, lifted by a shadow.
     Upcoming: dashed. Shape and mark carry the state, not colour alone. */
  .chip[data-state="done"] {
    background: var(--color-card);
  }

  .chip[data-state="current"] {
    box-shadow: var(--shadow-tile);
  }

  .chip[data-state="upcoming"] {
    border: var(--border-dashed);
    background: var(--color-card);
    color: var(--color-ink-subtle);
  }

  .chip :global(.icon) {
    width: 1.125rem;
    height: 1.125rem;
    stroke-width: 3;
  }

  .chip :global(.aksara) {
    font-size: 17px;
    line-height: 1;
    padding-block-end: 0.35em;
  }

  .meet :global(.meet__card) {
    display: flex;
    flex: 0 1 460px;
    flex-direction: column;
    margin: 6px var(--gutter) 0;
    padding: 0;
    min-height: 20rem;
  }

  .meet__tape {
    position: absolute;
    top: -8px;
    inset-inline-start: calc(50% - 42px);
    z-index: 1;
  }

  .meet__glyph {
    display: grid;
    flex: 1;
    place-items: center;
    padding-block-start: var(--space-4);
  }

  .meet__glyph :global(.aksara) {
    font-size: clamp(9rem, 26dvh, var(--aksara-hero));
    line-height: 1.5;
  }

  .meet__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 120px;
    padding: 0 var(--gutter);
    border-top: var(--border);
    background: var(--color-card);
  }

  .meet__label,
  .meet__reading {
    margin: 0;
  }

  .meet__label {
    color: var(--color-ink-muted);
  }

  .meet__reading {
    font-size: var(--text-syllable-xl);
    font-weight: var(--weight-black);
    line-height: 0.9;
    letter-spacing: var(--tracking-title);
  }

  .meet__note {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 24px var(--gutter) 0;
    color: var(--color-hand);
  }

  .meet__note :global(.icon) {
    flex: none;
    width: 28px;
    height: 28px;
    margin-top: 2px;
  }

  .meet__note :global(.hand) {
    font-size: 21px;
    line-height: 1.2;
  }

  .meet > :global(.bar),
  .lesson-done > :global(.bar) {
    margin-top: auto;
  }

  .lesson-done__body {
    display: grid;
    flex: 1;
    place-items: center;
    padding: var(--gutter);
  }

  .lesson-done :global(.lesson-done__card) {
    width: 100%;
    padding: var(--space-8) var(--space-5);
    text-align: center;
  }

  /* The heading takes focus when the lesson ends; it is not a control. */
  .lesson-done__title:focus {
    outline: none;
  }

  .lesson-done__title {
    margin: 0;
    font-size: var(--text-xl);
  }
</style>
