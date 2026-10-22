<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";
  import Surface from "../../ui/Surface.svelte";

  const { t } = getI18n();

  // Each marker sits next to its own text: the color is never the only cue.
  const grades = $derived([
    { fill: "var(--color-coral)", text: $t("reviewHelpGradeAgain") },
    { fill: "var(--color-neutral)", text: $t("reviewHelpGradeHard") },
    { fill: "var(--color-butter)", text: $t("reviewHelpGradeGood") },
    { fill: "var(--color-periwinkle)", text: $t("reviewHelpGradeEasy") },
  ]);
</script>

<Page title={$t("reviewHelpTitle")} onback={back}>
  <div class="stack">
    <Surface tag="article">
      <h2 class="slip__title">{$t("reviewHelpWhyHeading")}</h2>
      <p class="slip__body">{$t("reviewHelpWhyBody")}</p>
    </Surface>
    <Surface tag="article">
      <h2 class="slip__title">{$t("reviewHelpGradeHeading")}</h2>
      <ul class="grades">
        {#each grades as { fill, text }}
          <li class="grade">
            <span
              class="grade__marker"
              style:background={fill}
              aria-hidden="true"
            ></span>
            <span>{text}</span>
          </li>
        {/each}
      </ul>
    </Surface>
  </div>
</Page>

<style>
  .slip__title {
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
  }

  .slip__body {
    margin-top: var(--space-2);
    line-height: var(--leading-body);
  }

  .grades {
    display: grid;
    gap: var(--space-3);
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  .grade {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    line-height: var(--leading-body);
  }

  .grade__marker {
    flex: none;
    width: 14px;
    height: 14px;
    margin-top: 0.3em;
    border: var(--border);
  }
</style>
