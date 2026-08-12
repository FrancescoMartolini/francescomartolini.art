# Responsive — due esperienze

## Breakpoint principale: 768px

| | Mobile ≤768px | Desktop ≥769px |
|---|---|---|
| Concetto | libro a pagine da sfogliare | archivio editoriale a scroll |
| Altezza | `100dvh`, overflow del body bloccato | scroll normale |
| Header/footer | nascosti | header fisso + footer |
| Navigazione | swipe/tap/frecce/indicatore | scroll + menu + overlay |
| Contenuto progetti | card-pagina nel libro | overlay con layout dedicato |
| `layoutType` e `theme` dei progetti | ignorati (colonna singola, colori base) | applicati |
| Taccuino | pagine intercalate | sezione 3 colonne + archivio |

Lo switch è CSS (`@media (max-width: 768px)` in `stile.css`); `libro.js` usa `isMobile()` (`innerWidth <= 768`) per le decisioni runtime (es. applicazione tema).

## Comportamenti componenti

- **Layout progetto**: tutti i 5 layout collassano a colonna singola via media query dedicate in fondo a `stile.css` (es. `column-count: 1`, sticky archivio nascosta, gallerie 2 colonne, ratio XPan → 3:1).
- **Collaborazioni**: desktop = griglia con espansione inline a tutta larghezza; mobile = elenco verticale con striscia orizzontale scrollabile (freccette incluse).
- **Pubblicazioni**: desktop = colonna scrollabile in Chi sono; mobile = capitolo dedicato.
- **Lightbox**: frecce più grandi e image a tutto viewport su mobile.
- **Cookie banner**: colonna su mobile, riga su desktop.
- **PLAYLIST**: griglia volumi 4 colonne → 2 colonne sotto i 900px (unico breakpoint intermedio del sito, insieme a 480px per il popup RSS).

## Input

- `@media (hover: hover)` attiva il cursore custom e gli hover states; su touch non compare.
- Gesture e tap zones del libro sono gestite in `libro.js` (vedi [navigation.md](navigation.md)).
- L'indicatore laterale mobile supporta il trascinamento (`touch-action: none`, stato `scrub-attivo`).