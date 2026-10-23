<script lang="ts">
  import type { UnitAccent } from "./accent.ts";

  interface Props {
    /** Degrees; the tape is stuck on a little crooked. */
    rotate?: number;
    /** The surface it is stuck on. Butter tape vanishes on butter, so it turns paper-white there. */
    on?: UnitAccent | null;
  }

  let { rotate = -3, on = null }: Props = $props();
</script>

<span
  class={["tape", on === "butter" && "tape--on-butter"]}
  style:rotate="{rotate}deg"
  aria-hidden="true"
></span>

<style>
  .tape {
    display: block;
    width: 84px;
    height: 24px;
    background: var(--color-tape);
  }

  .tape--on-butter {
    background: color-mix(in srgb, var(--color-card) 85%, transparent);
  }
</style>
