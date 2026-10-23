<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Reading from "../../ui/Reading.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import TextField from "../../ui/TextField.svelte";
  import { filterPickerSections, type PickerSection } from "./glyph-picker.ts";

  interface Props {
    sections: readonly PickerSection[];
    /** Called with the aksara string of the chosen entry. */
    onpick: (char: string) => void;
    onclose: () => void;
  }

  let { sections, onpick, onclose }: Props = $props();

  const { t } = getI18n();
  // A sheet is mounted per opening, so every opening starts with no query.
  let query = $state("");
  const shown = $derived(filterPickerSections(sections, query));
</script>

<Sheet title={$t("glyphPickerTitle")} {onclose}>
  <div class="search">
    <TextField label={$t("pickerSearchLabel")} bind:value={query} />
  </div>
  {#if shown.length === 0}
    <p class="none" role="status">{$t("searchNoMatch")}</p>
  {/if}
  {#each shown as section (section.titleKey)}
    <section class="section">
      <h2 class="section__title eyebrow">{section.title}</h2>
      <div class="grid">
        {#each section.entries as entry (entry.label)}
          <button
            type="button"
            class="entry press"
            aria-label={entry.label}
            onclick={() => onpick(entry.char)}
          >
            <AksaraText text={entry.glyph} size="md" />
            <span class="entry__label" aria-hidden="true"
              ><Reading text={entry.label} /></span
            >
          </button>
        {/each}
      </div>
    </section>
  {/each}
</Sheet>

<style>
  .search {
    position: sticky;
    top: calc(var(--space-5) * -1);
    z-index: 1;
    margin: calc(var(--space-5) * -1) calc(var(--space-5) * -1) 0;
    padding: var(--space-4) var(--space-5) var(--space-2);
    background: var(--color-paper);
  }

  .none {
    color: var(--color-ink-muted);
  }

  .section {
    display: grid;
    gap: var(--space-3);
  }

  .section__title {
    color: var(--color-ink-muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: var(--space-3);
  }

  .entry {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: var(--space-1);
    min-height: 6rem;
    padding: var(--space-2);
    border: var(--border);
    background: var(--color-card);
    color: var(--color-ink);
  }

  .entry__label {
    color: var(--color-ink-muted);
    font-size: var(--text-xs);
    text-align: center;
    overflow-wrap: anywhere;
  }
</style>
