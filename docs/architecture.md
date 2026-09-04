# Architettura

## Panoramica

Il sito è una **single page statica senza framework**. Un unico `index.html` contiene lo scheletro di entrambe le esperienze (mobile e desktop); `js/libro-*.js` (6 file, caricati in sequenza con `<script>` classici, nessun bundler) carica i dati JSON e costruisce dinamicamente la maggior parte del DOM.

### I 6 file di `libro-*.js`

Sono lo stesso motore di un tempo (`libro.js`), diviso solo per organizzazione — nessun cambio di comportamento, nessuna build step aggiunta. Vanno caricati in questo ordine esatto (già impostato in `index.html`), perché ognuno usa dati/funzioni definiti nel precedente tramite lo scope globale condiviso fra `<script>`:

1. **`libro-nucleo.js`** — stato globale (`stato`), helper puri (`$`, `crea`, `formatData`...), parsing CSV/JSON, `caricaDati()`, orologio. Non dipende da nessun altro file.
2. **`libro-dom-mobile.js`** — costruzione delle pagine del libro mobile (intro, indice, progetti, taccuino intercalato, intervalli...), idratazione lazy, indicatore di pagina, segnalibro.
3. **`libro-dom-desktop.js`** — costruzione dell'archivio desktop (hero, slider progetti, colonne taccuino), scroll reveal, orologio sticky.
4. **`libro-routing.js`** — apertura/chiusura degli overlay (progetto, taccuino, sezioni, archivio playlist), generazione del contenuto di un progetto, interpretazione dell'URL d'arrivo (`leggiRoute`), navigazione fra le pagine del libro (`navigaA`).
5. **`libro-interazioni.js`** — gesture (tastiera, touch, tap), lightbox, cursore custom, tema, cookie banner, embed Spotify.
6. **`libro-app.js`** — orchestratore: `init()` collega tutto e parte su `DOMContentLoaded`; espone su `window` le funzioni richiamate dagli `onclick` inline nei template. Va caricato per ultimo.

```text
                ┌────────────────────────────────────────────────────┐
                │                    BUILD (deploy)                  │
                │ scripts/prepara-deploy.sh                          │
                │  ├─ genera-sitemap.py      → sitemap.xml           │
                │  ├─ genera-feed-rss.py     → 4 feed RSS            │
                │  ├─ genera-route-statiche.py → /progetti/<id>/…    │
                │  └─ minificazione (sovrascrive su copia temp)      │
                └────────────────────────────────────────────────────┘
                                       ↓
┌─────────────┐   fetch    ┌──────────────────┐   DOM    ┌──────────────────┐
│  json/*.json │ ────────→ │  js/libro-*.js    │ ───────→ │  DUE UI          │
│  (contenuti) │           │  js/i18n.js       │          │  mobile: libro   │
└─────────────┘            │   (motore, 6 file)│          │  desktop: scroll │
                           └──────────────────┘          │  + overlay       │
                                    ↑                      └──────────────────┘
                          interazioni (swipe, click,
                          scroll reveal, lightbox)

                ┌────────────────────────────────────────────────────┐
                │            CLOUDFLARE WORKER (runtime)             │
                │ worker/index.js                                    │
                │  ├─ POST /subscribe        → KV PUSH_SUBS          │
                │  ├─ POST /notify           → webpush ai sottoscrittori │
                │  ├─ POST /telegram/webhook → bot Telegram (AI)     │
                │  └─ tutto il resto        → ASSETS statici         │
                └────────────────────────────────────────────────────┘
```

## Flusso runtime (frontend)

