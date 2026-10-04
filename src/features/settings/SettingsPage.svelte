<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("settingsTitle")} onback={back} />
