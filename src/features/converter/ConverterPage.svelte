<script lang="ts">
  import { routeLink } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("converterTitle")}>
  {#snippet actions()}
    <IconButton
      icon="info"
      label={$t("aboutTitle")}
      {...routeLink({ kind: "settings" })}
    />
  {/snippet}
</Page>