1. **Head critico** (`index.html`): script sincroni fissano il tag `<base>` (legacy GitHub Pages) e ripristinano l'URL dopo un eventuale redirect da `404.html` (`?redirect=`).
2. **`i18n.js`** carica `json/ui.json`, applica `data-i18n` / `data-i18n-html` / `data-i18n-attr` sull'HTML statico ed espone `window.i18nReady`, `getCurrentLang()`, `t_ui()`.
3. **`libro-nucleo.js` → `caricaDati()`** carica in parallelo `progetti`, `intervalli`, `collaborazioni`, `intro`, `pubblicazioni`, `epiloghi`, `playlist` e poi `taccuino` (ordinato per data desc).
4. **Costruzione DOM**: `popolaDesktop()` (`libro-dom-desktop.js`: hero, slider progetti, colonne taccuino, griglie) e `costruisciMobile()` (`libro-dom-mobile.js`: pagine del libro — intro, indice, progetti, taccuino intercalato, intervalli, commercial, pubblicazioni, fin).
5. **Routing** (`libro-routing.js`): `leggiRoute()` interpreta l'URL d'arrivo; se corrisponde a un progetto/sezione/taccuino, la pagina viene aperta subito e l'URL riportato alla radice (`history.replaceState`).
6. **Interazioni** (`libro-interazioni.js`): overlay (`apriPagina`, `apriProgetto`, `apriTaccuino`), sfoglio mobile, lightbox, scroll reveal (IntersectionObserver), cursore custom, favicon dinamica per sezione (`data-favicon`).
7. **`libro-app.js` → `init()`** orchestra i punti 3-6 all'avvio (`DOMContentLoaded`).

## Dati

- Fonte di verità: i file in `json/` (schema in [content.md](content.md)).
- Nessun CMS, nessun database lato client. `localStorage` conserva solo: lingua (`lang`) e segnalibro (`libro-pagina`).
- I contenuti bilingue sono oggetti `{it, en}` risolti dalla funzione `t()` con fallback su IT.

## Generazione a build

Il frontend non ha build step; la build Cloudflare (comando `bash scripts/prepara-deploy.sh`) genera artefatti che vengono serviti staticamente:

| Artefatto | Generatore | Note |
|---|---|---|
| `sitemap.xml` | `scripts/genera-sitemap.py` | legge `json/progetti.json`; costante `DOMINIO` nello script |
| `feed.xml`, `progetti/feedrss.xml`, `taccuino/feedrss.xml`, `istanze/feedrss.xml` | `scripts/genera-feed-rss.py` | vedi [rss.md](rss.md) |
| `progetti/<id>/index.html`, `chi-sono/`, `fotografie-commerciali/`, `intervalli/`, `taccuino/`, `playlist/` | `scripts/genera-route-statiche.py` | copie di `index.html` per gli URL profondi |
| `js/libro-*.js` (6 file), `css/stile.css` minificati | minificatore (ultimi comandi dello script, uno per file) | sovrascrittura su checkout temporaneo |

I contenuti delle immagini **non** sono nel repo: vivono su Cloudinary (vedi [images.md](images.md)).

## Dipendenze

| Dipendenza | Dove | A cosa serve |
|---|---|---|
| Google Fonts (Playfair Display, Inter) | `<head>` di `index.html` | tipografia |
| Font locale `Francescomartolini-Regular.woff2` | `css/stile.css` `@font-face` | scrittura del Taccuino |
| Spotify iFrame API | caricata dinamicamente da `libro-interazioni.js` solo se c'è un blocco spotify | embed playlist |
| `webpush-webcrypto` | `package.json` → usata dal Worker | firme Web Push |
| Cloudflare KV `PUSH_SUBS` | `wrangler.toml` | iscrizioni push + stato conversazione bot |
| Cloudflare Workers AI | binding `[ai]` in `wrangler.toml` | caption Instagram generate dal bot |

Il frontend **non ha dipendenze npm**: è un vincolo di progetto, non aggiungere librerie al sito.

## Cache e stato

- `_cacheProgetti[id]` / `_cacheTaccuino`: HTML già costruito, per riaperture istantanee.
- Service Worker (`service-worker.js`): **solo** notifiche push, nessuna cache offline (scelta editoriale: il libro deve restare aggiornato).
- Cloudflare: cache edge standard sugli asset statici (nessuna configurazione custom nel repo).