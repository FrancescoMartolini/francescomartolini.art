# Accessibilità

## Cosa c'è

- **HTML semantico** di base: `header/nav/main/section/article/footer`, heading gerarchici nelle pagine.
- **Aria su modali**: lightbox, popup RSS e overlay libro hanno `role="dialog"` + `aria-modal`; label tradotte via `data-i18n-attr`.
- **Tastiera**: frecce/Escape per lightbox, libro e overlay (logica in `libro.js`); le espansioni collaborazioni sono attivabili anche con Invio/Spazio (`tabindex`, `role="button"`, `aria-expanded`).
- **`aria-expanded`** sugli accordion delle collaborazioni (desktop e mobile).
- **`prefers-reduced-motion`** rispettato (per ora) sull'animazione della nota evidenziata.
- Contrasto: palette scura/chiara con grigi dedicati al testo (`--grigio-testo`) — generalmente adeguata sui corpi testo.
- **Cookie banner** con due azioni esplicite.

## Problemi noti

| Problema | Dove | Impatto |
|---|---|---|
| Voci menu e molte "link" sono `<a onclick>` **senza `href`** | `index.html` | non raggiungibili da Tab, non annunciate come link |
| `cursor: none !important` su tutti gli elementi (desktop hover) | `stile.css` | il cursore custom non segue focus/ingranditori |
| `alt` spesso generici (titolo progetto, "Studio N") | `libro.js` (`creaImg`, generazioni HTML) | screen reader poco informativi |
| Focus non gestito all'apertura/chiusura degli overlay | `libro.js` | focus può restare sulla pagina sotto |
| Nessun skip-link | `index.html` | — |
| `prefers-reduced-motion` non applicato a transizioni di pagina/overlay | `stile.css` | — |
| Swipe senza alternativa dichiarata per la navigazione rapida del libro (l'indicatore aiuta) | — | — |

## Suggerimenti a basso rischio

1. Aggiungere `href="#"`/`role="button"`+`tabindex` coerenti sulle voci menu, oppure trasformarle in `<button>`.
2. `focus()` sul primo elemento/chiudi all'apertura degli overlay; ripristino del focus alla chiusura.
3. `alt` = titolo + anno per le copertine; descrizioni brevi nei blocchi immagine quando possibile.
4. Blocco globale `@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; animation-duration: .01ms !important; } }` come rete di sicurezza.