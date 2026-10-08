<script lang="ts">
  import { back } from "../../app/router.ts";
  import { getServices } from "../../app/services.ts";
  import { appVersion } from "../../core/app-info.ts";
  import type { LocaleSetting } from "../../core/locale/locale-controller.ts";
  import { aksaraEngineRulesetId } from "../../engine/index.ts";
  import { getI18n } from "../../l10n/context.ts";
  import type { MessageKey } from "../../l10n/i18n.ts";
  import Button from "../../ui/Button.svelte";
  import Icon from "../../ui/Icon.svelte";
  import Page from "../../ui/Page.svelte";
  import Slip from "../../ui/Slip.svelte";
  import Toast from "../../ui/Toast.svelte";
  import { CORPUS_LINKS, FONT_LINKS, fileName } from "./about-links.ts";
  import { buildFeedbackReport } from "./feedback-report.ts";
  import ReportDialog from "./ReportDialog.svelte";
  import ResetDialog from "./ResetDialog.svelte";

  const { t } = getI18n();
  const { locale, progress } = getServices();
  const setting = locale.setting;

  const options = $derived<readonly { value: LocaleSetting; label: string }[]>([
    { value: "system", label: $t("languageSystem") },
    { value: "id", label: $t("languageIndonesian") },
    { value: "en", label: $t("languageEnglish") },
  ]);

  let radios: HTMLInputElement[] = [];

  function choose(value: LocaleSetting): void {
    if (locale.select(value)) return;
    // Not persisted, so not applied: put the checked radio back.
    for (const radio of radios) radio.checked = radio.value === $setting;
  }

  // The description belongs to this page: kept across dialog openings,
  // dropped when the page is left.
  let description = $state("");
  let reportOpen = $state(false);
  let toast = $state<MessageKey | null>(null);
  let copyFailed = $state(false);

  /** False when the clipboard refused (permission, insecure context). */
  async function writeReport(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(
        buildFeedbackReport({
          description,
          appVersion,
          rulesetId: aksaraEngineRulesetId,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async function copyReport(): Promise<void> {
    copyFailed = !(await writeReport());
    if (copyFailed) return;
    reportOpen = false;
    showToast("reportCopied");
  }

  let resetOpen = $state(false);
  let resetFailed = $state(false);
  /** Ignores a second confirm while one erase is in flight. */
  let erasing = false;
  /** Restarts the toast timer when the same message shows twice in a row. */
  let toastCount = $state(0);

  function showToast(message: MessageKey): void {
    toast = message;
    toastCount += 1;
  }

  function openReset(): void {
    resetFailed = false;
    resetOpen = true;
  }

  async function eraseProgress(): Promise<void> {
    if (erasing) return;
    erasing = true;
    // Cleared first so a repeated failure mounts the alert again and is
    // announced again.
    resetFailed = false;
    try {
      await progress.erase();
    } catch {
      resetFailed = true;
      return;
    } finally {
      erasing = false;
    }
    resetOpen = false;
    showToast("resetDone");
  }
</script>

<Page title={$t("settingsTitle")} onback={back}>
  <div class="stack stack--loose">
    <fieldset class="language">
      <legend class="language__legend">{$t("languageHeading")}</legend>
      <div class="language__options">
        {#each options as option, index (option.value)}
          <label class="language__option">
            <input
              type="radio"
              name="ui-language"
              value={option.value}
              checked={$setting === option.value}
              bind:this={radios[index]}
              onchange={() => choose(option.value)}
            />
            <span class="language__label">{option.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <section class="stack" aria-labelledby="about-heading">
      <h2 id="about-heading">{$t("aboutSectionHeading")}</h2>
      <Slip>
        <p class="about__title">{$t("appTitle")}</p>
        <p class="muted">{$t("appSubtitle")}</p>
        <p>{$t("versionLabel", { version: appVersion })}</p>
      </Slip>
      <Slip tag="section" aria-labelledby="about-ruleset">
        <h3 id="about-ruleset">{$t("rulesetHeading")}</h3>
        <p>{aksaraEngineRulesetId}</p>
      </Slip>
      <Slip tag="section" aria-labelledby="about-sources">
        <h3 id="about-sources">{$t("ruleSourceHeading")}</h3>
        <p>{$t("ruleSourceBody")}</p>
      </Slip>
      <Slip tag="section" aria-labelledby="about-fonts">
        <h3 id="about-fonts">{$t("fontHeading")}</h3>
        <p>{$t("fontBody")}</p>
        <ul class="links">
          {#each FONT_LINKS as path (path)}
            <li><a href={path}>{fileName(path)}</a></li>
          {/each}
        </ul>
      </Slip>
      <Slip tag="section" aria-labelledby="about-corpus">
        <h3 id="about-corpus">{$t("corpusHeading")}</h3>
        <p>{$t("corpusBody")}</p>
        <ul class="links">
          {#each CORPUS_LINKS as path (path)}
            <li><a href={path}>{fileName(path)}</a></li>
          {/each}
        </ul>
      </Slip>
    </section>

    <Button variant="secondary" block onclick={() => (reportOpen = true)}>
      {$t("reportButton")}
    </Button>

    <section class="reset" aria-labelledby="reset-heading">
      <h2 id="reset-heading" class="reset__heading">
        <Icon name="triangle-alert" />{$t("resetHeading")}
      </h2>
      <p>{$t("resetBody")}</p>
      <Button variant="danger" block onclick={openReset}>
        {$t("resetButton")}
      </Button>
    </section>
  </div>
</Page>

{#if reportOpen}
  <ReportDialog
    bind:description
    failed={copyFailed}
    oncopy={copyReport}
    onclose={() => {
      reportOpen = false;
      copyFailed = false;
    }}
  />
{/if}
{#if resetOpen}
  <ResetDialog
    failed={resetFailed}
    onconfirm={eraseProgress}
    onclose={() => (resetOpen = false)}
  />
{/if}
{#if toast !== null}
  {#key toastCount}
    <Toast onclose={() => (toast = null)}>{$t(toast)}</Toast>
  {/key}
{/if}

<style>
  .stack--loose {
    gap: var(--space-6);
  }

  .reset {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 2px dashed var(--color-danger);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .reset__heading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-danger);
  }

  .language {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .language__legend {
    margin-bottom: var(--space-2);
    padding: 0;
    font-weight: var(--weight-bold);
  }

  .language__options {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-sunken);
  }

  .language__option {
    position: relative;
    display: flex;
  }

  .language__option input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .language__label {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--touch-min);
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: var(--weight-bold);
  }

  .language__option input:checked + .language__label {
    background: var(--color-accent);
    color: var(--color-on-accent);
    box-shadow: 0 2px 0 var(--color-accent-pressed);
  }

  .language__option input:focus-visible + .language__label {
    outline: var(--focus-ring);
    outline-offset: 2px;
  }

  .about__title {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
  }

  .muted {
    color: var(--color-text-muted);
  }

  .links {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  .links a {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-min);
    color: var(--color-link);
  }
</style>
