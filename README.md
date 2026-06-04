# Francesco Martolini .art
## Guida completa al sito — v6.0

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
│   ├── intro.json                ← testo introduzione
│   └── taccuino.json             ← frasi taccuino (fallback locale)
│
└── images/
    ├── favicon.svg               ← icona dinamica (generata da JS)
    ├── apple-touch-icon.svg      ← icona per schermata home iPhone
    ├── icon.jpg                  ← icona PWA
    ├── manifest.json             ← web app manifest
    ├── chi-sono-img.jpg          ← foto pagina chi sono
    └── progetti/
        └── nome-progetto/
            ├── cover.jpg
            └── 01.jpg ...
```

---

### DUE ESPERIENZE, UN SOLO SITO

Il sito si comporta in modo diverso in base al dispositivo:

**Desktop (> 768px):** layout editoriale con scroll verticale, sezioni distinte, griglia progetti, menu in alto, cursore custom adattivo.

**Mobile (≤ 768px):** libro a pagine orizzontali, swipe o tap per sfogliare, nessun header visibile, navigazione con frecce in basso.

---

### NAVIGAZIONE

**Desktop:**
- Scroll verticale tra le sezioni
- Menu in alto per saltare ai capitoli
- Overlay per progetti, studi, chi sono, collaborazioni, taccuino

**Mobile:**
- Swipe sinistra/destra per sfogliare
- Tap zona destra (> 65%) → pagina successiva
- Tap zona sinistra (< 35%) → pagina precedente
- Frecce in basso con contatore pagine (es. `03 / 24`)
- Ultima pagina: appare il bottone `← Inizio` al posto della freccia destra
- Tasto Escape chiude qualsiasi overlay aperto
- Frecce tastiera: ← → ↑ ↓ per navigare

---

### STRUTTURA PAGINE MOBILE (ordine del libro)

```
01  Home — titolo
02  Introduzione (titolo capitolo)     ← generata da JS se intro.json ha testo
03  Introduzione (testo con scroll)    ← generata da JS
04  Indice                             ← generato da JS, inserito dopo l'intro
05  Capitolo 01 — Progetti
06  Progetto 1
07  Taccuino
08  Progetto 2
09  Taccuino
...
    Progetto n (pubblicato: false) → appare come "In lavorazione" con card grigia
...
    Capitolo 02 — Studi
    Studi (sequenze intervalli)
    Taccuino
...
    Capitolo 03 — Chi sono (titolo)    ← solo mobile
    Chi sono (testo + contatti)
    Fotografie commerciali (titolo capitolo)
    Collaborazioni (pagina unica con scroll verticale)
    fin.
