import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { toAksara } from "../../src/engine/index.ts";

// Renders public/icons/*.png from tools/icons/icon.html with the shipped
// Jejeg font. Usage: node tools/icons/render.ts (npm run icons)

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");
const fileUrl = (...path: string[]) => pathToFileURL(join(root, ...path)).href;

function aksara(latin: string): string {
  const result = toAksara(latin);
  if (result.kind === "success") return result.output;
  if (result.kind === "ambiguous" && result.candidates[0] !== undefined) {
    return result.candidates[0].output;
  }
  throw new Error(`cannot convert ${JSON.stringify(latin)}`);
}

const fonts = `<style>
@font-face { font-family: "MPLUS Rounded 1c"; font-weight: 400; src: url("${fileUrl("public/fonts/mplus-rounded-1c-400.woff2")}") format("woff2"); }
@font-face { font-family: "MPLUS Rounded 1c"; font-weight: 700; src: url("${fileUrl("public/fonts/mplus-rounded-1c-700.woff2")}") format("woff2"); }
@font-face { font-family: "Jejeg"; font-display: block; src: url("${fileUrl("public/fonts/nykNgayogyanJejeg-Regular.ttf")}") format("truetype"); unicode-range: U+A980-A9DF, U+200C-200D, U+25CC; }
</style>`;

const html = read("tools/icons/icon.html")
  .replace("<!--TOKENS-->", `<style>${read("src/styles/tokens.css")}</style>`)
  .replace("<!--FONTS-->", fonts)
  .replaceAll(
    /<span class="icon-glyph" data-latin="([^"]+)"><\/span>/g,
    (_, latin: string) => `<span class="icon-glyph">${aksara(latin)}</span>`,
  );

mkdirSync(join(root, ".cache/icons"), { recursive: true });
const page = join(root, ".cache/icons/icon.html");
writeFileSync(page, html);
mkdirSync(join(root, "public/icons"), { recursive: true });

const targets = [
  { tile: "#icon-any", size: 192, file: "icon-192.png" },
  { tile: "#icon-any", size: 512, file: "icon-512.png" },
  { tile: "#icon-maskable", size: 512, file: "icon-maskable-512.png" },
];

const browser = await chromium.launch();
try {
  for (const { tile, size, file } of targets) {
    // The tiles are 512 CSS px; the scale factor shrinks them to `size`.
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1200 },
      deviceScaleFactor: size / 512,
    });
    const tab = await context.newPage();
    await tab.goto(pathToFileURL(page).href);
    // Transparent corners on the rounded "any" plate.
    await tab.addStyleTag({ content: "body { background: transparent; }" });
    await tab.evaluate(() => document.fonts.ready);
    const loaded = await tab.evaluate(() =>
      [...document.fonts].some(
        (face) => face.family.includes("Jejeg") && face.status === "loaded",
      ),
    );
    if (!loaded) throw new Error("Jejeg did not load");
    await tab.locator(tile).screenshot({
      path: join(root, "public/icons", file),
      omitBackground: true,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
