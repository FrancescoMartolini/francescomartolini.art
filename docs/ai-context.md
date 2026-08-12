# AI Context — mappa del progetto per coding agent

> Leggi questo file PRIMA di modificare qualsiasi cosa. Poi, se serve, i file collegati.

## Cos'è questo progetto

`francescomartolini.art` è il portfolio di un fotografo, concepito come **libro digitale** sul tema del tempo. Non è una webapp: il ritmo è deliberatamente lento e silenzioso. Le scelte tecniche ed editoriali vanno in questa direzione (niente autoplay, niente suoni, niente cache offline, protezione delle immagini).

## Modello mentale in 5 punti

1. **Un solo `index.html`**, due esperienze: mobile = libro a pagine (swipe), desktop = scroll editoriale con overlay. Lo switch è puramente CSS al breakpoint di 768px; `js/libro.js` costruisce il DOM per entrambe.
2. **Tutti i contenuti vivono in `json/`** e vengono caricati a runtime con `fetch`. Il sito non ha build step per il frontend: HTML/CSS/JS sono serviti come sono (minificati solo al deploy, su copia temporanea).
3. **`js/libro.js` è il motore** (~migliaia di righe, vanilla JS, identificatori in italiano). `js/i18n.js` gestisce solo i testi di interfaccia (IT/EN).
4. **Gli URL profondi esistono ma sono "silenziosi"**: pagine statiche reali generate a build (`/progetti/<id>/`, `/chi-sono/`, …) + fallback `404.html`. Durante la navigazione la barra degli indirizzi resta sempre sulla radice (`history.replaceState`).
5. **L'hosting è un Cloudflare Worker** (`worker/index.js` + `wrangler.toml`) che serve gli asset statici e gestisce `/subscribe`, `/notify`, `/telegram/webhook`. Deploy manuale con `npx wrangler deploy`. La build Cloudflare esegue `bash scripts/prepara-deploy.sh` (sitemap, feed RSS, pagine statiche, minificazione).

## File principali

| File | Ruolo | Delicatezza |
|---|---|---|
| `index.html` | Unica pagina; head critico (`<base>` dinamico + redirect) | 🔴 Alta |
| `js/libro.js` | Motore: dati, DOM, overlay, routing, mobile book | 🔴 Alta |
| `js/i18n.js` + `json/ui.json` | Traduzione interfaccia IT/EN | 🟡 Media |
| `css/stile.css` | Tutto lo stile (desktop+mobile+5 layout progetto) | 🟡 Media |
| `css/stampa.css` | Resa in stampa del "capitolo aperto" | 🟢 Bassa |
| `json/progetti.json` | Dati progetti (schema in [projects.md](projects.md)) | 🟢 Bassa (dati) |
| `scripts/prepara-deploy.sh` | Pipeline di build | 🔴 Alta |
| `wrangler.toml` | Fonte di verità del deploy | 🔴 Alta |
| `.assetsignore` | Cosa NON viene pubblicato come asset | 🔴 Alta |
| `worker/index.js` + `worker/telegram-*.js` | Worker: route API + bot Telegram | 🟡 Media |
| `404.html` | Fallback URL profondi | 🔴 Alta (vedi sotto) |

## DA NON ROMPERE

