<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Button from "../../ui/Button.svelte";
  import Chip from "../../ui/Chip.svelte";
  import Icon from "../../ui/Icon.svelte";
  import TextField from "../../ui/TextField.svelte";
  import { splitAtIndex } from "./error-echo.ts";
  import ErrorNotice from "./ErrorNotice.svelte";
  import { LatinToAksaraConverter } from "./latin-to-aksara-state.ts";
  import ResultCard from "./ResultCard.svelte";

  let { oncopied }: { oncopied: () => void } = $props();

  const { t } = getI18n();
  // The page keys this panel on direction: a fresh converter, empty input (P-U02).
  const converter = new LatinToAksaraConverter();
  const result = converter.state;
  let value = $state("");

  function onInput(): void {
    converter.input(value);
  }

  async function copy(): Promise<void> {
    const copied = await converter.copy((s) =>
      navigator.clipboard.writeText(s),
    );
    if (copied) oncopied();
  }
</script>

<div class="panel">
  <TextField
    label={$t("inputHintLatin")}
    multiline
    bind:value
    oninput={onInput}
    invalid={$result.kind === "error"}
  />

  {#if $result.kind === "error"}
    {@const parts = splitAtIndex(value.trim(), $result.index)}
    <ErrorNotice message={$result.message}>
      {#snippet echo()}
        {parts.before}{#if parts.marked !== ""}<mark>{parts.marked}</mark
          >{/if}{parts.after}
      {/snippet}
    </ErrorNotice>
  {:else if $result.kind === "ambiguous"}
    <ResultCard label={$t("ambiguousTitle")}>
      <div class="chips">
        {#each $result.candidates as candidate, index (index)}
          <Chip variant="choice" onclick={() => converter.choose(index)}>
            <AksaraText text={candidate} size="sm" />
          </Chip>
        {/each}
      </div>
    </ResultCard>
  {:else if $result.kind === "idle"}
    <ResultCard label={$t("outputLabel")}>
      <AksaraText text={$result.output} size="lg" />
      <Button variant="primary" block onclick={copy}>
        <Icon name="copy" />{$t("copyButton")}
      </Button>
    </ResultCard>
  {/if}
</div>

<style>
  .panel {
    display: grid;
    gap: var(--space-4);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
</style>
