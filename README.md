# Francesco Martolini .art
## Guida completa al sito — v5.2

---

### STRUTTURA DEL PROGETTO

```
francescomartolini.art/
│
├── index.html                    ← pagina principale
│
├── css/
│   └── stile.css                 ← stile globale (desktop + mobile)
│
├── js/
│   └── libro.js                  ← motore del sito
│
├── json/
│   ├── progetti.json             ← dati progetti fotografici
│   ├── intervalli.json           ← dati sequenze studi
│   ├── collaborazioni.json       ← dati fotografie commerciali
│   ├── pubblicazioni.json        ← dati pubblicazioni e press
│   ├── intro.json                ← testo introduzione
│   ├── epiloghi.json             ← frasi di chiusura (pagina "fin")
│   └── taccuino.json             ← frasi taccuino (fallback locale)
│
├── images/
│   ├── favicon.svg               ← icona dinamica (generata da JS)
│   ├── apple-touch-icon.svg      ← icona per schermata home iPhone
│   ├── manifest.json             ← web app manifest
│   ├── chi-sono-img.jpg          ← foto pagina chi sono
│   ├── favicon-generate.js       ← script di documentazione (non usato dal sito)
│   ├── stile.css                 ← copia di lavoro del CSS (non usata dal sito)
│   └── progetti/
│       └── nome-progetto/
│           ├── cover.jpg
│           └── 01.jpg ...
│
└── TEMPLATE/                     ← materiali di supporto (non deployati)
    ├── Calligraphr-Template.pdf  ← template font calligrafico
    ├── taccuino_template.xlsx    ← foglio Excel per strutturare il taccuino
    └── Test_interfaccia_Descktop/
        ├── fm_editorial_interface.html
        ├── spatial_map_wireframe.html
        └── temporal_timeline_desktop.html
```

---

### DUE ESPERIENZE, UN SOLO SITO

Il sito si comporta in modo diverso in base al dispositivo:

**Desktop (> 768px):** layout editoriale con scroll verticale, sezioni distinte, griglia progetti, menu in alto, overlay a pagina intera e cursore custom adattivo.

**Mobile (≤ 768px):** libro a pagine orizzontali, swipe o tap per sfogliare, nessun header visibile, navigazione con frecce in basso.

---

### NAVIGAZIONE

**Desktop:**
- Scroll verticale tra le sezioni
- Menu in alto per saltare ai capitoli
- Overlay per progetti, studi, chi sono, collaborazioni, taccuino
- Apertura overlay tramite chiamate dirette a `apriPagina()` in `libro.js`

**Mobile:**
- Swipe sinistra/destra per sfogliare
- Tap zona destra (> 65%) → pagina successiva
- Tap zona sinistra (< 35%) → pagina precedente
- Frecce in basso
- Ultima pagina: freccia sinistra / swipe destra → torna all'inizio

---

### STRUTTURA PAGINE MOBILE (ordine del libro)

```
01  Home — titolo
02  Capitolo 00 — Introduzione (titolo)
03  Introduzione (testo)
04  Indice — sommario cliccabile
05  Capitolo 01 — Progetti
06  Progetto 1
07  Taccuino
08  Progetto 2
09  Taccuino
...
    Capitolo 02 — Intervalli
    Intervalli (sequenze)
    Taccuino
...
    Capitolo 03 — Chi sono
    Chi sono
    Capitolo 04 — Commercial
    Fotografie commerciali (pagina con scroll)
    Capitolo 05 — Pubblicazioni
    Pubblicazioni (elenco con link)
    fin.
```

---

### INDICE MOBILE

Dopo l'introduzione appare una pagina indice generata dinamicamente che elenca:
- Introduzione
- Ogni progetto pubblicato (con numero e anno)
- Intervalli
- Chi sono
- Taccuino
- Pubblicazioni

Ogni voce è cliccabile e porta direttamente alla sezione corrispondente. I progetti aprono direttamente la pagina di dettaglio.

L'indice viene posizionato automaticamente dopo la pagina introduzione (o dopo home se l'introduzione è assente).

---

### JSON — STRUTTURA E CAMPI

#### `json/progetti.json`

