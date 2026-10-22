<script lang="ts" generics="V extends string">
  interface Props {
    /** Accessible name of the radio group. */
    label: string;
    options: readonly { value: V; label: string }[];
    value: V;
    onchange?: (value: V) => void;
  }

  let { label, options, value = $bindable(), onchange }: Props = $props();

  const uid = $props.id();
  const name = `segmented-${uid}`;
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <label class="segmented__cell">
      <input
        type="radio"
        {name}
        value={option.value}
        checked={value === option.value}
        onchange={() => {
          value = option.value;
          onchange?.(option.value);
        }}
      />
      {option.label}
    </label>
  {/each}
</div>
