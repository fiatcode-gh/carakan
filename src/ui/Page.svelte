<script lang="ts">
  import type { Snippet } from "svelte";
  import TopBar from "./TopBar.svelte";

  interface Props {
    title: string;
    /** Pushed pages show a back control. */
    onback?: () => void;
    actions?: Snippet;
    children?: Snippet;
  }

  let { title, onback, actions, children }: Props = $props();
</script>

<div class="screen">
  <TopBar {title} {onback} {actions} />
  <main class="page" tabindex="-1">
    {@render children?.()}
  </main>
</div>
