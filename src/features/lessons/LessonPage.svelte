<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";

  let { unitId }: { unitId: string } = $props();

  const { t } = getI18n();
</script>

<Page title={$t("lessonTitle")} onback={back}>
  <div data-unit={unitId}></div>
</Page>
