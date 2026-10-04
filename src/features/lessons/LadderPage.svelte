<script lang="ts">
  import { routeLink } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("navLadder")}>
  {#snippet actions()}
    <IconButton
      icon="graduation-cap"
      label={$t("teacherTitle")}
      {...routeLink({ kind: "teacher" })}
    />
    <IconButton
      icon="settings"
      label={$t("settingsTitle")}
      {...routeLink({ kind: "settings" })}
    />
  {/snippet}
</Page>
