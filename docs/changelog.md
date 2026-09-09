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

## 2026-08-14 — Intro cinematografica della Home
- Video a schermo intero (due varianti Cloudinary, landscape/portrait scelte dal viewport) che precede l'apertura della Home, con dissolvenza verso il frontespizio esistente. Una sola volta per sessione, saltata su link profondi, `prefers-reduced-motion`, autoplay bloccato o video non disponibile.
- File toccati: `index.html`, `css/stile.css`, `css/stampa.css`, `js/libro.js` (guardie navigazione libro mobile), `json/ui.json`.
- File aggiunti: `js/intro-video.js`, `docs/intro-video.md`.
- Da fare prima del deploy: incollare i due URL Cloudinary in `js/intro-video.js` (vedi [intro-video.md](intro-video.md)).

## 2026-09-09 — Accessibilità (menu, focus overlay, cursore) e SEO (hreflang, og:image, JSON-LD, alt)
- Voci del menu principale: da `<a onclick>` senza `href` a `<button>` veri, raggiungibili da tastiera.
- Focus gestito all'apertura/chiusura dei tre overlay principali (`overlay-pagina`, `pagina-progetto`, `pagina-taccuino-archivio`): si sposta dentro l'overlay all'apertura e torna su chi l'aveva aperto alla chiusura, con `aria-hidden` sincronizzato; pila per gli overlay annidati.
- Cursore custom disattivato (torna quello di sistema) con `prefers-reduced-motion: reduce` o `forced-colors: active`, sia in CSS che nel JS che lo genera.
- `hreflang`/canonical per lingua: `?lang=it`/`?lang=en` come varianti dichiarate, con `x-default`; iniettati e aggiornati da `js/i18n.js`.
- `og:image`/`og:url`/`twitter:card` statici in `index.html` (mancavano del tutto) + aggiornamento dinamico per progetto/nota Taccuino via `js/i18n.js`. Nota: l'anteprima social per-progetto **reale** (quella che vedono i crawler senza JS) era già coperta da `scripts/genera-route-statiche.py`, esistente da prima — non introdotta qui, solo scoperta e documentata in [seo.md](seo.md) dopo essere passata inosservata.
- JSON-LD: `Person`+`WebSite` statici, `CreativeWork` dinamico per progetto/nota.
- `alt` reali ovunque risultava vuoto o assente (ritratto, foto Taccuino, carosello Spotify, fallback di `creaImg()`); nuovo schema opzionale `{src, alt}` per didascalie per-foto nelle gallerie progetto (`normalizzaImg()` in `js/libro-nucleo.js`), retrocompatibile con i semplici URL già in `progetti.json`.
- File toccati: `index.html`, `css/stile.css`, `js/i18n.js`, `js/libro-nucleo.js`, `js/libro-routing.js`, `js/libro-dom-mobile.js`, `js/libro-dom-desktop.js`, `js/libro-interazioni.js`.
- Documentazione aggiornata: [accessibility.md](accessibility.md), [seo.md](seo.md) (corretta anche una nota non più valida sulle anteprime social), [images.md](images.md), [projects.md](projects.md), [quick-reference.md](quick-reference.md).
- Non fatto in questo giro (resta in [accessibility.md](accessibility.md) come apertura): skip-link, `prefers-reduced-motion` sulle transizioni di pagina/overlay, alternativa allo swipe per il libro mobile; didascalie reali delle foto esistenti (lo schema è pronto, il testo va scritto da chi conosce ogni scatto).

## Template per le voci future

```markdown
## YYYY-MM-DD — <titolo breve>
- Cosa è cambiato (funzionalità/contenuti/infrastruttura).
- File toccati principali.
- Note di deploy/migrazione, se necessarie.
```