<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { setI18n } from "../l10n/context.ts";
  import StateView from "../ui/StateView.svelte";
  import AppReady from "./AppReady.svelte";
  import UpdateBanner from "./UpdateBanner.svelte";
  import type { BootResult, LocaleRuntime } from "./bootstrap.ts";

  interface Props {
    runtime: LocaleRuntime;
    boot: () => Promise<BootResult>;
  }

  let { runtime, boot }: Props = $props();

  const i18n = untrack(() => runtime.i18n);
  setI18n(i18n);
  const { locale, t } = i18n;

  let phase: BootResult | { kind: "loading" } = $state.raw({ kind: "loading" });

  async function start(): Promise<void> {
    phase = { kind: "loading" };
    const result = await boot();
    phase = result;
    // The services hold the closed connection: boot again, which reopens it
    // (or shows the storage error with its retry).
    if (result.kind === "ready") {
      void result.storageLost.then(() => {
        if (phase === result) void start();
      });
    }
  }

  onMount(start);

  // Locale is applied before the first render: `<html lang>` and the title
  // follow the resolved language from the very first effect pass.
  $effect.pre(() => {
    document.documentElement.lang = $locale;
    document.title = $t("appTitle");
  });

  $effect(() => {
    const boot =
      phase.kind === "ready"
        ? "ready"
        : phase.kind === "loading"
          ? "loading"
          : "error";
    document.getElementById("app")?.setAttribute("data-boot", boot);
  });
</script>

{#if phase.kind === "ready"}
  <AppReady services={phase.services} />
{:else if phase.kind === "loading"}
  <StateView kind="loading" title={$t("loadingLabel")} page />
{:else if phase.kind === "content-error"}
  <StateView
    kind="error"
    title={$t("loadErrorTitle")}
    actionLabel={$t("retryButton")}
    onaction={start}
    page
  />
{:else}
  <StateView
    kind="error"
    title={$t("storageErrorTitle")}
    icon="hard-drive"
    actionLabel={$t("retryButton")}
    onaction={start}
    page
  />
{/if}

<UpdateBanner />
