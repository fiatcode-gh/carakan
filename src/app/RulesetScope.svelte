<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import { setServices, type Services } from "./services.ts";

  let { services, children }: { services: Services; children: Snippet } =
    $props();

  setServices(untrack(() => services));
</script>

{@render children()}
