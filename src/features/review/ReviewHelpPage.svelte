<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";
  import Surface from "../../ui/Surface.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("reviewHelpTitle")} onback={back}>
  <div class="stack">
    <Surface tag="article">
      <h2 class="slip__title">{$t("reviewHelpWhyHeading")}</h2>
      <p class="slip__body">{$t("reviewHelpWhyBody")}</p>
    </Surface>
    <Surface tag="article">
      <h2 class="slip__title">{$t("reviewHelpHowHeading")}</h2>
      <p class="slip__body">{$t("reviewHelpRight")}</p>
      <p class="slip__body">{$t("reviewHelpWrong")}</p>
      <p class="slip__body">{$t("reviewHelpStrength")}</p>
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
</style>
