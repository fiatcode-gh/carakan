<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import { RULESET_MESSAGES } from "../../l10n/ruleset-messages.ts";
  import Page from "../../ui/Page.svelte";
  import Slip from "../../ui/Slip.svelte";

  const { t } = getI18n();
  const active = getServices().ruleset.setting;
</script>

<Page title={$t("teacherTitle")} onback={back}>
  <div class="stack">
    <Slip tag="article">
      <h2 class="slip__title">{$t("deviationTitle")}</h2>
      <p class="slip__body">
        {$t("deviationBody", {
          ruleset: $t(RULESET_MESSAGES[$active].name),
        })}
      </p>
    </Slip>
    <Slip tag="article">
      <h2 class="slip__title">{$t("unitOrderHeading")}</h2>
      <p class="slip__body slip__body--lines">{$t("unitOrderBody")}</p>
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

  .slip__body--lines {
    white-space: pre-line;
  }
</style>
