<script lang="ts">
  import AksaraText from "../../ui/AksaraText.svelte";

  /** The word in Jejeg, from the engine; the component never receives Latin. */
  let { aksara }: { aksara: string } = $props();
</script>

<p class="word-prompt"><AksaraText text={aksara} size="xl" /></p>

<style>
  .word-prompt {
    text-align: center;
    line-height: 1.7;
  }
</style>
