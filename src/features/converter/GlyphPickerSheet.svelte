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
  const uid = $props.id();
  let selected = $state(0);
  const tabs: HTMLButtonElement[] = [];

  const section = $derived(sections[selected]!);

  function onKey(event: KeyboardEvent): void {
    const last = sections.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (selected + 1) % sections.length
        : event.key === "ArrowLeft"
          ? (selected + last) % sections.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    selected = next;
    tabs[next]?.focus();
  }
</script>

<Sheet title={$t("glyphPickerTitle")} {onclose}>
  <div class="tabs" role="tablist" tabindex="-1" onkeydown={onKey}>
    {#each sections as s, index (s.titleKey)}
      <button
        type="button"
        role="tab"
        class="tab"
        id={`${uid}-tab-${index}`}
        aria-selected={index === selected}
        aria-controls={`${uid}-panel`}
        tabindex={index === selected ? 0 : -1}
        bind:this={tabs[index]}
        onclick={() => (selected = index)}
      >
        {s.title}
      </button>
    {/each}
  </div>
  <div
    class="grid"
    role="tabpanel"
    id={`${uid}-panel`}
    aria-labelledby={`${uid}-tab-${selected}`}
  >
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
</Sheet>

<style>
  .tabs {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }

  .tab {
    flex: none;
    min-width: var(--touch-min);
    min-height: var(--touch-min);
    padding: var(--space-2) var(--space-4);
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
    font-weight: var(--weight-bold);
  }

  .tab[aria-selected="true"] {
    border-color: var(--color-accent-pressed);
    background: var(--color-accent);
    color: var(--color-on-accent);
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
