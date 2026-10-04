<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import TextField from "../../ui/TextField.svelte";

  interface Props {
    /** Kept by the page so it survives closing the dialog. */
    description: string;
    oncopy: () => void;
    onclose: () => void;
  }

  let { description = $bindable(), oncopy, onclose }: Props = $props();

  const { t } = getI18n();
</script>

<Sheet title={$t("reportButton")} {onclose}>
  <TextField
    label={$t("reportHint")}
    hideLabel
    placeholder={$t("reportHint")}
    multiline
    rows={6}
    bind:value={description}
  />
  {#snippet footer()}
    <Button variant="quiet" onclick={onclose}>{$t("cancelButton")}</Button>
    <Button variant="primary" onclick={oncopy}>{$t("copyReportButton")}</Button>
  {/snippet}
</Sheet>
