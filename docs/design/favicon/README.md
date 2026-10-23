# Carakan favicon · R2

A coral note with ꦲ (ha), tilted −6° and taped on. Behind it, a butter card (−3°) and a straight periwinkle card spread out to the right.
The letter is the nyk Ngayogyan Jejeg outline (by Apri Nugroho), converted to vector paths. No font file is needed to show the icon.

## Files

| File | Use |
|---|---|
| `favicon.ico` | Legacy browsers. Contains 16, 32 and 48 px. The 16 px one is hand-tuned. |
| `favicon.svg` | Modern browser tabs. Transparent background. |
| `apple-touch-icon.png` | iOS home screen, 180 px, ruled-paper background. |
| `icon-192.png`, `icon-512.png` | PWA (progressive web app) and Android icons, purpose "any". |
| `icon-maskable-512.png` | Android adaptive icon, purpose "maskable". The stack sits inside the 80% safe zone, so circle and squircle masks do not cut it. |
| `site.webmanifest` | Manifest that points to the icons above. |
| `src/` | SVG sources: 16 px tab icon, app icon, maskable icon. |
| `preview.png` | The icon in light and dark tabs and on home screens. |

## Install

Copy the files into the web root. For Flutter web, that is the `web/` folder.

Put this in `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#F7F3EA">
```

Flutter web already creates `web/manifest.json` and `web/icons/`. If you keep that manifest, copy the `icons` entries from `site.webmanifest` into it. Do not add a second manifest. You can also delete Flutter's default `web/favicon.png` and its `<link>` tag.

## Colours

Coral `#F08A6C`, butter `#F6CF63`, periwinkle `#9DB0EF`, ink `#2F3456`, paper `#F7F3EA`.

## Font licence note

The nyk Ngayogyan Jejeg file says "© Aprinugroho 2018–2020. All Rights Reserved" and contains no licence text. Its embedding setting has no restrictions. Using a glyph as a logo is a different use from showing text in the app. Confirm logo use with the author (the font lists http://ꦤꦪꦏ.id) before you treat this as a permanent brand mark.
