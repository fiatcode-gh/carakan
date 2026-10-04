<script lang="ts">
  import { untrack } from "svelte";
  import { getI18n } from "../l10n/context.ts";
  import LessonPage from "../features/lessons/LessonPage.svelte";
  import TeacherPage from "../features/lessons/TeacherPage.svelte";
  import ReviewHelpPage from "../features/review/ReviewHelpPage.svelte";
  import SettingsPage from "../features/settings/SettingsPage.svelte";
  import AppShell from "./AppShell.svelte";
  import { route, tabOf } from "./router.ts";
  import { setServices, type Services } from "./services.ts";
  import type { TabId } from "./router.ts";

  let { services }: { services: Services } = $props();

  setServices(untrack(() => services));
  const { t } = getI18n();

  // The tab behind a pushed page: the last tab root seen.
  let lastTab: TabId = "ladder";
  const tab = $derived.by(() => {
    const current = tabOf($route);
    if (current !== null) lastTab = current;
    return lastTab;
  });
  const covered = $derived(tabOf($route) === null);

  $effect(() => {
    document.body.dataset["chrome"] = covered ? "none" : "tabs";
  });

  /** The visible page's `<main>`; hash links are the router's, so no `#main`. */
  function skipToContent(event: MouseEvent): void {
    event.preventDefault();
    const main = [...document.querySelectorAll<HTMLElement>("main")].find(
      (el) => el.checkVisibility(),
    );
    main?.focus();
  }
</script>

<a class="skip-link" href="#main" onclick={skipToContent}>
  {$t("skipToContent")}
</a>
<AppShell activeTab={tab} {covered} />
{#if $route.kind === "settings"}
  <SettingsPage />
{:else if $route.kind === "teacher"}
  <TeacherPage />
{:else if $route.kind === "reviewHelp"}
  <ReviewHelpPage />
{:else if $route.kind === "lesson"}
  {#key $route.unitId}
    <LessonPage unitId={$route.unitId} />
  {/key}
{/if}

<style>
  .skip-link {
    position: fixed;
    top: var(--space-2);
    left: var(--space-2);
    z-index: 100;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-text);
    color: var(--color-bg);
    font-weight: var(--weight-bold);
    transform: translateY(-200%);
  }

  .skip-link:focus-visible {
    transform: none;
  }
</style>
