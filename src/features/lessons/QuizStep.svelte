<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import HandNote from "../../ui/HandNote.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import PrimaryBar from "../../ui/PrimaryBar.svelte";
  import Reading from "../../ui/Reading.svelte";
  import SegmentedProgress from "../../ui/SegmentedProgress.svelte";
  import Stamp from "../../ui/Stamp.svelte";
  import Surface from "../../ui/Surface.svelte";
  import Tape from "../../ui/Tape.svelte";
  import WordReadingPrompt from "../review/WordReadingPrompt.svelte";
  import type { Exercise } from "./exercise-generator.ts";

  interface Props {
    exercise: Exercise;
    /** 1-based position of this question and how many there are. */
    number: number;
    total: number;
    phase: "question" | "feedback";
    selectedIndex?: number;
    correct?: boolean;
    onanswer: (index: number) => void;
    oncontinue: () => void;
    onclose: () => void;
  }

  let {
    exercise,
    number,
    total,
    phase,
    selectedIndex,
    correct,
    onanswer,
    oncontinue,
    onclose,
  }: Props = $props();

  const { t } = getI18n();
  const { glyphInfo } = getServices();

  const options = $derived(
    exercise.kind === "wordReading" ? exercise.glossOptions : exercise.options,
  );
  const aksaraOptions = $derived(exercise.kind === "soundToGlyph");
  const target = $derived(glyphInfo.byId.get(exercise.glyphId));

  /** The explanation with the glyph and its reading as their own elements. */
  const explanation = $derived(
    target === undefined
      ? []
      : $t("feedbackGlyphReads", { aksara: "\u0001", reading: "\u0002" })
          .split(/([\u0001\u0002])/)
          .filter((part) => part !== ""),
  );
</script>

<div class="quiz">
  <header class="quiz__head">
    <IconButton
      icon="x"
      label={$t("closeButton")}
      tone="paper"
      onclick={onclose}
    />
    <div class="quiz__progress">
      <SegmentedProgress
        segmented
        value={number}
        max={total}
        label={$t("questionProgress", { number, total })}
      />
    </div>
  </header>

  <Surface tone="periwinkle" shadow="hero" class="quiz__card">
    <span class="quiz__tape"><Tape rotate={4} /></span>
    <p class="eyebrow quiz__eyebrow">
      {$t(
        exercise.kind === "soundToGlyph"
          ? "questionEyebrowSoundToGlyph"
          : "questionEyebrowGlyphToSound",
        { number },
      )}
    </p>
    <div class="quiz__prompt">
      {#if exercise.kind === "glyphToSound"}
        <AksaraText text={target?.char ?? ""} size="hero" />
      {:else if exercise.kind === "soundToGlyph"}
        <Reading class="quiz__sound" text={target?.pujl ?? ""} />
      {:else}
        <WordReadingPrompt aksara={exercise.word.aksara} />
      {/if}
    </div>
    <HandNote tilt>{$t("pickOneHint")}</HandNote>
  </Surface>

  <ul
    class={["answers", options.length === 3 && "answers--three"]}
    data-count={options.length}
  >
    {#each options as option, index}
      <li>
        {#if phase === "question"}
          <Button
            variant={aksaraOptions ? "aksara-option" : "option"}
            data-autofocus={index === 0 ? "" : undefined}
            onclick={() => onanswer(index)}
          >
            {#if aksaraOptions}{option}{:else}<Reading text={option} />{/if}
          </Button>
        {:else}
          <Button
            variant={aksaraOptions ? "aksara-option" : "option"}
            disabled
            mark={index === exercise.answerIndex
              ? "correct"
              : index === selectedIndex
                ? "wrong"
                : undefined}
          >
            {#if aksaraOptions}{option}{:else}<Reading text={option} />{/if}
          </Button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if phase === "feedback"}
    <div class="feedback-row" role="status" tabindex="-1" data-autofocus>
      <Stamp variant="meaning">
        {correct ? $t("answerCorrect") : $t("answerWrong")}
      </Stamp>
      {#if target !== undefined}
        <HandNote>
          {#each explanation as part}
            {#if part === "\u0001"}
              <AksaraText text={target.char} size="sm" />
            {:else if part === "\u0002"}
              <Reading text={target.pujl} />
            {:else}
              {part}
            {/if}
          {/each}
        </HandNote>
      {/if}
    </div>
    <PrimaryBar
      primary={{ label: $t("continueButton"), onclick: oncontinue }}
    />
  {/if}
</div>

<style>
  /* Bleeds out of the page padding: the bar spans the column. */
  .quiz {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-5);
    min-height: var(--screen-min-height);
    margin: calc(-1 * var(--space-4)) calc(-1 * var(--gutter))
      calc(-1 * var(--space-9));
  }

  .quiz__head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--gutter) var(--gutter) 0;
  }

  .quiz__progress {
    flex: 1;
  }

  .quiz > :global(.quiz__card) {
    display: flex;
    flex-direction: column;
    min-height: 15rem;
    margin-inline: var(--gutter);
    padding: var(--space-4);
  }

  @media (min-width: 48rem) {
    /* The worksheet fills the page: the card grows down to the answers. */
    .quiz > :global(.quiz__card) {
      flex-grow: 1;
    }
  }

  .quiz__tape {
    position: absolute;
    top: -8px;
    inset-inline-end: 40px;
  }

  .quiz__eyebrow {
    margin: 0;
  }

  .quiz__prompt {
    display: grid;
    flex: 1;
    place-items: center;
  }

  .quiz__prompt :global(.aksara--hero) {
    font-size: min(var(--aksara-hero), 22dvh);
    line-height: 1.5;
  }

  .quiz__prompt :global(.quiz__sound) {
    font-size: var(--text-syllable-xl);
    font-weight: var(--weight-black);
    line-height: 0.9;
    letter-spacing: var(--tracking-title);
  }

  .quiz > :global(.quiz__card) > :global(.hand) {
    align-self: flex-start;
    color: var(--color-ink);
    font-size: var(--text-hand);
  }

  .answers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
    padding: 0 var(--gutter);
    list-style: none;
  }

  .answers--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .answers :global(.btn) {
    font-size: var(--text-syllable-l);
    letter-spacing: -0.03em;
  }

  .answers :global(.btn--option) {
    justify-content: center;
    padding-inline: var(--space-2);
    text-align: center;
  }

  .answers :global(.btn--aksara-option) {
    font-size: var(--aksara-tile);
  }

  /* In feedback the unpicked tiles keep their card look; only the marked ones
     change fill. */
  .answers :global(.btn:disabled:not(.is-correct, .is-wrong)) {
    background: var(--color-card);
    box-shadow: var(--shadow-tile);
    color: var(--color-ink);
  }

  .feedback-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 var(--gutter);
  }

  .feedback-row:focus {
    outline: none;
  }

  .feedback-row :global(.stamp) {
    flex: none;
  }

  .feedback-row :global(.hand) {
    color: var(--color-ink);
    font-size: var(--text-hand);
    line-height: 1.15;
  }

  .quiz > :global(.bar) {
    margin-top: auto;
  }
</style>
