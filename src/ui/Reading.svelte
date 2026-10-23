<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { readingFontClass } from "./reading-font.ts";

  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    /** A transliterated Latin string shown on its own; the font is per string. */
    text: string;
  }

  let { text, class: className, ...rest }: Props = $props();
</script>

<span {...rest} class={["reading", readingFontClass(text), className]}
  >{text}</span
>
