# Struttura del progetto

```text
francescomartolini.art/
├── index.html                 ← unica pagina del sito (head critico: non toccare l'ordine degli script)
├── 404.html                   ← fallback URL profondi (deve restare "sostanzioso": vedi navigation.md)
├── robots.txt                 ← punta alla sitemap
├── sitemap.xml                ← generata a ogni build (presente nel repo come copia dell'ultima generazione)
├── service-worker.js          ← solo push notification, niente cache offline
├── wrangler.toml              ← fonte di verità del deploy Cloudflare
├── package.json               ← SOLO per la dipendenza webpush-webcrypto del Worker
├── .assetsignore              ← cosa NON pubblicare come asset statico
│
├── css/
│   ├── stile.css              ← stile globale: desktop + mobile + 5 layout progetto + componenti
│   ├── stile-i18n-addon.css   ← stili del toggle lingua IT/EN
│   └── stampa.css             ← foglio di stampa (media="print")
│
├── fonts/                     ← Francescomartolini-Regular (.otf sorgente, .woff2 usato dal sito)
│
├── images/                    ← SOLO asset di branding: manifest + script favicon
│   ├── manifest.json          ← PWA manifest
│   ├── favicon-generate.js    ← documentazione: le favicon sono generate dinamicamente da libro-dom-mobile.js
│   └── stile.css              ← ⚠️ copia orfana/legacy di stile.css: non referenziata, candidata alla rimozione
│
├── js/
│   ├── i18n.js                ← traduzione interfaccia (json/ui.json)
│   ├── libro-nucleo.js        ← IL MOTORE del sito, diviso in 6 file caricati in sequenza
│   ├── libro-dom-mobile.js       (stesso comportamento del vecchio libro.js unico, solo
│   ├── libro-dom-desktop.js       organizzato per responsabilità — nessun bundler, nessuno
│   ├── libro-routing.js           step di build aggiuntivo: sono <script> classici che
│   ├── libro-interazioni.js       condividono lo stesso scope globale. Vedi architecture.md)
│   ├── libro-app.js           ← orchestratore: init() + API window.*, va caricato per ultimo
│   ├── push.js                ← opt-in push lato client (in pausa: var ATTIVO = false)
│   └── rss-modal.js           ← popup "Feed RSS"
│
├── json/                      ← TUTTI I CONTENUTI (vedi content.md)
│   ├── progetti.json  ├── intervalli.json   ├── collaborazioni.json
│   ├── pubblicazioni.json  ├── intro.json   ├── epiloghi.json
│   ├── taccuino.json  ├── playlist.json     └── ui.json
│
├── scripts/                   ← tool di build e manutenzione (NON pubblicati, vedi .assetsignore)
│   ├── prepara-deploy.sh      ← pipeline unica: comando build di Cloudflare
│   ├── genera-route-statiche.py  ← pagine fisiche per URL profondi
│   ├── genera-sitemap.py      ← sitemap.xml da progetti.json
│   ├── genera-feed-rss.py     ← i 4 feed RSS
│   ├── serve-locale.py        ← server di sviluppo (localhost:8000)
│   ├── notifica-nuovi-contenuti.py ← diff JSON → POST /notify
│   ├── sincronizza-taccuino.py     ← import da Google Sheets (disattivato)
│   ├── genera-chiavi-vapid.mjs     ← chiavi VAPID (una tantum)
│   └── genera-caption-instagram.py ← tool caption
│
├── worker/                    ← Cloudflare Worker (NON pubblicato come asset)
│   ├── index.js               ← entry point: /subscribe /notify /telegram/webhook + fallback ASSETS
│   ├── telegram.js, telegram-core.js, telegram-projects.js, telegram-notes.js,
│   │   telegram-intervals.js, telegram-collaborations.js, telegram-publications.js,
│   │   telegram-drafts.js     ← moduli del bot Telegram
│   ├── push.js                ← logica push lato worker
│   └── guida-reset-bot-telegram.md
│
├── TEMPLATE/                  ← materiali di supporto, NON deployati (.assetsignore)
│   ├── taccuino_template.xlsx
│   └── Test_interfaccia_Descktop/   ← prototipi HTML di interfacce alternative
│
└── .github/workflows/
    ├── static.yml                 ← deploy GitHub Pages: DISATTIVATO
    ├── notifica-nuovi-contenuti.yml ← notifiche push: solo manuale (workflow_dispatch)
    └── sincronizza-taccuino.yml     ← sync Sheets: solo manuale
```

## Regole per cartella

| Cartella | Sì | No |
|---|---|---|
| `json/` | contenuti e testi UI | logica, HTML, URL di pagine del sito |
| `images/` | asset di branding leggeri (favicon, manifest, foto chi-sono) | fotografie dei contenuti (vanno su Cloudinary) |
| `scripts/` | tool eseguiti in build/manutenzione | codice che gira nel browser |
| `worker/` | codice del Worker | codice frontend |
| `TEMPLATE/` | bozze, prototipi, reference | niente che debba andare online |

## File critici (modificare con cautela)

| File | Perché |
|---|---|
| `index.html` (head) | `<base>` dinamico + redirect: ordine e sincronia sono essenziali |
| `js/libro-*.js` | contengono routing, cache HTML, generazione contenuti, DOM mobile/desktop, gesture — vedi architecture.md per la mappa dei 6 file e l'ordine di caricamento (fisso, non riordinabile) |
| `scripts/prepara-deploy.sh` | ordine degli step di build; minificazione distruttiva su copia |
| `wrangler.toml` | `name`, `[[routes]]`, KV: errori qui rompono il deploy o il dominio |
| `.assetsignore` | espone/non espone file al pubblico |
| `404.html` | il body "leggero" fa scattare la pagina errore di Chromium |

## Difformità rilevate tra README v8.0 e repo attuale

Documentate qui perché influenzano chi naviga il repo:

1. `worker/` ora è **modulare** (`telegram-*.js`): il README attribuiva tutta la logica a `worker/index.js`.
2. `scripts/genera-caption-instagram.py` non era nell'albero del README.
3. In `TEMPLATE/` non risultano più `Calligraphr-Template.pdf` né `INSPO_Layout_Progetti/` (citati dal README).
4. `package.json` si descrive ancora come supporto a "Cloudflare Pages /functions": l'hosting reale è un Worker.
5. `images/` contiene una copia orfana di `stile.css` non referenziata.
6. Il README dichiara il toggle tema commentato in `index.html`; nel markup attuale il bottone è presente (verificare `avviaTema()`).