```

**Nota:** Le pagine di introduzione, indice e titoli capitolo sono generate dinamicamente da JS — non esistono nell'HTML statico.

---

### INDICE MOBILE

La seconda pagina del libro (dopo l'introduzione) è un indice interattivo generato automaticamente da JS.

Contiene:
- Voce **Introduzione** → salta alla pagina intro
- Una riga per ogni **progetto pubblicato** (con numero e anno) → apre direttamente l'overlay del progetto
- Voci fisse: **Studi**, **Chi sono**, **Taccuino** → salta alla sezione o apre il taccuino

L'indice si aggiorna automaticamente quando aggiungi o rimuovi progetti.

---

### JSON — STRUTTURA E CAMPI

#### `json/progetti.json`

Ogni progetto può usare due modalità di contenuto:

**Modalità semplice** (retrocompatibile):
```json
{
  "id": "nome-progetto",
  "titolo": "Nome del Progetto",
  "anno": "2025",
  "descrizione": "Breve descrizione (2-3 righe).",
  "testo_lungo": "Testo completo.\n\nUsa \\n\\n per i paragrafi.",
  "immagine_copertina": "images/progetti/nome-progetto/cover.jpg",
  "galleria": [
    "images/progetti/nome-progetto/01.jpg",
    "images/progetti/nome-progetto/02.jpg"
  ],
  "link_esterno": "",
  "mappa": null
}
```

**Modalità contenuto strutturato** (avanzata):
```json
{
  "id": "nome-progetto",
  "titolo": "Nome del Progetto",
  "anno": "2025",
  "descrizione": "Breve descrizione.",
  "immagine_copertina": "images/progetti/nome-progetto/cover.jpg",
  "galleria": [],
  "link_esterno": "",
  "mappa": {
    "url": "https://www.google.com/maps/d/embed?mid=XXXXXXXX",
    "label": "Luoghi del progetto"
  },
  "contenuto": [
    { "tipo": "testo",    "valore": "Paragrafo di testo." },
    { "tipo": "immagine", "valore": "images/progetti/nome-progetto/01.jpg" },
    { "tipo": "testo",    "valore": "Secondo paragrafo." },
    { "tipo": "mappa" },
    { "tipo": "galleria", "valore": ["img1.jpg", "img2.jpg"] },
    { "tipo": "separatore" }
  ]
}
```

Quando è presente il campo `contenuto`, il progetto usa quella struttura. Quando manca, usa `testo_lungo` + `galleria` come prima.

**Blocchi disponibili nel `contenuto`:**

| tipo | valore | descrizione |
|------|--------|-------------|
| `testo` | stringa | Paragrafo. Usa `\n` per andare a capo. |
| `immagine` | URL stringa | Singola immagine a larghezza piena. |
| `galleria` | array di URL | Gruppo di immagini affiancate, apribili in lightbox. |
| `mappa` | *(nessuno)* | Inserisce la mappa definita nel campo radice `mappa`. |
| `separatore` | *(nessuno)* | Linea divisoria. |

**Campo `pubblicato`:**

```json
"pubblicato": false
```

Se presente e `false`, il progetto appare come **"In lavorazione"** nella card mobile (con stile grigio) e nel desktop slider. Non è cliccabile. Compare nell'indice mobile solo se pubblicato.

È utile includere anche `testo_lungo_bozza` per tenere traccia del testo preparato ma non ancora mostrato:

```json
"testo_lungo_bozza": "Testo che verrà usato quando pubblichi il progetto."
```

**Campo `pagina_libro`:**

```json
"pagina_libro": 3
```

Campo informativo (non usato dal motore JS) per tenere traccia di quale pagina del libro corrisponde al progetto.

**link_esterno:** se vuoto `""` il bottone non appare. Se presente appare il bottone "Vedi online".

**mappa** — tre opzioni:

```json
// Nessuna mappa
"mappa": null

// Google My Maps (consigliato — puoi aggiungere punti personalizzati)
"mappa": {
  "url": "https://www.google.com/maps/d/embed?mid=XXXXXXXXXXXXXXXX",
  "label": "Luoghi del progetto"
}

