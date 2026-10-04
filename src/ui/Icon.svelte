<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";
  import { icons, type IconName } from "./icons.ts";

  interface Props extends SVGAttributes<SVGSVGElement> {
    name: IconName;
    small?: boolean;
  }

  let { name, small = false, class: className, ...rest }: Props = $props();
</script>

<svg
  {...rest}
  class={["icon", small && "icon--sm", className]}
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  {#each icons[name] as { tag, ...attributes }}
    <svelte:element this={tag} {...attributes} />
  {/each}
</svg>

<style>
  .icon {
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
    fill: none;
    stroke: currentcolor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .icon--sm {
    width: 1.125rem;
    height: 1.125rem;
  }
</style>
