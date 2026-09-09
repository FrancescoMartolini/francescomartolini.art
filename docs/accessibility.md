# Accessibilità

## Cosa c'è

- **HTML semantico** di base: `header/nav/main/section/article/footer`, heading gerarchici nelle pagine.
- **Aria su modali**: lightbox, popup RSS e overlay libro hanno `role="dialog"` + `aria-modal`; label tradotte via `data-i18n-attr`. `aria-hidden` sui tre overlay principali (`overlay-pagina`, `pagina-progetto`, `pagina-taccuino-archivio`) è ora tenuto sincronizzato a runtime da `apriOverlayFocus()`/`chiudiOverlayFocus()` in `js/libro-routing.js`.
- **Tastiera**: frecce/Escape per lightbox, libro e overlay; le espansioni collaborazioni sono attivabili anche con Invio/Spazio (`tabindex`, `role="button"`, `aria-expanded`). Le voci del menu principale sono `<button>` veri (non più `<a>` senza `href`), quindi raggiungibili da Tab e annunciate come tali.
- **Focus in apertura/chiusura overlay**: `apriOverlayFocus()`/`chiudiOverlayFocus()` (`js/libro-routing.js`) spostano il focus dentro l'overlay all'apertura (di norma il bottone "chiudi/torna") e lo ripristinano su chi l'aveva aperto alla chiusura, con una pila per gli overlay annidati (es. un progetto aperto da dentro "tutti i progetti").
- **`aria-expanded`** sugli accordion delle collaborazioni (desktop e mobile).
- **`prefers-reduced-motion` e `forced-colors`** rispettati sul cursore custom (`css/stile.css` + `avviaCursore()` in `js/libro-interazioni.js`): chi ha impostato riduzione del movimento, o è in modalità a contrasto elevato, mantiene sempre il cursore di sistema — il custom non lo sostituisce più incondizionatamente su ogni dispositivo con puntatore preciso.
- **`alt` reali** su ritratto, foto del Taccuino (derivato dal testo della nota, `altTaccuino()` in `js/libro-nucleo.js`) e carosello Spotify; `creaImg()` non degrada più silenziosamente ad `alt=""` se qualcuno omette il parametro. Le foto di galleria dei progetti possono avere una didascalia propria opzionale (vedi [images.md](images.md#didascalie)) — di default resta il titolo del progetto, mai vuoto.
- Contrasto: palette scura/chiara con grigi dedicati al testo (`--grigio-testo`) — generalmente adeguata sui corpi testo.
- **Cookie banner** con due azioni esplicite.

## Problemi noti

| Problema | Dove | Impatto |
|---|---|---|
| Nessun skip-link | `index.html` | — |
| `prefers-reduced-motion` non applicato alle transizioni di pagina/overlay (solo al cursore custom, vedi sopra) | `stile.css` | — |
| Swipe senza alternativa dichiarata per la navigazione rapida del libro (l'indicatore aiuta) | — | — |

## Suggerimenti a basso rischio

1. Blocco globale `@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; animation-duration: .01ms !important; } }` come rete di sicurezza per le transizioni non ancora coperte.
2. Skip-link iniziale (`<a href="#main">Vai al contenuto</a>`, visibile solo al focus).
3. Alternativa testuale/bottoni per il cambio pagina veloce del libro mobile, oltre allo swipe.