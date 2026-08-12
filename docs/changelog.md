# Changelog

> Le date dei traguardi storici non sono ricostruibili dal repository (storico git non disponibile in questa analisi). L'ordine relativo è dedotto da commenti nel codice e dal README v8.0.

## Traguardi storici (ricostruiti)

- **Nascita su GitHub Pages**: sito sotto `francescomartolini.github.io/francescomartolini.art/`; routing degli URL profondi basato solo sul redirect da `404.html`.
- **URL parlanti v2**: pagine statiche reali generate a build (superamento del limite Chromium sui 404 leggeri); `404.html` resta come rete di sicurezza.
- **Migrazione a Cloudflare Worker**: hosting su `worker/index.js` + asset statici; deploy manuale; GitHub Pages disattivato.
- **Taccuino**: da Google Sheets (sync notturna) a `json/taccuino.json` via bot Telegram; integrazione Sheets disattivata ma conservata.
- **Bot Telegram**: da generatore di caption a gestione contenuti con commit diretti su GitHub; architettura modulare (`telegram-*.js`).
- **Internazionalizzazione IT/EN**: `i18n.js` + `ui.json` + contenuti bilingue.
- **Sistema layout progetto**: 5 layout (`editorial`, `magazine`, `column`, `archivio`, `panoramico`) + temi colore per progetto.
- **Collana PLAYLIST**: archivio dedicato, card sintetica, blocco acquisto e navigazione volumi.
- **Feed RSS**: 4 feed statici + popup.
- **Notifiche push**: infrastruttura completata, poi messa in pausa.
- **Foglio di stampa**: `css/stampa.css` ("stampare il capitolo aperto").

## Template per le voci future

```markdown
## YYYY-MM-DD — <titolo breve>
- Cosa è cambiato (funzionalità/contenuti/infrastruttura).
- File toccati principali.
- Note di deploy/migrazione, se necessarie.
```