// Coordinate classiche
"mappa": {
  "lat": 41.9028,
  "lng": 12.4964,
  "zoom": 13,
  "label": "Roma — luoghi del progetto"
}
```

Per ottenere l'URL di Google My Maps: My Maps → Condividi → Incorpora nella pagina → copia il valore `src` dell'iframe.

---

#### `json/intervalli.json`

```json
[
  {
    "id": "sequenza-01",
    "titolo": "Sequenza 01",
    "descrizione": "Breve descrizione.",
    "immagini": [
      "images/intervalli/seq01-a.jpg",
      "images/intervalli/seq01-b.jpg",
      "images/intervalli/seq01-c.jpg"
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
    "foto": "https://res.cloudinary.com/tuo-nome/image/upload/foto.jpg"
  }
]
```

Le collaborazioni appaiono:
- **Mobile:** pagina unica con scroll verticale, immagine in aspect-ratio 3/2, titolo in Playfair, anno sotto. Preceduta da una pagina titolo "Fotografie commerciali / Collaborazioni".
- **Desktop:** griglia nell'overlay "Vedi alcuni lavori →". Il link nel menu è attualmente commentato nell'HTML.

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

Se `testo` è presente, il motore genera automaticamente due pagine mobile: la pagina titolo capitolo e la pagina con il testo scorrevole. Se `testo` è vuoto, le pagine non vengono create.

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

`foto` può essere `null` oppure un URL immagine (Cloudinary consigliato). Le frasi vengono ordinate per data decrescente (più recenti prima).

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

**Archivio taccuino con ricerca:** aprendo il taccuino (desktop o mobile) appare una pagina con tutte le frasi e un campo di ricerca live. Filtra per testo, mostra il contatore dei risultati, focus automatico sull'input.

---

### IMMAGINI

**Formato:** JPG consigliato
**Copertine:** 1200×800px (orizzontale) o 800×1200px (verticale)
**Galleria:** qualsiasi proporzione, il sito si adatta
**Peso:** sotto i 500KB per immagine

**Cloudinary — ottimizzazione automatica:**
```
https://res.cloudinary.com/tuo-nome/image/upload/w_1200,q_auto,f_auto/percorso/immagine.jpg
```
Parametri: `w_` larghezza, `q_auto` qualità automatica, `f_auto` formato WebP automatico.

**Lightbox:** su desktop e mobile le immagini di contenuto si aprono a schermo intero con click/tap.

Il lightbox:
- Raccoglie automaticamente tutte le immagini del gruppo (galleria, studi, collaborazioni)
- Naviga avanti/indietro con frecce, swipe o tasti tastiera
- Mostra il contatore (es. `3 / 7`)
- Si chiude con il tasto Escape, click fuori dall'immagine, o il bottone ×
- Le card progetto (slider desktop e griglia "tutti i progetti") aprono il progetto, non il lightbox

---

### PROTEZIONE IMMAGINI

- Click destro bloccato
- Drag & drop bloccato
- Ctrl+S, Ctrl+U, Ctrl+P bloccati
- Overlay trasparente sopra ogni immagine
- `pointer-events: none` sulle img
- `-webkit-user-drag: none`
- Immagini mancanti gestite con grazia: se un `src` non carica, l'immagine viene rimossa e appare uno spazio vuoto con il testo alternativo

**Nota:** nessuna protezione lato client è inviolabile al 100%. La protezione scoraggia l'utente casuale.

---

### FAVICON DINAMICA

Il tab del browser mostra una lettera diversa per ogni sezione:

| Sezione | Lettera |
|---------|---------|
| Home | H |
| Indice | ≡ |
| Progetti | P |
| Taccuino | T |
| Studi / Intervalli | I |
| Chi sono | C |
| Fotografie commerciali | F |
| Introduzione | ∙ |
| Fine | · |
| Progetto singolo | Prima lettera del titolo |

Il titolo del tab si aggiorna di conseguenza con il formato `NomeSezione — Francesco Martolini .art`.
Su iPhone, aggiungendo il sito alla schermata home appare come una mini-app con icona (`icon.jpg`) e titolo "FM.art".

---

### TEMA CHIARO / SCURO

Il bottone sole nell'header alterna tra tema chiaro e scuro (attualmente commentato nell'HTML — decommentare per riattivare).
La scelta viene salvata in `localStorage` e ricordata alle visite successive.

---

### CURSORE CUSTOM (desktop)

Il cursore è un punto con anello che segue con inerzia. Cambia colore automaticamente in base allo sfondo reale dell'elemento sotto il cursore (risale il DOM fino a trovare un background non trasparente):
- Su sfondo chiaro → cursore scuro
- Su sfondo scuro → cursore chiaro (classe `cursore-invertito` sul body)

La soglia luminosità è configurabile in `js/libro.js` → funzione `isColorDark()` → valore `0.4`.

Il cursore è attivo solo su dispositivi con hover reale (`hover: hover`), quindi non appare su touch.

---

### COOKIE BANNER

Appare alla prima visita (con un ritardo di 1.4 secondi). L'utente sceglie tra "Solo essenziali" e "Ho capito".
La scelta viene salvata in `localStorage` e non riappare.
Posizionato sopra il footer, non copre la navigazione.

---

### FONT

- **Titoli, capitoli, taccuino, fin:** Playfair Display (serif)
- **Menu, date, testi, UI:** Inter (sans-serif)

---

### OROLOGIO LIVE

Data e ora scorrono in tempo reale in ogni pagina.
Su desktop è fisso in alto a destra (`#orologio-sticky`), scompare quando l'hero è visibile perché l'hero ha il proprio orologio nel margine destro.
Su mobile è centrato in cima ad ogni pagina.

---

### SLIDER PROGETTI (desktop)

Se ci sono più di 4 progetti, la griglia diventa uno slider con frecce sinistra/destra.
Con 4 o meno progetti le frecce non appaiono.
I progetti con `"pubblicato": false` appaiono nello slider con stile grigio e non sono cliccabili.

---

### PAGINE OVERLAY (desktop)

Quattro pagine accessibili dal menu o dai link "Vedi tutti":

| Link | Contenuto |
|------|-----------|
| Vedi tutti → (Progetti) | Griglia tutti i progetti con copertina e descrizione |
| Vedi tutti → (Studi / Intervalli) | Griglia tutte le immagini degli intervalli, caricamento progressivo a blocchi di 6 |
| Scopri di più → (Chi sono) | Biografia estesa, foto, contatti |
| Vedi alcuni lavori → (Collaborazioni) | Griglia clienti con foto e anno, caricamento progressivo a blocchi di 4 |

Le pagine overlay si aprono istantaneamente dalla seconda apertura grazie alla cache HTML in `_cacheProgetti` e `_cacheTaccuino`.

---

### CONTATTI

I contatti sono hardcodati direttamente nel codice in due punti:

**Pagina mobile "Chi sono"** — modifica in `index.html`:
```html
href="mailto:XXXXXXXXXX@XXXXXXXXXX"
href="https://instagram.com/XXXXXXXXXX"
href="tel:+39XXXXXXXXXX"
```

**Overlay desktop "Chi sono"** — modifica in `js/libro.js` → case `'chi-sono-pagina'`:
```javascript
href="mailto:XXXXXXXXXX@XXXXXXXXXX"
href="https://instagram.com/XXXXXXXXXX"
href="tel:+39XXXXXXXXXX"
```

**Attenzione:** i due blocchi contatti possono avere valori diversi. Aggiorna entrambi per coerenza.

---

### PUBBLICAZIONE

**GitHub Pages (attuale):**
Il sito è già pubblicato su GitHub Pages all'indirizzo:
`https://francescomartolini.github.io/francescomartolini.art/`

Per aggiornare: fai commit e push, GitHub Pages si aggiorna automaticamente.

**Netlify (alternativa, consigliata per domini custom):**
1. [netlify.com](https://netlify.com) → account gratuito
2. Connetti il repository GitHub
3. Ogni push aggiorna il sito automaticamente
4. Puoi collegare un dominio personalizzato gratuitamente
5. Il file `netlify.toml` è già presente nel repo

---

### PERSONALIZZAZIONE RAPIDA

| Cosa | Dove |
|------|------|
| Titolo del libro | `index.html` → sezione `#home` mobile |
| Testo hero desktop | `index.html` → `.hero-sinistra` |
| Sottotitolo hero desktop | `index.html` → `.hero-sottotitolo` |
| Introduzione | `json/intro.json` |
| Frasi taccuino | Google Sheets oppure `json/taccuino.json` |
| Progetti | `json/progetti.json` |
| Studi | `json/intervalli.json` |
| Collaborazioni commerciali | `json/collaborazioni.json` |
| Colori | `css/stile.css` → `:root` |
| Font | `css/stile.css` → `@import` e `--font-*` |
| Contatti mobile | `index.html` → `#chi-sono` |
| Contatti desktop overlay | `js/libro.js` → case `'chi-sono-pagina'` |
| URL Google Sheets | `js/libro.js` → `const SHEETS_URL` |
| Testo cookie | `index.html` → `#cookie-banner` |
| Soglia cursore scuro/chiaro | `js/libro.js` → `isColorDark()` → valore `0.4` |
| Riattivare bottone tema | `index.html` → decommentare `#tema-toggle` |
| Riattivare link Collaborazioni menu | `index.html` → decommentare `<li>Collaborazioni</li>` |

---

### AGGIUNGERE UN NUOVO PROGETTO — CHECKLIST

- [ ] Aggiungi l'oggetto in `json/progetti.json`
- [ ] Scegli la modalità: `testo_lungo` + `galleria` oppure `contenuto` (array di blocchi)
- [ ] Crea cartella `images/progetti/nome-progetto/` (se usi immagini locali)
- [ ] Carica `cover.jpg` e le foto della galleria
- [ ] Imposta `immagine_copertina` e percorsi immagini corretti
- [ ] Se vuoi la mappa: ottieni URL Google My Maps o inserisci le coordinate
- [ ] Se vuoi il link esterno: aggiungi l'URL in `link_esterno`
- [ ] Se il progetto è in lavorazione: aggiungi `"pubblicato": false`
- [ ] Facoltativamente: aggiungi `"testo_lungo_bozza"` per tenere traccia del testo preparato
- [ ] Facoltativamente: aggiungi `"pagina_libro"` per documentare la posizione nel libro
- [ ] Fai commit e push

---

### NOTE TECNICHE

- Zero dipendenze esterne (solo Google Fonts)
- Dati gestiti interamente via JSON
- Taccuino aggiornabile da smartphone via Google Sheets
- Lazy loading su tutte le immagini tranne l'hero
- Cache HTML per overlay progetto e taccuino (apertura istantanea dalla seconda volta)
- Caricamento progressivo a frame (`requestAnimationFrame`) per overlay con molte immagini (studi, collaborazioni)
- Immagini mancanti gestite con grazia (`onerror`)
- Compatibile con tutti i browser moderni
- Accessibile: navigazione da tastiera completa (frecce, Escape)
- PWA-ready: manifest, apple-touch-icon, theme-color e apple-mobile-web-app-capable configurati
- OG tags per condivisione sui social (`og:title`, `og:description`, `og:type`)
- `robots.txt` e `sitemap.xml` presenti
