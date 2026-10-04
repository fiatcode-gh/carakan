/**
 * Lucide 1.51.0 (ISC, see public/licenses/lucide-LICENSE.txt) path data for the
 * icons named in docs/design/prototype-review.md. Drawn by Icon.svelte on a
 * 24x24 viewBox with a 2px round stroke.
 */
export interface IconShape {
  readonly tag: "path" | "circle" | "rect";
  readonly [attribute: string]: string | number;
}

export const icons = {
  "arrow-left-right": [
    { tag: "path", d: "M8 3 4 7l4 4" },
    { tag: "path", d: "M4 7h16" },
    { tag: "path", d: "m16 21 4-4-4-4" },
    { tag: "path", d: "M20 17H4" },
  ],
  "arrow-left": [
    { tag: "path", d: "m12 19-7-7 7-7" },
    { tag: "path", d: "M19 12H5" },
  ],
  "book-open": [
    { tag: "path", d: "M12 5v16" },
    {
      tag: "path",
      d: "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",
    },
  ],
  check: [{ tag: "path", d: "M20 6 9 17l-5-5" }],
  "chevron-right": [{ tag: "path", d: "m9 18 6-6-6-6" }],
  "circle-check": [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "m16 9-5.5 5.5L8 12" },
  ],
  "circle-help": [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" },
    { tag: "path", d: "M12 17h.01" },
  ],
  "circle-x": [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "m15 9-6 6" },
    { tag: "path", d: "m9 9 6 6" },
  ],
  copy: [
    { tag: "rect", width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 },
    {
      tag: "path",
      d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
    },
  ],
  "graduation-cap": [
    {
      tag: "path",
      d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
    },
    { tag: "path", d: "M22 10v6" },
    { tag: "path", d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" },
  ],
  "hard-drive": [
    { tag: "path", d: "M10 16h.01" },
    {
      tag: "path",
      d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
    },
    { tag: "path", d: "M21.946 12.013H2.054" },
    { tag: "path", d: "M6 16h.01" },
  ],
  info: [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "M12 16v-4" },
    { tag: "path", d: "M12 8h.01" },
  ],
  keyboard: [
    { tag: "path", d: "M10 8h.01" },
    { tag: "path", d: "M12 12h.01" },
    { tag: "path", d: "M14 8h.01" },
    { tag: "path", d: "M16 12h.01" },
    { tag: "path", d: "M18 8h.01" },
    { tag: "path", d: "M6 8h.01" },
    { tag: "path", d: "M7 16h10" },
    { tag: "path", d: "M8 12h.01" },
    { tag: "rect", width: 20, height: 16, x: 2, y: 4, rx: 2 },
  ],
  "layout-grid": [
    { tag: "rect", width: 7, height: 7, x: 3, y: 3, rx: 1 },
    { tag: "rect", width: 7, height: 7, x: 14, y: 3, rx: 1 },
    { tag: "rect", width: 7, height: 7, x: 14, y: 14, rx: 1 },
    { tag: "rect", width: 7, height: 7, x: 3, y: 14, rx: 1 },
  ],
  lock: [
    { tag: "rect", width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 },
    { tag: "path", d: "M7 11V7a5 5 0 0 1 10 0v4" },
  ],
  play: [
    {
      tag: "path",
      d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
    },
  ],
  "refresh-cw": [
    { tag: "path", d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" },
    { tag: "path", d: "M21 3v5h-5" },
    { tag: "path", d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" },
    { tag: "path", d: "M8 16H3v5" },
  ],
  repeat: [
    { tag: "path", d: "m17 2 4 4-4 4" },
    { tag: "path", d: "M3 11v-1a4 4 0 0 1 4-4h14" },
    { tag: "path", d: "m7 22-4-4 4-4" },
    { tag: "path", d: "M21 13v1a4 4 0 0 1-4 4H3" },
  ],
  settings: [
    {
      tag: "path",
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
    },
    { tag: "circle", cx: 12, cy: 12, r: 3 },
  ],
  "triangle-alert": [
    {
      tag: "path",
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
    },
    { tag: "path", d: "M12 9v4" },
    { tag: "path", d: "M12 17h.01" },
  ],
  trophy: [
    { tag: "path", d: "M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" },
    { tag: "path", d: "M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" },
    {
      tag: "path",
      d: "M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3",
    },
    { tag: "path", d: "M4 22h16" },
    { tag: "path", d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" },
    { tag: "path", d: "M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" },
  ],
  x: [
    { tag: "path", d: "M18 6 6 18" },
    { tag: "path", d: "m6 6 12 12" },
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof icons;
