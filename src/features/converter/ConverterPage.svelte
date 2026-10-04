<script lang="ts">
  import { routeLink } from "../../app/router.ts";
  import { getI18n } from "../../l10n/context.ts";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";
  import SegmentedControl from "../../ui/SegmentedControl.svelte";
  import Toast from "../../ui/Toast.svelte";
  import AksaraPanel from "./AksaraPanel.svelte";
  import LatinPanel from "./LatinPanel.svelte";

  const { t } = getI18n();
  type Direction = "latin-to-aksara" | "aksara-to-latin";
  let direction = $state<Direction>("latin-to-aksara");

  // A counter, so copying twice restarts the toast.
  let toast = $state(0);
  let toastVisible = $state(false);

  function copied(): void {
    toast += 1;
    toastVisible = true;
  }

  function setDirection(next: Direction): void {
    toastVisible = false;
    direction = next;
  }
</script>

<Page title={$t("converterTitle")}>
  {#snippet actions()}
    <IconButton
      icon="info"
      label={$t("aboutTitle")}
      {...routeLink({ kind: "settings" })}
    />
  {/snippet}

  <div class="converter">
    <SegmentedControl
      label={$t("directionLabel")}
      options={[
        { value: "latin-to-aksara", label: $t("dirLatinToAksara") },
        { value: "aksara-to-latin", label: $t("dirAksaraToLatin") },
      ]}
      value={direction}
      onchange={setDirection}
    />

    {#if direction === "latin-to-aksara"}
      <LatinPanel oncopied={copied} />
    {:else}
      <AksaraPanel oncopied={copied} />
    {/if}
  </div>

  {#if toastVisible}
    {#key toast}
      <Toast onclose={() => (toastVisible = false)}>{$t("copyWarning")}</Toast>
    {/key}
  {/if}
</Page>

<style>
  .converter {
    display: grid;
    gap: var(--space-4);
  }
</style>
