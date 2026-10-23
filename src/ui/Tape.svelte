<script lang="ts">
  interface Props {
    /** Degrees; the tape is stuck on a little crooked. */
    rotate?: number;
  }

  let { rotate = -3 }: Props = $props();
</script>

<span class="tape" style:rotate="{rotate}deg" aria-hidden="true"></span>

<style>
  .tape {
    display: block;
    width: 84px;
    height: 24px;
    background: var(--color-tape);
  }
</style>