```json
[
  {
    "id": "nome-progetto",
    "titolo": "Nome del Progetto",
    "anno": "2025",
    "descrizione": "Breve descrizione (2-3 righe).",
    "testo_lungo": "Testo completo.\n\nUsa \\n\\n per i paragrafi.",
    "immagine_copertina": "https://res.cloudinary.com/tuo-nome/image/upload/w_600,q_auto,f_auto/percorso/cover.jpg",
    "galleria": [
      "https://res.cloudinary.com/tuo-nome/image/upload/w_1400,q_auto,f_auto/percorso/01.jpg",
      "https://res.cloudinary.com/tuo-nome/image/upload/w_1400,q_auto,f_auto/percorso/02.jpg"
    ],
    "link_esterno": "",
    "label_link": "Vedi online",
    "mappa": null,
    "pubblicato": true
  }
]
```

**link_esterno:** se vuoto `""` il bottone non appare. Se presente appare il testo di `label_link`.

**label_link:** etichetta personalizzabile del bottone link esterno. Se assente usa `"Vedi online"` come default.

**pubblicato:** se `false`, il progetto appare come "In lavorazione" ma non è apribile, né da mobile né da desktop.

**mappa** — tre opzioni:

```json
"mappa": null

"mappa": {
  "url": "https://www.google.com/maps/d/embed?mid=XXXXXXXXXXXXXXXX",
  "label": "Luoghi del progetto"
}

"mappa": {
  "lat": 41.9028,
  "lng": 12.4964,
  "zoom": 13,
  "label": "Roma — luoghi del progetto"
}
```

Per ottenere l'URL di Google My Maps: My Maps → Condividi → Incorpora nella pagina → copia il valore `src` dell'iframe.

#### Campo `contenuto` (layout avanzato opzionale)

In alternativa a `testo_lungo` + `galleria`, puoi usare il campo `contenuto` per costruire il progetto a blocchi.

```json
"contenuto": [
  { "tipo": "testo",     "valore": "Testo del progetto.\n\nSecondo paragrafo." },
  { "tipo": "immagine",  "valore": "https://...01.jpg" },
  { "tipo": "galleria",  "valore": ["https://...02.jpg", "https://...03.jpg"] },
  { "tipo": "mappa" },
  { "tipo": "separatore" }
]
```

Tipi disponibili: `testo`, `immagine`, `galleria`, `mappa`, `separatore`.

Quando `contenuto` è presente viene usato come struttura principale. Il campo `galleria` (se presente) viene aggiunto in fondo come blocco extra.

---

#### `json/intervalli.json`

```json
[
  {
    "id": "sequenza-01",
    "titolo": "Sequenza 01",
    "descrizione": "Breve descrizione.",
    "immagini": [
      "https://res.cloudinary.com/tuo-nome/image/upload/w_1400,q_auto,f_auto/percorso/seq01-a.jpg",
      "https://res.cloudinary.com/tuo-nome/image/upload/w_1400,q_auto,f_auto/percorso/seq01-b.jpg"
    ]
  }
]
```

---

#### `json/collaborazioni.json`

```json
[
  {
    "id": "Cliente1",
    "titolo": "Nome Cliente",
    "anno": "2025",
    "foto": "https://res.cloudinary.com/tuo-nome/image/upload/w_600,q_auto,f_auto/percorso/foto.jpg"
  }
]
```

Le collaborazioni appaiono in una pagina con scroll verticale nel mobile e in una griglia nell'overlay desktop.

---

#### `json/pubblicazioni.json`

```json
[
  {
    "id": 1,
    "titolo": "Titolo pubblicazione o press",
    "anno": "2025",
    "link": "https://esempio.com/articolo",
    "immagine": ""
  }
]
```

**link:** URL all'articolo, video o pagina esterna. Appare come "Vedi →".

**immagine:** URL Cloudinary opzionale. Se vuoto `""`, la voce appare solo come testo.

Le pubblicazioni appaiono:
- **Mobile:** capitolo "Pubblicazioni" (Capitolo 04), con titolo, anno e link cliccabile
- **Desktop:** sezione "Pubblicazioni" nella colonna destra di Chi sono, visibile solo se ci sono dati

---

#### `json/intro.json`

```json
{
  "titolo": "Introduzione",
  "testo": "Il tuo testo introduttivo.\n\nUsa \\n\\n per i paragrafi.",
  "firma": "Francesco Martolini",
  "anno": "2026"
}
```

---

#### `json/epiloghi.json`

```json
[
  "Il tempo lascia tracce.",
  "Questo archivio rimane aperto.",
  "Ogni immagine conserva una domanda."
]
```

