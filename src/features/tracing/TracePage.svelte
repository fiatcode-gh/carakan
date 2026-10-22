<script lang="ts">
  import { onMount } from "svelte";
  import { back, navigate } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";
  import SoundButton from "../../ui/SoundButton.svelte";
  import { glyphUnits } from "../lessons/unit-display.ts";
  import TracePractice from "./TracePractice.svelte";
  import { isTraceable } from "./traceable.ts";

  let { glyphId }: { glyphId: string } = $props();

  const { t } = getI18n();
  const { content, glyphInfo, clips } = getServices();

  const glyph = $derived(
    isTraceable(glyphId) ? (glyphInfo.byId.get(glyphId) ?? null) : null,
  );
  const accent = $derived(
    glyphUnits(content.units).get(glyphId)?.accent ?? "coral",
  );

  onMount(() => {
    if (glyph === null) navigate({ kind: "chart" }, { replace: true });
  });
</script>

<Page
  title={$t("writeLetterButton", { name: glyph?.name ?? glyphId })}
  chrome="none"
>
  {#if glyph !== null}
    <TracePractice {glyph} {accent} onback={back} onfinish={back}>
      {#snippet sound()}
        <SoundButton
          player={clips}
          clipKey={glyph.pujl || glyph.name}
          label={$t("playSound", { reading: glyph.pujl || glyph.name })}
          size="lg"
        />
      {/snippet}
    </TracePractice>
  {/if}
</Page>
