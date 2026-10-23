<script lang="ts">
  import type { Snippet } from "svelte";
  import { getI18n } from "../l10n/context.ts";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  const { t } = getI18n();
</script>

<!--
  From 48rem the page is a book on a desk. The window still scrolls (keyboard,
  wheel and focus scrolling keep working); a fixed frame draws the book's border
  and shadow and two fixed bands cover content scrolled past its top and bottom
  edges, so the page looks fixed and scrolls inside. Below 48rem none of the
  decoration exists. The geometry properties are declared in base.css.
-->
<div class="desk">
  <div class="book">{@render children()}</div>
  <div class="desk__band desk__band--top" aria-hidden="true"></div>
  <div class="desk__band desk__band--bottom" aria-hidden="true"></div>
  <div class="desk__frame" aria-hidden="true"></div>
  <p class="desk__wordmark" aria-hidden="true">{$t("appTitle")}</p>
</div>

<style>
  .desk__band,
  .desk__frame,
  .desk__wordmark {
    display: none;
  }

  @media (min-width: 48rem) {
    /* Keeps the book's block margins from collapsing into the body. */
    .desk {
      display: flow-root;
    }

    .book {
      position: relative;
      min-height: calc(100dvh - 2 * var(--desk-block));
      margin: var(--desk-block) var(--book-right) var(--desk-block)
        var(--book-left);
      padding: var(--border-width);
      padding-inline-start: calc(
        var(--book-margin-line) + 2 * var(--border-width)
      );
      background-color: var(--color-paper);
      background-image: var(--paper-rules);
    }

    .book::before {
      content: "";
      position: absolute;
      inset-block: 0;
      inset-inline-start: calc(var(--border-width) + var(--book-margin-line));
      width: 2px;
      background: var(--color-margin);
      opacity: 0.8;
      pointer-events: none;
    }

    .desk__band {
      display: block;
      position: fixed;
      inset-inline: 0;
      height: var(--desk-block);
      background: var(--color-neutral);
      z-index: 19;
    }

    .desk__band--top {
      top: 0;
    }

    .desk__band--bottom {
      bottom: 0;
    }

    .desk__frame {
      display: block;
      position: fixed;
      inset: var(--desk-block) var(--book-right) var(--desk-block)
        var(--book-left);
      border: var(--border);
      box-shadow: var(--shadow-hero);
      pointer-events: none;
      z-index: 20;
    }
  }

  @media (min-width: 64rem) {
    .desk__wordmark {
      display: block;
      position: fixed;
      z-index: 30;
      top: calc(var(--desk-block) + var(--space-7));
      left: calc(var(--book-left) / 2);
      translate: -50% 0;
      rotate: 180deg;
      writing-mode: vertical-rl;
      margin: 0;
      font-size: var(--text-xl);
      font-weight: var(--weight-black);
      letter-spacing: var(--tracking-title);
      line-height: 1;
    }
  }

  /* A worksheet has no margin line and no wordmark. */
  @media (min-width: 48rem) {
    :global(body[data-layout="worksheet"]) .book {
      padding-inline-start: var(--border-width);
    }

    :global(body[data-layout="worksheet"]) .book::before,
    :global(body[data-layout="worksheet"]) .desk__wordmark {
      display: none;
    }
  }
</style>
