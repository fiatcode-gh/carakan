<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Sheet from "../../ui/Sheet.svelte";

  interface Props {
    /** The last erase failed: the dialog stays open and says so. */
    failed: boolean;
    onconfirm: () => void;
    onclose: () => void;
  }

  let { failed, onconfirm, onclose }: Props = $props();

  const { t } = getI18n();
  const uid = $props.id();
  const bodyId = `reset-body-${uid}`;
</script>

<Sheet title={$t("resetConfirmTitle")} describedby={bodyId} {onclose}>
  <p id={bodyId}>{$t("resetConfirmBody")}</p>
  {#if failed}
    <p class="failure" role="alert">{$t("resetFailed")}</p>
  {/if}
  {#snippet footer()}
    <Button variant="quiet" data-autofocus onclick={onclose}>
      {$t("cancelButton")}
    </Button>
    <Button variant="danger" onclick={onconfirm}>
      {$t("resetConfirmButton")}
    </Button>
  {/snippet}
</Sheet>

<style>
  .failure {
    color: var(--color-danger);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }
</style>
