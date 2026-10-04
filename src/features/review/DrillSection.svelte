<script lang="ts">
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Slip from "../../ui/Slip.svelte";
  import type { DrillSession, DrillState } from "./drill-session.ts";
  import WordReadingPrompt from "./WordReadingPrompt.svelte";

  interface Props {
    session: DrillSession;
    drill: Extract<DrillState, { kind: "ready" }>;
  }

  let { session, drill }: Props = $props();

  const { t } = getI18n();
  const { glyphInfo } = getServices();

  // The session keeps correctness only; W02 also marks the picked option.
  // The parent re-creates this component for a new plan, so picks reset.
  let picks = $state<Record<number, number>>({});

  function pick(exerciseIndex: number, optionIndex: number): void {
    if (drill.answered.has(exerciseIndex) || exerciseIndex in picks) return;
    picks[exerciseIndex] = optionIndex;
    void session.answer(exerciseIndex, optionIndex);
  }
</script>

<section class="stack" aria-labelledby="drill-heading">
  <h2 id="drill-heading" class="section-title">{$t("drillHeading")}</h2>
  {#each drill.exercises as exercise, i}
    {@const aksaraOptions = exercise.kind === "soundToGlyph"}
    {@const options =
      exercise.kind === "wordReading"
        ? exercise.glossOptions
        : exercise.options}
    {@const correct = drill.answered.get(i)}
    <Slip tag="article" raised class="drill">
      {#if exercise.kind === "glyphToSound"}
        <p class="drill__prompt">
          <AksaraText
            text={glyphInfo.byId.get(exercise.glyphId)?.char ?? ""}
            size="xl"
          />
        </p>
      {:else if exercise.kind === "soundToGlyph"}
        <p class="drill__prompt drill__prompt--sound">
          {glyphInfo.byId.get(exercise.glyphId)?.pujl ?? ""}
        </p>
      {:else}
        <WordReadingPrompt aksara={exercise.word.aksara} />
      {/if}
      <ul class={["options", aksaraOptions && "options--grid"]}>
        {#each options as option, index}
          {@const answered = correct !== undefined}
          <li>
            <Button
              variant={aksaraOptions ? "aksara-option" : "option"}
              disabled={answered}
              mark={!answered
                ? undefined
                : index === exercise.answerIndex
                  ? "correct"
                  : index === picks[i]
                    ? "wrong"
                    : undefined}
              onclick={() => pick(i, index)}
            >
              {option}
            </Button>
          </li>
        {/each}
      </ul>
      {#if correct !== undefined}
        <p
          class={[
            "feedback",
            correct ? "feedback--correct" : "feedback--wrong",
          ]}
          role="status"
        >
          <Icon name={correct ? "circle-check" : "circle-x"} />
          <span>{correct ? $t("answerCorrect") : $t("answerWrong")}</span>
        </p>
      {/if}
    </Slip>
  {/each}
</section>

<style>
  .section-title {
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
  }

  :global(.drill) {
    display: grid;
    gap: var(--space-4);
  }

  .drill__prompt {
    text-align: center;
    line-height: 1.7;
  }

  .drill__prompt--sound {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
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

  .feedback {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 2px solid currentcolor;
    border-radius: var(--radius-lg);
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
</style>
