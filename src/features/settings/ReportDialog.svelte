<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import TextField from "../../ui/TextField.svelte";

  interface Props {
    /** Kept by the page so it survives closing the dialog. */
    description: string;
    /** The last copy was refused: the dialog stays open and says so. */
    failed: boolean;
    oncopy: () => void;
    onclose: () => void;
  }

  let { description = $bindable(), failed, oncopy, onclose }: Props = $props();

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
  {#if failed}
    <p class="failure" role="alert">{$t("reportCopyFailed")}</p>
  {/if}
  {#snippet footer()}
    <Button variant="quiet" onclick={onclose}>{$t("cancelButton")}</Button>
    <Button variant="primary" onclick={oncopy}>{$t("copyReportButton")}</Button>
  {/snippet}
</Sheet>

<style>
  .failure {
    color: var(--color-danger);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }
</style>
