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
  }

  let { label, icon, ...rest }: Props = $props();
</script>

<Button {...rest} variant="icon" aria-label={label} title={label}>
  <Icon name={icon} />
</Button>
