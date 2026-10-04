// Design prototype wiring: hash-based section switching, sheet/toast open and
// close, and aksara filled at runtime from the engine. No aksara literal lives
// in this directory (the Task 02 guard scans it); everything is derived from
// Unicode names or content ids.
import { loadContent } from "../src/content/content-repository.ts";
import { GlyphInfoTable } from "../src/content/glyph-info-table.ts";
import { javaneseChar, toAksara } from "../src/engine/index.ts";

const NAME_SPLIT = /\s(?=JAVANESE )/;

function names(value: string): string[] {
  return value.trim().split(NAME_SPLIT);
}

function ambiguousFirst(text: string): string {
  const result = toAksara(text);
  if (result.kind === "success") return result.output;
  if (result.kind === "ambiguous") return result.candidates[0]?.output ?? "";
  return "";
}

/** `data-latin`, `data-glyph` and `data-carrier` need no content. */
function fillFromEngine(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-latin]")) {
    const text = ambiguousFirst(el.dataset["latin"] ?? "");
    if (el instanceof HTMLTextAreaElement) el.value = text;
    else el.textContent = text;
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-glyph]")) {
    el.textContent = names(el.dataset["glyph"] ?? "")
      .map(javaneseChar)
      .join("");
  }
  const ha = javaneseChar("JAVANESE LETTER HA");
  for (const el of root.querySelectorAll<HTMLElement>("[data-carrier]")) {
    el.textContent = names(el.dataset["carrier"] ?? "")
      .map((sign) => ha + javaneseChar(sign))
      .join(" ");
  }
}

/** `data-id`, `data-unit-name`, `data-unit-preview`: the app's own content. */
async function fillFromContent(root: ParentNode): Promise<void> {
  if (
    root.querySelector("[data-id], [data-unit-name], [data-unit-preview]") ===
    null
  ) {
    return;
  }
  const content = await loadContent(async (path) => {
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.text();
  });
  const info = GlyphInfoTable.build(content);
  for (const el of root.querySelectorAll<HTMLElement>("[data-id]")) {
    el.textContent = info.byId.get(el.dataset["id"] ?? "")?.char ?? "";
  }
  const unit = (id: string) => content.units.find((u) => u.id === id);
  for (const el of root.querySelectorAll<HTMLElement>("[data-unit-name]")) {
    el.textContent = unit(el.dataset["unitName"] ?? "")?.name ?? "";
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-unit-preview]")) {
    // Same rule as the app's ladder: first five non-empty chars, space-joined.
    el.textContent = (unit(el.dataset["unitPreview"] ?? "")?.glyphs ?? [])
      .map((g) => info.byId.get(g)?.char ?? "")
      .filter((c) => c !== "")
      .slice(0, 5)
      .join(" ");
  }
}

/** `data-convert-of` runs the real engine for the converter variants. */
function fillConversions(root: ParentNode): void {
  for (const box of root.querySelectorAll<HTMLElement>("[data-convert-of]")) {
    const input = box.dataset["convertOf"] ?? "";
    const result = toAksara(input);
    const slot = (name: string) =>
      box.querySelector<HTMLElement>(`[data-slot="${name}"]`);
    if (result.kind === "ambiguous") {
      const out = slot("output");
      const chips = slot("candidates");
      const pick = (text: string) => {
        if (out) out.textContent = text;
        for (const chip of chips?.querySelectorAll("button") ?? []) {
          chip.setAttribute(
            "aria-pressed",
            String(chip.dataset["value"] === text),
          );
        }
      };
      for (const candidate of result.candidates) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip chip--choice";
        chip.dataset["value"] = candidate.output;
        chip.innerHTML =
          '<svg class="icon icon--sm" aria-hidden="true"><use href="#i-check"></use></svg>';
        chip.append(candidate.output);
        chip.addEventListener("click", () => pick(candidate.output));
        chips?.append(chip);
      }
      pick(result.candidates[0]?.output ?? "");
    } else if (result.kind === "error") {
      const message = slot("message");
      if (message) message.textContent = result.message;
      const echo = slot("echo");
      if (echo) {
        // W08: mark the offending character at `index` in the input echo.
        const chars = [...result.input];
        const mark = document.createElement("mark");
        mark.textContent = chars[result.index] ?? "";
        echo.append(
          chars.slice(0, result.index).join(""),
          mark,
          chars.slice(result.index + 1).join(""),
        );
      }
    }
  }
}

// ---- routing -------------------------------------------------------------

const sections = [
  ...document.querySelectorAll<HTMLElement>("main > section.screen"),
];
const tabLinks = [
  ...document.querySelectorAll<HTMLAnchorElement>(".tab-bar a"),
];
let toastTimer: number | undefined;

function closeOverlays(): void {
  for (const dialog of document.querySelectorAll("dialog[open]")) {
    (dialog as HTMLDialogElement).close();
  }
  for (const toast of document.querySelectorAll<HTMLElement>(".toast"))
    toast.hidden = true;
}

function showToast(id: string): void {
  for (const toast of document.querySelectorAll<HTMLElement>(".toast"))
    toast.hidden = true;
  const toast = document.getElementById(id);
  if (toast === null) return;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 4000);
}

/** `#section` or `#section+overlay` (a `sheet-*` dialog or a `toast-*`). */
function route(): void {
  const [id = "", overlay] = location.hash.slice(1).split("+");
  const target = sections.find((s) => s.id === id);
  if (target === undefined) {
    location.replace("#ladder");
    return;
  }
  closeOverlays();
  for (const section of sections) section.hidden = section !== target;
  document.body.dataset["chrome"] = target.dataset["chrome"] ?? "tabs";
  for (const link of tabLinks) {
    if (link.dataset["tab"] === target.dataset["tab"])
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  document.title = "Carakan";
  // A section id is also a fragment target: undo the browser's own scroll to it.
  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));
  if (overlay?.startsWith("sheet-")) {
    (document.getElementById(overlay) as HTMLDialogElement | null)?.showModal();
  } else if (overlay?.startsWith("toast-")) {
    showToast(overlay);
  }
}

function wireInteractions(): void {
  document.addEventListener("click", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    const open = el.closest<HTMLElement>("[data-open]");
    if (open !== null) {
      (
        document.getElementById(
          open.dataset["open"] ?? "",
        ) as HTMLDialogElement | null
      )?.showModal();
    }
    const toast = el.closest<HTMLElement>("[data-toast]");
    if (toast !== null) showToast(toast.dataset["toast"] ?? "");
    if (el.closest("[data-close]") !== null) el.closest("dialog")?.close();
    if (el instanceof HTMLDialogElement) el.close(); // backdrop click
    if (el.closest("[data-skip]") !== null) {
      event.preventDefault();
      document.getElementById("main")?.focus();
    }
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el instanceof HTMLInputElement && el.dataset["goto"] !== undefined) {
      location.hash = `#${el.dataset["goto"]}`;
    }
  });
}

fillFromEngine(document);
fillConversions(document);
if (sections.length > 0) {
  wireInteractions();
  window.addEventListener("hashchange", route);
  window.addEventListener("load", () => window.scrollTo(0, 0));
  route();
}
try {
  await fillFromContent(document);
} catch (error) {
  console.error("prototype content failed to load", error);
}
await document.fonts.ready;
document.body.dataset["ready"] = "true";
