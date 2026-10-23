<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Reading from "../../ui/Reading.svelte";
  import { accentVar, type UnitAccent } from "../../ui/accent.ts";
  import type { ClusterPart } from "./cluster-parts.ts";

  interface Props {
    part: ClusterPart;
    /** Display name of the part. */
    name: string;
    caption: string | null;
    accent: UnitAccent | null;
    /** Makes the row a button that opens the part's chart entry. */
    onopen?: () => void;
  }

  let { part, name, caption, accent, onopen }: Props = $props();

  const { t } = getI18n();
  // A sandhangan or pasangan hangs below the line and needs room.
  const stacked = $derived([...part.char].length > 1);
</script>

{#snippet content()}
  <span class={["row__glyph", stacked && "row__glyph--stacked"]}>
    <AksaraText text={part.char} size="md" />
  </span>
  <span class="row__text">
    <span class="row__name"><Reading text={name} /></span>
    {#if caption !== null}<span class="row__caption">{caption}</span>{/if}
  </span>
  {#if part.sound !== ""}
    <span class="row__reads">{$t("breakdownReads")}</span>
    <span class="row__chip" style:--accent={accentVar(accent)}
      ><Reading text={part.sound} /></span
    >
  {/if}
{/snippet}

{#if onopen}
  <button
    type="button"
    class="row row--link press"
    aria-label={$t("breakdownOpenChart", { name })}
    onclick={onopen}
  >
    {@render content()}
  </button>
{:else}
  <div class="row">
    {@render content()}
  </div>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    box-sizing: border-box;
    width: 100%;
    min-height: 60px;
    padding: var(--space-1) var(--space-3);
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
    font: inherit;
    text-align: start;
  }

  .row--link {
    --press-depth: 0px;
    cursor: pointer;
  }

  .row__glyph {
    flex: none;
    width: 52px;
    text-align: center;
  }

  .row__glyph--stacked {
    padding-block-end: var(--aksara-room);
    font-size: var(--aksara-md);
  }

  .row__text {
    display: grid;
    flex: 1;
    min-width: 0;
  }

  .row__name {
    font-weight: var(--weight-black);
    overflow-wrap: anywhere;
  }

  .row__name :global(.reading) {
    font-weight: var(--weight-black);
  }

  .row__caption {
    color: var(--color-ink-muted);
    font-size: var(--text-sm);
    font-weight: var(--weight-regular);
  }

  .row__reads {
    color: var(--color-ink-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
  }

  .row__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 44px;
    height: 32px;
    padding-inline: var(--space-2);
    border: var(--border);
    background: var(--accent);
    color: var(--color-ink);
    font-weight: var(--weight-black);
  }

  .row__chip :global(.reading) {
    font-weight: var(--weight-black);
  }
</style>
