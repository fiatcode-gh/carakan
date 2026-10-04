<script lang="ts">
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Sheet from "../../ui/Sheet.svelte";
  import type { PickerSection } from "./glyph-picker.ts";

  interface Props {
    sections: readonly PickerSection[];
    /** Called with the aksara string of the chosen entry. */
    onpick: (char: string) => void;
    onclose: () => void;
  }

  let { sections, onpick, onclose }: Props = $props();

  const { t } = getI18n();
</script>

<Sheet title={$t("glyphPickerTitle")} {onclose}>
  {#each sections as section (section.titleKey)}
    <section class="section">
      <h3 class="section__title">{section.title}</h3>
      <div class="grid">
        {#each section.entries as entry (entry.label)}
          <button
            type="button"
            class="entry"
            aria-label={entry.label}
            onclick={() => onpick(entry.char)}
          >
            <AksaraText text={entry.char} size="md" />
            <span class="entry__label" aria-hidden="true">{entry.label}</span>
          </button>
        {/each}
      </div>
    </section>
  {/each}
</Sheet>

<style>
  .section {
    display: grid;
    gap: var(--space-3);
  }

  .section__title {
    font-size: var(--text-md);
    color: var(--color-text-muted);
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
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
  }

  .entry__label {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    text-align: center;
    overflow-wrap: anywhere;
  }
</style>