Array di stringhe — frasi brevi che appaiono nella pagina finale "fin", sia su mobile che su desktop.

La frase visualizzata è attualmente fissa in `js/libro.js` (funzione `inizializzaFin()`). Se `epiloghi.json` è assente o vuoto, il sito usa un array di fallback hardcoded in `libro.js`. Per abilitare la selezione casuale tra le frasi, decommenta la riga corrispondente in `inizializzaFin()`.

---

#### `json/taccuino.json` (fallback locale)

```json
[
  {
    "id": 1,
    "testo": "La tua frase qui.",
    "data": "2026-05-04",
    "foto": null
  }
]
```

`foto` può essere `null` oppure un URL Cloudinary ottimizzato:

```json
"foto": "https://res.cloudinary.com/tuo-nome/image/upload/w_600,q_auto,f_auto/percorso/taccuino.jpg"
```

---

### TACCUINO — GOOGLE SHEETS (fonte principale)

Il taccuino si aggiorna automaticamente da Google Sheets. Ogni volta che apri il sito legge il foglio e mostra le frasi più recenti.

**Setup:**

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un nuovo foglio
2. Prima riga esattamente:
   ```
   A1: testo    B1: data    C1: foto
   ```
3. Aggiungi le frasi nelle righe successive
4. File → Condividi → Pubblica sul web → CSV → Pubblica
5. Copia l'URL
6. In `js/libro.js` sostituisci:
   ```javascript
   const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXX/pub?output=csv';
   ```

**Fallback:** se Sheets non è raggiungibile, il sito carica `json/taccuino.json` automaticamente.

**Aggiornare dal telefono:** apri Google Sheets, aggiungi una riga, il sito si aggiorna al prossimo caricamento.

---

### LIGHTBOX

Le immagini di contenuto si aprono in un lightbox a schermo intero al click, sia su desktop che su mobile.

**Navigazione:**
- Frecce laterali ← → (cliccabili o touch)
- Swipe su mobile
- Tasti `ArrowLeft` / `ArrowRight`
- `Escape` o click fuori dall'immagine per chiudere
- Contatore "N / TOT" visibile quando le immagini sono più di una

**Contesti in cui il lightbox si apre:** gallerie di progetto, griglia intervalli, collaborazioni, foto taccuino, foto chi sono.

**Esclusi dal lightbox:** copertine card progetto (aprono il progetto), favicon e immagini di interfaccia.

---

### IMMAGINI

**Formato:** JPG consigliato
**Copertine:** 1200×800px (orizzontale) o 800×1200px (verticale)
**Galleria:** qualsiasi proporzione, il sito si adatta
**Peso sorgente consigliato:** sotto i 500KB se usi immagini locali

**Cloudinary — ottimizzazione automatica:**
```
https://res.cloudinary.com/tuo-nome/image/upload/w_1200,q_auto,f_auto/percorso/immagine.jpg
```

Parametri principali:
- `w_600` → card, anteprime, collaborazioni, pubblicazioni, immagini piccole
- `w_1400` → gallerie progetto, intervalli, immagini grandi
- `q_auto` → qualità automatica
- `f_auto` → formato automatico (WebP / AVIF quando disponibile)

**Regola pratica usata nel sito:**
- `immagine_copertina` → `w_600,q_auto,f_auto`
- `galleria` / `intervalli` → `w_1400,q_auto,f_auto`
- `collaborazioni` / `taccuino` / `pubblicazioni` → `w_600,q_auto,f_auto`

---

### OTTIMIZZAZIONI PERFORMANCE

- **Preconnect font** in `index.html` verso `fonts.googleapis.com` e `fonts.gstatic.com`
- **Caricamento font in HTML** invece di `@import` nel CSS
- **Lazy loading** su tutte le immagini generate dinamicamente, tranne l'hero
- **`decoding="async"`** sulle immagini non prioritarie
- **Cloudinary con trasformazioni attive** nei JSON (`w_`, `q_auto`, `f_auto`)
- **Hero prioritaria** lasciata fuori dal lazy loading
- **Cache HTML** per overlay progetto e taccuino (apertura istantanea dalla seconda volta)
- **Inserimento a blocchi** con `requestAnimationFrame` per overlay studi e collaborazioni (6 elementi per frame)

---

### PROTEZIONE IMMAGINI

- Click destro bloccato
- Drag & drop bloccato
- Ctrl+S, Ctrl+U, Ctrl+P bloccati
- Overlay trasparente sopra ogni immagine
- `pointer-events: none` sulle img
- `-webkit-user-drag: none`

