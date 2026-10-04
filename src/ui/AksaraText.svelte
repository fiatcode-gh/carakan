<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    /** Aksara string, built from engine or content data, never typed. */
    text: string;
    size?: "sm" | "md" | "lg" | "xl" | "hero";
  }

  let { text, size = "md", class: className, ...rest }: Props = $props();
</script>

<span {...rest} class={["aksara", `aksara--${size}`, className]} lang="jv-Java"
  >{text}</span
>
