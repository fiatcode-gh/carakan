<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";

  const { t } = getI18n();
</script>

<Page title={$t("chartTitle")} />
