<script lang="ts">
  import type { Snippet } from "svelte";
  import TopBar from "./TopBar.svelte";

  interface Props {
    title: string;
    /** Pushed pages show a back control. */
    onback?: () => void;
    /** Default: "pushed" with `onback`, otherwise "tab". "none": the page draws its own header. */
    chrome?: "tab" | "pushed" | "none";
    /** Tab chrome only: a hand note under the actions. */
    note?: Snippet;
    actions?: Snippet;
    /** Notebook margin line (Learn only). */
    margin?: boolean;
    children?: Snippet;
  }

  let {
    title,
    onback,
    chrome = onback ? "pushed" : "tab",
    note,
    actions,
    margin = false,
    children,
  }: Props = $props();
</script>

<div class="screen">
  {#if chrome === "none"}
    <h1 class="visually-hidden">{title}</h1>
  {:else}
    <TopBar {title} {chrome} {onback} {note} {actions} />
  {/if}
  <main class={["page", margin && "page--margin"]} tabindex="-1">
    {@render children?.()}
  </main>
</div>