**Nota:** nessuna protezione lato client è inviolabile al 100%. La protezione scoraggia l'utente casuale.

---

### FAVICON DINAMICA

Il tab del browser mostra una lettera diversa per ogni sezione:

| Sezione | Lettera |
|---------|---------|
| Home | H |
| Progetti | P |
| Taccuino | T |
| Intervalli | I |
| Chi sono | C |
| Commercial | F |
| Pubblicazioni | P |
| Indice | ≡ |
| Introduzione | ∙ |
| Fine | · |

Il titolo del tab si aggiorna di conseguenza.
Su iPhone, aggiungendo il sito alla schermata home appare come una mini-app con icona nera e la *f.* italic.

---

### TEMA CHIARO / SCURO

Il bottone sole nell'header è attualmente **disabilitato** (commentato in `index.html`). Il codice è presente in `js/libro.js` nella funzione `avviaTema()` e può essere riattivato decommentando il bottone `#tema-toggle` nell'header.

La scelta viene salvata in `localStorage` e ricordata alle visite successive.
La sezione Progetti inverte i colori automaticamente in entrambi i temi.

---

### CURSORE CUSTOM (desktop)

Il cursore è un punto nero con anello. Cambia colore automaticamente in base allo sfondo:
- Su sfondo chiaro → cursore nero
- Su sfondo scuro → cursore bianco

---

### COOKIE BANNER

Appare alla prima visita. L'utente sceglie tra "Solo essenziali" e "Ho capito".
La scelta viene salvata in `localStorage` e non riappare.
Posizionato sopra il footer, non copre la navigazione.

---

### FONT

- **Titoli, capitoli, taccuino, fin:** Playfair Display (serif)
- **Menu, date, testi, UI:** Inter (sans-serif)
- **Accenti scritti / note visive:** Caveat Brush

I font vengono caricati direttamente in `index.html` con `preconnect`, non tramite `@import` nel CSS.

---

### OROLOGIO LIVE

Data e ora scorrono in tempo reale in ogni pagina.
Su desktop è fisso in alto a destra (sticky), scompare quando l'hero è visibile perché l'hero ha il proprio orologio nel margine.
Su mobile è centrato in cima ad ogni pagina.

---

### SLIDER PROGETTI (desktop)

Se ci sono più di 4 progetti, la griglia diventa uno slider con frecce sinistra/destra.
Con 4 o meno progetti le frecce non appaiono.

---

### PAGINE OVERLAY (desktop)

| Link | Metodo | Contenuto |
|------|--------|-----------|
| Vedi tutti → (Progetti) | `apriPagina('tutti-progetti')` | Griglia tutti i progetti con copertina e descrizione |
| Vedi tutti → (Intervalli) | `apriPagina('tutti-studi')` | Griglia tutte le immagini degli intervalli |
| Scopri di più → (Chi sono) | `apriPagina('chi-sono-pagina')` | Biografia estesa, foto, contatti |
| Vedi alcuni lavori → (Collaborazioni) | `apriPagina('collaborazioni-pagina')` | Griglia clienti con foto e anno |
| Leggi tutti → (Taccuino) | `apriTaccuino()` | Archivio completo con barra di ricerca |

I progetti con `pubblicato: false` compaiono nella griglia ma non aprono la pagina dettaglio.

---

### CONTATTI

Modificabili in due posti da tenere allineati:

1. `index.html` → sezione `#chi-sono` (versione mobile)
2. `js/libro.js` → funzione `apriPagina('chi-sono-pagina')` (versione desktop overlay)

```html
href="mailto:XXXXXXXXXX@XXXXXXXXXX"
href="https://instagram.com/XXXXXXXXXX"
href="tel:+39XXXXXXXXXX"
```

---

### PUBBLICAZIONE

**GitHub Pages (attuale):**
Il sito è pubblicato su GitHub Pages all'indirizzo:
`https://francescomartolini.github.io/francescomartolini.art/`

Per aggiornare: fai commit e push, GitHub Pages si aggiorna automaticamente.