- **Head di `index.html`**: i due script iniziali (tag `<base>` via `document.write` e ripristino URL da `?redirect=`) girano in ordine preciso prima di tutto il resto. Non spostarli, non renderli async.
- **`404.html` deve avere contenuto visibile nel body**: Chromium sostituisce i 404 "leggeri" con la propria pagina di errore ignorando lo script di redirect. Il testo visibile serve anche da padding.
- **`.assetsignore`**: se `worker/`, `scripts/`, `.github/`, `TEMPLATE/` finissero negli asset pubblici, sorgenti e configurazioni diventerebbero scaricabili dal sito.
- **`wrangler.toml` → `name`** deve coincidere col progetto Cloudflare esistente; il blocco `[[routes]]` col dominio custom va mantenuto, altrimenti a ogni deploy il Worker torna su `*.workers.dev`.
- **`prepara-deploy.sh` minifica sovrascrivendo i sorgenti**: è sicuro SOLO perché la build Cloudflare gira su un checkout temporaneo. Non eseguirlo mai nella working copy locale.
- **Prefissi riservati in `progetti.json`**: ogni `id` che inizia con `playlist` (case-insensitive) è trattato come collana PLAYLIST, non come progetto. I volumi devono essere `PLAYLIST.<numero>`. L'id sintetico `__playlist__` è riservato alla card della collana.
- **`pubblicato: false`** è l'unico modo per nascondere un progetto: non rimuovere voci per "metterle in pausa".
- **Ordine degli script in fondo a `index.html`**: `i18n.js` prima di `libro.js` (libro.js attende `window.i18nReady`).

## Comportamenti delicati

- **Routing silenzioso**: `leggiRoute()` è l'unica fonte di verità (progetti, `/taccuino`, `/taccuino/<id>`, sezioni in `SEZIONI_URL`). All'avvio apre la pagina richiesta e poi riporta l'URL alla radice. Non creare history entries durante la navigazione: è una scelta precisa (il tasto indietro esce dal sito, non chiude gli overlay).
- **Cache HTML**: `_cacheProgetti` e `_cacheTaccuino` memorizzano l'HTML generato. Se cambi la logica di generazione, la cache va invalidata o il cambiamento non si vede sulle riaperture.
- **Tema per progetto**: `--pr-bg/--pr-text/--pr-accent` sono iniettati inline da `apriProgetto()` (solo desktop) e rimossi in `chiudiProgetto()`. `css/stampa.css` li forza a nero/bianco con `!important` — non dichiarare mai `!important` nello style inline del JS.
- **Layout `archivio`**: le immagini nel flusso testo sono *nascoste* (`height:0`) e funzionano solo da marker (`data-archivio-img`) per l'immagine sticky. Non "ripararle".
- **Spotify**: l'iFrame API è caricata dinamicamente solo se serve (`caricaSpotifyIframeAPI()`). Gli ad-blocker possono bloccarla: non è un bug del sito.
- **Epiloghi**: `json/epiloghi.json` viene caricato ma la frase "fin." attualmente è fissa (`FRASE_FIN` in `libro.js`); la scelta casuale è commentata.
- **Tema chiaro/scuro**: markup e stili esistono, ma lo stato effettivo di `avviaTema()` va verificato nel codice (il README v8.0 lo diceva disattivato, il markup attuale mostra il bottone).

## Convenzioni rapide

- Identificatori e commenti **in italiano** (`apriPagina`, `stato`, `creaImg`…). Mantieni lo stile.
- Campi JSON in italiano (`titolo`, `anno`, `descrizione`…). `id` in kebab-case.
- Testi traducibili: oggetto `{ "it": "...", "en": "..." }` con fallback automatico su IT.
- Interfaccia → chiavi `json/ui.json` + attributi `data-i18n*`; contenuti → `t()` in `libro.js`.
- Immagini dei contenuti su **Cloudinary** (mai nel repo); trasformazioni `w_600` / `w_1400`, `q_auto,f_auto`.
- File generati (feed, pagine statiche) **non si committano**.

## Checklist prima di consegnare una modifica

1. Testata sia ≤768px (libro) sia desktop (overlay)?
2. Testata con lingua EN?
3. Se tocchi i JSON: validati (virgolette, virgole)?
4. Se tocchi `index.html`/`libro.js`: verificato il flusso URL diretto `/progetti/<id>` → apertura → URL che torna pulito?
5. Se aggiungi una sezione con URL: aggiornati `SEZIONI_URL`, `genera-route-statiche.py`, `genera-sitemap.py`?
6. Niente dipendenze npm aggiunte al frontend (vincolo di progetto)?