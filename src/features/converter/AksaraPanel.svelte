<script lang="ts">
  import { tick } from "svelte";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Button from "../../ui/Button.svelte";
  import Icon from "../../ui/Icon.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import SegmentedControl from "../../ui/SegmentedControl.svelte";
  import TextField from "../../ui/TextField.svelte";
  import { AksaraToLatinConverter } from "./aksara-to-latin-state.ts";
  import ErrorNotice from "./ErrorNotice.svelte";
  import GlyphPickerSheet from "./GlyphPickerSheet.svelte";
  import { pickerSections } from "./glyph-picker.ts";
  import { insertAtCursor } from "./insert-at-cursor.ts";
  import ResultCard from "./ResultCard.svelte";

  let { oncopied }: { oncopied: () => void } = $props();

  const { t } = getI18n();
  const { content } = getServices();
  // The page keys this panel on direction: a fresh converter, empty input (P-U02).
  const converter = new AksaraToLatinConverter();
  const result = converter.state;
  const scheme = converter.scheme;

  // Acronyms, not translatable copy.
  const schemes = [
    { value: "pujl", label: "PUJL" },
    { value: "jgst", label: "JGST" },
  ] as const;

  let value = $state("");
  let element = $state<HTMLInputElement | HTMLTextAreaElement>();
  let pickerOpen = $state(false);
  // Null until the field has had a caret: the picker then appends (source).
  let caret: number | null = null;

  $effect(() => {
    const field = element;
    if (field === undefined) return;
    const track = () => (caret = field.selectionStart);
    const events = ["select", "input", "click", "keyup"] as const;
    for (const name of events) field.addEventListener(name, track);
    return () => {
      for (const name of events) field.removeEventListener(name, track);
    };
  });

  function update(next: string): void {
    value = next;
    converter.input(next);
  }

  async function pick(char: string): Promise<void> {
    const offset = Math.min(Math.max(caret ?? value.length, 0), value.length);
    update(insertAtCursor(value, offset, char));
    pickerOpen = false;
    await tick();
    const end = offset + char.length;
    element?.focus();
    element?.setSelectionRange(end, end);
    caret = end;
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
    label={$t("inputHintAksara")}
    multiline
    aksara
    bind:value
    bind:element
    oninput={() => update(value)}
    invalid={$result.kind === "error"}
  >
    {#snippet trailing()}
      <IconButton
        icon="keyboard"
        label={$t("glyphPickerTitle")}
        onclick={() => (pickerOpen = true)}
      />
    {/snippet}
  </TextField>

  <SegmentedControl
    label={$t("schemeLabel")}
    options={schemes}
    value={$scheme}
    onchange={(next) => {
      if (next !== $scheme) converter.toggleScheme();
    }}
  />

  {#if $result.kind === "error"}
    <ErrorNotice message={$result.message} />
  {:else if $result.kind === "idle"}
    <ResultCard label={$t("outputLabel")}>
      <p class="latin">{$result.output}</p>
      <Button variant="primary" block onclick={copy}>
        <Icon name="copy" />{$t("copyButton")}
      </Button>
    </ResultCard>
  {/if}
</div>

{#if pickerOpen}
  <GlyphPickerSheet
    sections={pickerSections(content.aksara, $t)}
    onpick={pick}
    onclose={() => (pickerOpen = false)}
  />
{/if}

<style>
  .panel {
    display: grid;
    gap: var(--space-4);
  }

  .latin {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    overflow-wrap: anywhere;
  }
</style>
