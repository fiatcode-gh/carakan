<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { back, navigate } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { getI18n } from "../../l10n/context.ts";
  import Page from "../../ui/Page.svelte";
  import StateView from "../../ui/StateView.svelte";
  import { ladderModel } from "./ladder.ts";
  import { LessonSession } from "./lesson-session.ts";
  import LessonView from "./LessonView.svelte";

  let { unitId }: { unitId: string } = $props();

  const { t } = getI18n();
  const services = getServices();

  // A fresh session per mount: leaving the page discards its progress, like
  // popping the Flutter route.
  let session = $state<LessonSession | null>(null);
  let storageFailed = $state(false);
  let cancelled = false;

  async function load(): Promise<void> {
    storageFailed = false;
    const ladder = ladderModel(services);
    await ladder.refresh();
    if (cancelled) return;
    const ladderState = get(ladder.state);
    if (ladderState.kind === "error") {
      storageFailed = true;
      return;
    }
    const entry =
      ladderState.kind === "ready"
        ? ladderState.statuses.find((e) => e.unit.id === unitId)
        : undefined;
    if (
      ladderState.kind !== "ready" ||
      entry === undefined ||
      entry.status === "locked"
    ) {
      navigate({ kind: "ladder" }, { replace: true });
      return;
    }
    const lesson = new LessonSession({
      corpus: services.content.words,
      glyphInfo: services.glyphInfo,
      completions: services.completions,
      reviewQueue: services.reviewQueue,
      mistakes: services.mistakes,
      confusionPairs: services.content.confusionPairs,
      now: services.now,
      seedSource: services.seedSource,
    });
    lesson.start(entry.unit, ladderState.taughtGlyphIds);
    session = lesson;
  }

  onMount(() => {
    void load();
    return () => {
      cancelled = true;
    };
  });
</script>

<Page title={$t("lessonTitle")} onback={back}>
  {#if session !== null}
    <LessonView {session} />
  {:else if storageFailed}
    <StateView
      kind="error"
      title={$t("storageErrorTitle")}
      icon="hard-drive"
      actionLabel={$t("retryButton")}
      onaction={() => void load()}
      page
    />
  {/if}
</Page>
