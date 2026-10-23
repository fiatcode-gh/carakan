<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.ts";

  interface Props extends Omit<
    HTMLAttributes<HTMLElement>,
    "title" | "aria-label" | "children"
  > {
    href?: string;
    /** Required: the accessible name and tooltip of an icon-only control. */
    label: string;
    icon: IconName;
    disabled?: boolean;
    /** Fill behind the glyph: the page paper, a card or a butter accent. */
    tone?: "paper" | "card" | "butter";
  }

  let {
    label,
    icon,
    tone = "paper",
    class: className,
    ...rest
  }: Props = $props();
</script>

<Button
  {...rest}
  variant="icon"
  class={["icon-button", `icon-button--${tone}`, className]}
  aria-label={label}
  title={label}
>
  <Icon name={icon} />
</Button>

<style>
  :global(.icon-button--card) {
    background: var(--color-card);
  }

  :global(.icon-button--butter) {
    background: var(--color-butter);
  }
</style>
