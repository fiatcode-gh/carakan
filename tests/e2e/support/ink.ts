import type { Locator, Page } from "@playwright/test";

export interface InkGaps {
  /** Empty CSS px between the top of the area and its first inked row. */
  readonly top: number;
  /** Empty CSS px between the last inked row and the bottom of the area. */
  readonly bottom: number;
}

/**
 * Looks at the pixels of an element and reports how far the ink is from its
 * top and bottom edges (to within a CSS px). Geometry (ranges, line boxes)
 * cannot answer this: a stacked aksara draws well outside its line box. The
 * picture is cropped to whole CSS px inside the element and 2px in from its
 * sides, so a neighbouring border never reads as ink. Null when nothing is
 * drawn.
 */
export async function inkGaps(
  page: Page,
  area: Locator,
): Promise<InkGaps | null> {
  // Centred, so the fixed tab bar does not cover the area it is scrolled to.
  await area.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = (await area.boundingBox())!;
  const top = Math.ceil(box.y);
  const png = await page.screenshot({
    clip: {
      x: Math.ceil(box.x) + 2,
      y: top,
      width: Math.floor(box.width) - 4,
      height: Math.floor(box.y + box.height) - top,
    },
  });
  const scan = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let first = -1;
    let last = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const at = (y * canvas.width + x) * 4;
        // The card is near white; ink and its antialiasing are well below.
        if (data[at]! + data[at + 1]! + data[at + 2]! < 600) {
          if (first < 0) first = y;
          last = y;
          break;
        }
      }
    }
    return { first, last, height: canvas.height, scale: devicePixelRatio };
  }, png.toString("base64"));
  if (scan.first < 0) return null;
  return {
    top: scan.first / scan.scale,
    bottom: (scan.height - 1 - scan.last) / scan.scale,
  };
}
