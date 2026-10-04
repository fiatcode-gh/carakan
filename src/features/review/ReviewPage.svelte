<script lang="ts">
  import { routeLink } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("reviewTitle")}>
  {#snippet actions()}
    <IconButton
      icon="circle-help"
      label={$t("reviewHelpTitle")}
      {...routeLink({ kind: "reviewHelp" })}
    />
  {/snippet}
</Page>