**Netlify (alternativa, consigliata per domini custom):**
1. [netlify.com](https://netlify.com) → account gratuito
2. Connetti il repository GitHub
3. Ogni push aggiorna il sito automaticamente
4. Puoi collegare un dominio personalizzato gratuitamente

---

### PERSONALIZZAZIONE RAPIDA

| Cosa | Dove |
|------|------|
| Titolo del libro | `index.html` → sezione `#home` mobile |
| Testo hero desktop | `index.html` → `.hero-sinistra` |
| Introduzione | `json/intro.json` |
| Frasi taccuino | Google Sheets oppure `json/taccuino.json` |
| Frasi pagina "fin" | `json/epiloghi.json` (o array `EPILOGHI` in `libro.js`) |
| Progetti | `json/progetti.json` |
| Intervalli | `json/intervalli.json` |
| Collaborazioni commerciali | `json/collaborazioni.json` |
| Pubblicazioni e press | `json/pubblicazioni.json` |
| Colori | `css/stile.css` → `:root` |
| Font | `index.html` → `<head>` (`preconnect` + `<link href=...fonts...>`) |
| Contatti | `index.html` → `#chi-sono` + `js/libro.js` → `apriPagina('chi-sono-pagina')` |
| URL Google Sheets | `js/libro.js` → `const SHEETS_URL` |
| Testo cookie | `index.html` → `#cookie-banner` |
| Soglia cursore scuro/chiaro | `js/libro.js` → `isColorDark()` → valore `0.4` |
| Bottone tema chiaro/scuro | `index.html` → commenta/decommenta `#tema-toggle` nell'header |

---

### AGGIUNGERE UN NUOVO PROGETTO — CHECKLIST

- [ ] Aggiungi l'oggetto in `json/progetti.json`
- [ ] Se il progetto non è pronto, imposta `"pubblicato": false`
- [ ] Applica le trasformazioni Cloudinary: `w_600` alla copertina, `w_1400` alla galleria
- [ ] Crea la cartella `images/progetti/nome-progetto/` solo se usi immagini locali
- [ ] Imposta `immagine_copertina` e array `galleria` con i percorsi corretti
- [ ] Se vuoi il layout avanzato, usa `contenuto` con i tipi: `testo`, `immagine`, `galleria`, `mappa`, `separatore`
- [ ] Se vuoi la mappa: URL Google My Maps o coordinate lat/lng
- [ ] Se vuoi il link esterno: compila `link_esterno` e `label_link`
- [ ] Fai commit e push

---

### AGGIUNGERE UNA PUBBLICAZIONE — CHECKLIST

- [ ] Aggiungi l'oggetto in `json/pubblicazioni.json` con `id`, `titolo`, `anno`, `link`
- [ ] Se hai un'immagine, inserisci l'URL Cloudinary in `immagine`; altrimenti lascia `""`
- [ ] La voce appare automaticamente nel mobile (Capitolo Pubblicazioni) e nel desktop (sezione Chi sono)
- [ ] Fai commit e push

---

### MATERIALI DI SUPPORTO (cartella TEMPLATE/)

La cartella `TEMPLATE/` contiene file di lavoro non deployati sul sito:

| File | Descrizione |
|------|-------------|
| `Calligraphr-Template.pdf` | Template per creare font calligrafici personalizzati su Calligraphr |
| `taccuino_template.xlsx` | Foglio Excel per strutturare e preparare le frasi del taccuino |
| `Test_interfaccia_Descktop/fm_editorial_interface.html` | Prototipo interfaccia editoriale desktop |
| `Test_interfaccia_Descktop/spatial_map_wireframe.html` | Prototipo wireframe con mappa spaziale |
| `Test_interfaccia_Descktop/temporal_timeline_desktop.html` | Prototipo timeline temporale desktop |

Questi file non influenzano il sito in produzione.

---

### NOTE TECNICHE

- Zero dipendenze esterne oltre a Google Fonts
- Dati gestiti interamente via JSON
- Taccuino aggiornabile da smartphone via Google Sheets
- Lazy loading su tutte le immagini tranne l'hero
- Cache HTML per overlay progetto e taccuino (apertura istantanea dalla seconda volta)
- Inserimento a blocchi con `requestAnimationFrame` per overlay studi e collaborazioni
- Lightbox con navigazione frecce, swipe e tastiera
- Indice mobile generato dinamicamente con navigazione diretta alle sezioni
- Compatibile con tutti i browser moderni
- Accessibile: navigazione da tastiera completa (frecce, Escape)
- PWA-ready: manifest e apple-touch-icon configurati
- Accesso ai progetti controllato dal flag `pubblicato` in modo coerente tra mobile, slider desktop, overlay e apertura diretta
