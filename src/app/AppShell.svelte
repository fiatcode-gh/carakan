<script lang="ts">
  import { getI18n } from "../l10n/context.ts";
  import ChartPage from "../features/chart/ChartPage.svelte";
  import ConverterPage from "../features/converter/ConverterPage.svelte";
  import LadderPage from "../features/lessons/LadderPage.svelte";
  import ReviewPage from "../features/review/ReviewPage.svelte";
  import TabBar from "../ui/TabBar.svelte";
  import { routeLink, type TabId } from "./router.ts";
  import { getServices } from "./services.ts";

  interface Props {
    activeTab: TabId;
    /** A pushed page covers the shell: it stays mounted, hidden. */
    covered: boolean;
  }

  let { activeTab, covered }: Props = $props();

  const { t } = getI18n();
  const { setActiveTab } = getServices();

  $effect(() => setActiveTab(activeTab));

  const tabs = $derived([
    { id: "ladder", label: $t("navLadder"), icon: "book-open" },
    { id: "chart", label: $t("navChart"), icon: "layout-grid" },
    { id: "review", label: $t("navReview"), icon: "repeat" },
    { id: "converter", label: $t("navConverter"), icon: "arrow-left-right" },
  ] as const);
</script>

<div class="shell" hidden={covered}>
  <div id="tab-ladder" hidden={activeTab !== "ladder"}><LadderPage /></div>
  <div id="tab-chart" hidden={activeTab !== "chart"}><ChartPage /></div>
  <div id="tab-review" hidden={activeTab !== "review"}><ReviewPage /></div>
  <div id="tab-converter" hidden={activeTab !== "converter"}>
    <ConverterPage />
  </div>
  <TabBar
    label={$t("mainNavLabel")}
    items={tabs.map((tab) => ({
      ...routeLink({ kind: tab.id }),
      label: tab.label,
      icon: tab.icon,
      current: tab.id === activeTab,
    }))}
  />
</div>

<style>
  @media (min-width: 60rem) {
    .shell {
      padding-inline-start: var(--rail-width);
    }
  }
</style>
