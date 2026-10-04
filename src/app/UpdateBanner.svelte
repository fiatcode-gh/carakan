<script lang="ts">
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import { getI18n } from "../l10n/context.ts";
  import Button from "../ui/Button.svelte";
  import { route } from "./router.ts";

  const { t } = getI18n();

  // Set while this page's own Reload is waiting for the worker to take over.
  let accepted = false;
  // The new worker took over because another window accepted. This page keeps
  // running on the assets it loaded; its next load is the new build.
  let takenOverElsewhere = $state(false);

  // The only code path that registers the worker, asks it to take over, or
  // reloads. The library reloads every window on `controlling`, so it is
  // `onNeedReload` that limits the reload to the window that accepted: a lesson
  // in another window is never interrupted.
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onNeedReload() {
      if (accepted) window.location.reload();
      else takenOverElsewhere = true;
    },
  });

  function reload(): void {
    // No waiting worker is left to activate; a plain reload loads the new build.
    if (takenOverElsewhere) window.location.reload();
    else {
      accepted = true;
      void updateServiceWorker(true);
    }
  }

  // "Later" lasts for this page lifetime; the next launch asks again.
  let later = $state(false);

  // A lesson is never interrupted.
  const visible = $derived($needRefresh && !later && $route.kind !== "lesson");
</script>

{#if visible}
  <div class="update" role="status">
    <p class="update__text">{$t("updateAvailable")}</p>
    <div class="update__actions">
      <Button variant="primary" onclick={reload}>
        {$t("updateReloadButton")}
      </Button>
      <Button variant="quiet" onclick={() => (later = true)}>
        {$t("updateLaterButton")}
      </Button>
    </div>
  </div>
{/if}

<style>
  .update {
    position: fixed;
    left: 50%;
    bottom: calc(var(--tab-height) + var(--space-4));
    z-index: 70;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
    width: min(calc(100% - var(--space-8)), 26rem);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-sheet);
    translate: -50% 0;
    animation: rise var(--dur-base) var(--ease-out) both;
  }

  .update__text {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    line-height: var(--leading-snug);
  }

  .update__actions {
    display: flex;
    gap: var(--space-2);
  }

  :global(body[data-chrome="none"]) .update {
    bottom: var(--space-5);
  }

  @media (min-width: 60rem) {
    :global(body[data-chrome="tabs"]) .update {
      bottom: var(--space-6);
    }
  }
</style>
