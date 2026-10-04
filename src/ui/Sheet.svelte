<script lang="ts">
  import type { Snippet } from "svelte";
  import { getI18n } from "../l10n/context.ts";
  import IconButton from "./IconButton.svelte";

  interface Props {
    title: string;
    /** Fires once the dialog has closed (button, Esc or Android back). */
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { title, onclose, children, footer }: Props = $props();

  const { t } = getI18n();
  const uid = $props.id();
  const titleId = `sheet-${uid}`;
  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  let body: HTMLDivElement;
  // A scrolling region must be reachable by keyboard (WCAG 2.1.1).
  let scrolls = $state(false);

  // Mount = open. Rendering the component inside `{#if}` is the open state.
  $effect(() => {
    const measure = () => (scrolls = body.scrollHeight > body.clientHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    for (const child of body.children) observer.observe(child);
    return () => observer.disconnect();
  });

  $effect(() => {
    dialog.showModal();
    heading.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  });
</script>

<dialog bind:this={dialog} class="sheet" aria-labelledby={titleId} {onclose}>
  <span class="sheet__grab" aria-hidden="true"></span>
  <div class="sheet__head">
    <h2 class="sheet__title" id={titleId} tabindex="-1" bind:this={heading}>
      {title}
    </h2>
    <IconButton
      icon="x"
      label={$t("closeButton")}
      onclick={() => dialog.close()}
    />
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="sheet__body"
    bind:this={body}
    tabindex={scrolls ? 0 : undefined}
    role={scrolls ? "region" : undefined}
    aria-labelledby={scrolls ? titleId : undefined}
  >
    {@render children()}
  </div>
  {#if footer}
    <div class="sheet__foot">{@render footer()}</div>
  {/if}
</dialog>

<style>
  .sheet {
    position: fixed;
    inset: auto 0 0 0;
    width: 100%;
    max-width: var(--content-max);
    max-height: 88vh;
    max-height: 88dvh;
    margin: 0 auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-sheet);
    color: var(--color-text);
    overflow: hidden;
  }

  .sheet[open] {
    display: flex;
    flex-direction: column;
    animation: sheet-in var(--dur-base) var(--ease-out) both;
  }

  .sheet::backdrop {
    background: var(--color-scrim);
  }

  @keyframes sheet-in {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .sheet__head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-2) var(--space-2) var(--space-5);
    border-bottom: 1px solid var(--color-border);
  }

  .sheet__grab {
    position: absolute;
    top: var(--space-1);
    left: 50%;
    width: 2.5rem;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--color-border-strong);
    opacity: 0.5;
    translate: -50% 0;
  }

  .sheet__title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-lg);
  }

  /* The title takes initial focus when a sheet opens; it is not a control. */
  .sheet__title:focus {
    outline: none;
  }

  .sheet__body {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-5);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .sheet__foot {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    padding: var(--space-3) var(--space-5) var(--space-5);
    border-top: 1px solid var(--color-border);
  }

  @media (min-width: 48rem) {
    .sheet {
      inset: 0;
      margin: auto;
      height: fit-content;
      border-radius: var(--radius-lg);
    }
  }
</style>
