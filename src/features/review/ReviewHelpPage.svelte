<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";
  import Slip from "../../ui/Slip.svelte";

  const { t } = getI18n();

  // Each dot sits next to its own text: the color is never the only cue.
  const grades = $derived([
    { dot: "var(--color-accent)", text: $t("reviewHelpGradeAgain") },
    { dot: "var(--color-text-muted)", text: $t("reviewHelpGradeHard") },
    { dot: "var(--color-reward)", text: $t("reviewHelpGradeGood") },
    { dot: "var(--color-link)", text: $t("reviewHelpGradeEasy") },
  ]);
</script>

<Page title={$t("reviewHelpTitle")} onback={back}>
  <div class="stack">
    <Slip tag="article">
      <h2 class="slip__title">{$t("reviewHelpWhyHeading")}</h2>
      <p class="slip__body">{$t("reviewHelpWhyBody")}</p>
    </Slip>
    <Slip tag="article">
      <h2 class="slip__title">{$t("reviewHelpGradeHeading")}</h2>
      <ul class="grades">
        {#each grades as { dot, text }}
          <li class="grade">
            <span class="grade__dot" style:background={dot} aria-hidden="true"
            ></span>
            <span>{text}</span>
          </li>
        {/each}
      </ul>
    </Slip>
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

  .grade__dot {
    flex: none;
    width: 0.75rem;
    height: 0.75rem;
    margin-top: 0.4em;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-full);
  }
</style>
