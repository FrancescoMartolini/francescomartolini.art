# Tipografia

## Famiglie

| Uso | Font | Caricamento | Variabile CSS |
|---|---|---|---|
| Titoli, capitoli, quote, "fin." | Playfair Display (400/500 + italic) | Google Fonts in `index.html` `<head>` | `--font-titolo` (fallback Georgia, serif) |
| Menu, testi, UI, label | Inter (300/400/500) | Google Fonts in `index.html` `<head>` | `--font-testo` (fallback system-ui) |
| Taccuino e note calligrafiche | Francescomartolini-Regular (font personale) | `@font-face` in `css/stile.css` da `fonts/Francescomartolini-Regular.woff2`, `font-display: swap` | `--font-taccuino` (fallback cursive) |

- Il `.otf` in `fonts/` è il sorgente; il sito usa solo il `.woff2`.
- Il font calligrafico è generato con Calligraphr (il template citato dal README non risulta più in `TEMPLATE/`).
- `Caveat Brush` viene ancora caricato dal link Google Fonts ma non è più usato dal CSS (`--font-taccuino` punta a `Custom_Font`): candidato alla rimozione per risparmiare peso (vedi [performance.md](performance.md)).
- Il layout `magazine` usa `Courier New` (monospace di sistema) come scelta stilistica.

## Dove si regola cosa

| Cosa | Dove |
|---|---|
| Palette e famiglie (variabili) | `css/stile.css` → `:root` |
| Caricamento Google Fonts | `index.html` → `<head>` (`preconnect` inclusi) |
| Dimensioni titoli | classi in `stile.css`: pattern ricorrente `clamp()` (es. hero `clamp(40px, 5.5vw, 76px)`) |
| Label maiuscole (capitoli, sezioni) | `.capitolo-label`, `.section-label` — `9–11px`, `letter-spacing .15–.3em`, uppercase |
| Resa in stampa | `css/stampa.css` (corpo 11pt, vedove/orfane, link espansi) |

## Convenzioni visive

- Gerarchia editoriale: label piccole maiuscole → titolo Playfair → corpo Inter 300 con `line-height` 1.7–2.1.
- Citazioni: Playfair italic, spesso con `«` decorativo (layout editorial).
- Numeri di pagina/orologio: `font-variant-numeric: tabular-nums`.