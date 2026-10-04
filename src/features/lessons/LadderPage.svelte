<script lang="ts">
  import { navigate, routeLink } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import AksaraText from "../../ui/AksaraText.svelte";
  import Icon from "../../ui/Icon.svelte";
  import IconButton from "../../ui/IconButton.svelte";
  import Medallion from "../../ui/Medallion.svelte";
  import Page from "../../ui/Page.svelte";
  import StateView from "../../ui/StateView.svelte";
  import { ladderModel, ladderPreview, type UnitStatus } from "./ladder.ts";

  const { t } = getI18n();
  const services = getServices();
  const { glyphInfo } = services;
  const ladder = ladderModel(services);
  const state = ladder.state;

  // The model follows completions on its own; this only leaves `loading`.
  void ladder.refresh();

  const statusLabel = $derived({
    locked: $t("unitStatusLocked"),
    ready: $t("unitStatusReady"),
    completed: $t("unitStatusCompleted"),
  } satisfies Record<UnitStatus, string>);
  const statusIcon = {
    locked: "lock",
    ready: "play",
    completed: "circle-check",
  } as const;
</script>

<Page title={$t("navLadder")}>
  {#snippet actions()}
    <IconButton
      icon="graduation-cap"
      label={$t("teacherTitle")}
      {...routeLink({ kind: "teacher" })}
    />
    <IconButton
      icon="settings"
      label={$t("settingsTitle")}
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
    <ol class="ladder">
      {#each $state.statuses as { unit, status }, i (unit.id)}
        {@const preview = ladderPreview(unit, glyphInfo)}
        <li class="ladder__step" style:--i={i}>
          <Medallion number={i + 1} state={status} />
          <button
            type="button"
            class="unit unit--{status}"
            aria-disabled={status === "locked" ? "true" : undefined}
            onclick={status === "locked"
              ? undefined
              : () => navigate({ kind: "lesson", unitId: unit.id })}
          >
            <span class="unit__name"
              ><span class="visually-hidden">{i + 1}. </span>{unit.name}</span
            >
            {#if preview !== ""}
              <AksaraText
                text={preview}
                class="unit__preview"
                aria-hidden="true"
              />
            {/if}
            <span class="unit__status">
              <Icon name={statusIcon[status]} small />
              {statusLabel[status]}
              {#if status !== "locked"}
                <Icon name="chevron-right" small class="unit__go" />
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</Page>

<style>
  .ladder {
    position: relative;
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ladder__step {
    position: relative;
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
    align-items: start;
    gap: var(--space-3);
    animation: rise 360ms var(--ease-out) backwards;
    animation-delay: calc(var(--i, 0) * 70ms);
  }

  /* The thread the medallions sit on: one segment per step, from this
     medallion's centre to the next one. */
  .ladder__step:not(:last-child)::before {
    content: "";
    position: absolute;
    top: calc(var(--space-4) + 1.5rem);
    left: calc(1.5rem - 1px);
    height: calc(100% + var(--space-4));
    border-left: 2px solid var(--color-border-strong);
    opacity: 0.4;
  }

  .ladder__step > :global(.medallion) {
    z-index: 1;
    margin-top: var(--space-4);
  }

  .unit {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    min-height: var(--touch-min);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-slip);
    color: inherit;
    text-align: start;
  }

  .unit__name {
    font-weight: var(--weight-bold);
    font-size: var(--text-md);
    line-height: var(--leading-snug);
  }

  .unit :global(.unit__preview) {
    min-height: 3.2rem;
    white-space: nowrap;
    overflow-x: clip;
    font-size: var(--aksara-md);
  }

  .unit__status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  .unit__status :global(.unit__go) {
    margin-inline-start: auto;
  }

  .unit--ready {
    border: 2px solid var(--color-accent);
    background: var(--color-surface-raised);
  }

  .unit--ready .unit__status,
  .unit--completed .unit__status {
    color: var(--color-text);
  }

  .unit--locked {
    background: var(--color-surface-sunken);
    box-shadow: none;
    color: var(--color-text-muted);
    cursor: not-allowed;
  }

  .unit--locked :global(.unit__preview) {
    opacity: 0.8;
  }
</style>
