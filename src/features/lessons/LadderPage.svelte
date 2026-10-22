<script lang="ts">
  import { navigate, routeLink } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { nglegena } from "../../engine/index.ts";
  import { getI18n } from "../../l10n/context.ts";
  import HandNote from "../../ui/HandNote.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import Page from "../../ui/Page.svelte";
  import StateView from "../../ui/StateView.svelte";
  import Stamp from "../../ui/Stamp.svelte";
  import HeroLessonCard from "./HeroLessonCard.svelte";
  import { ladderModel } from "./ladder.ts";
  import LessonTile from "./LessonTile.svelte";
  import { unitAccent, unitWatermark } from "./unit-display.ts";

  const { t } = getI18n();
  const services = getServices();
  const { glyphInfo } = services;
  const ladder = ladderModel(services);
  const state = ladder.state;

  // The model follows completions on its own; this only leaves `loading`.
  void ladder.refresh();

  const entries = $derived(
    $state.kind === "ready"
      ? $state.statuses.map(({ unit, status }, index) => ({
          unit,
          status,
          number: index + 1,
          accent: unitAccent(index),
          watermark: unitWatermark(unit, glyphInfo),
        }))
      : [],
  );
  const currentAt = $derived(entries.findIndex((e) => e.status === "ready"));
  const current = $derived(currentAt < 0 ? null : entries[currentAt]!);
  const upcoming = $derived(currentAt < 0 ? [] : entries.slice(currentAt + 1));
  const done = $derived(
    (currentAt < 0 ? entries : entries.slice(0, currentAt)).filter(
      (e) => e.status === "completed",
    ),
  );
  const learned = $derived(
    $state.kind === "ready"
      ? nglegena.filter((a) => $state.taughtGlyphIds.has(a.id)).length
      : 0,
  );
</script>

<Page title={$t("ladderTitle")} margin>
  {#snippet note()}
    {#if $state.kind === "ready"}
      <HandNote tilt
        >{$t("ladderProgress", {
          learned,
          total: nglegena.length,
        })}</HandNote
      >
    {/if}
  {/snippet}
  {#snippet actions()}
    <IconButton
      icon="graduation-cap"
      label={$t("teacherTitle")}
      tone="paper"
      {...routeLink({ kind: "teacher" })}
    />
    <IconButton
      icon="menu"
      label={$t("settingsTitle")}
      tone="butter"
      {...routeLink({ kind: "settings" })}
    />
  {/snippet}
  {#if $state.kind === "loading"}
    <StateView kind="loading" title={$t("loadingLabel")} page />
  {:else if $state.kind === "error"}
    <StateView
      kind="error"
      title={$t("storageErrorTitle")}
      icon="hard-drive"
      actionLabel={$t("retryButton")}
      onaction={() => void ladder.refresh()}
      page
    />
  {:else}
    <div class="ladder">
      {#if current !== null}
        <HeroLessonCard
          unit={current.unit}
          number={current.number}
          accent={current.accent}
          watermark={current.watermark}
          onstart={() => navigate({ kind: "lesson", unitId: current.unit.id })}
        />
      {:else}
        <h2 class="ladder__all-done">{$t("ladderAllDone")}</h2>
      {/if}

      {#if upcoming.length > 0}
        <section class="ladder__section">
          <HandNote tag="h2">{$t("ladderNext")}</HandNote>
          {@render tiles(upcoming)}
        </section>
      {/if}

      {#if done.length > 0}
        <section class="ladder__section">
          <HandNote tag="h2">{$t("ladderDone")}</HandNote>
          {@render tiles(done)}
        </section>
      {:else if !entries.some((e) => e.status === "completed")}
        <div class="ladder__stamp">
          <Stamp variant="decor">{$t("stampLetsStart")}</Stamp>
        </div>
      {/if}
    </div>
  {/if}
</Page>

{#snippet tiles(list: typeof entries)}
  <ul class="ladder__tiles">
    {#each list as e (e.unit.id)}
      <li>
        <LessonTile
          unit={e.unit}
          number={e.number}
          status={e.status}
          accent={e.accent}
          watermark={e.watermark}
          onopen={() => navigate({ kind: "lesson", unitId: e.unit.id })}
        />
      </li>
    {/each}
  </ul>
{/snippet}

<style>
  .ladder {
    display: grid;
    gap: var(--space-6);
    padding-block-start: var(--space-2);
  }

  .ladder__all-done {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--weight-black);
    letter-spacing: var(--tracking-title);
  }

  .ladder__section {
    display: grid;
    gap: var(--space-2);
  }

  .ladder__section > :global(.hand) {
    font-size: 22px;
  }

  .ladder__tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ladder__stamp {
    display: flex;
    justify-content: flex-end;
    padding-inline-end: var(--space-3);
  }
</style>
