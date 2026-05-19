# Francesco Martolini .art
## Guida completa al sito — v5.0

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
- Frecce in basso
- Ultima pagina: freccia sinistra / swipe destra → torna all'inizio

---

### STRUTTURA PAGINE MOBILE (ordine del libro)

```
01  Home — titolo
02  Capitolo 0 — Introduzione (titolo)
03  Introduzione (testo)
04  Capitolo 01 — Progetti
05  Progetto 1
06  Taccuino
07  Progetto 2
08  Taccuino
...
    Capitolo 02 — Studi
    Studi (sequenze)
    Taccuino
...
    Chi sono
    Fotografie commerciali (pagina unica con scroll)
    fin.
```

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
    "immagine_copertina": "images/progetti/nome-progetto/cover.jpg",
    "galleria": [
      "images/progetti/nome-progetto/01.jpg",
      "images/progetti/nome-progetto/02.jpg"
    ],
    "link_esterno": "",
    "mappa": null
  }
]
```

**link_esterno:** se vuoto `""` il bottone non appare. Se presente appare "Vedi online ↗".

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

Le collaborazioni appaiono in una pagina unica con scroll verticale nel mobile e in una griglia nell'overlay desktop.

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

`foto` può essere `null` oppure un URL immagine (Cloudinary consigliato).

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

**Lightbox:** su desktop tutte le immagini di contenuto si aprono a schermo intero con click. Escluse le copertine card e le immagini di interfaccia.

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
| Studi / Intervalli | I |
| Chi sono | C |
| Fotografie commerciali | F |
| Introduzione | ∙ |
| Fine | · |

Il titolo del tab si aggiorna di conseguenza.
Su iPhone, aggiungendo il sito alla schermata home appare come una mini-app con icona nera e la *f.* italic.

---

### TEMA CHIARO / SCURO

Il bottone sole nell'header alterna tra tema chiaro e scuro.
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

Quattro pagine accessibili dal menu o dai link "Vedi tutti":

| Link | Contenuto |
|------|-----------|
| Vedi tutti → (Progetti) | Griglia tutti i progetti con copertina e descrizione |
| Vedi tutti → (Studi) | Griglia tutte le immagini degli intervalli |
| Scopri di più → (Chi sono) | Biografia estesa, foto, contatti |
| Vedi alcuni lavori → (Collaborazioni) | Griglia clienti con foto e anno |

---

### CONTATTI

Modifica in `js/libro.js` dentro la sezione HTML di chi sono:

```javascript
href="mailto:tua@email.com"
href="https://instagram.com/tuonome"
href="tel:+39XXXXXXXXXX"
```

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

---

### PERSONALIZZAZIONE RAPIDA

| Cosa | Dove |
|------|------|
| Titolo del libro | `index.html` → sezione `#home` mobile |
| Testo hero desktop | `index.html` → `.hero-sinistra` |
| Introduzione | `json/intro.json` |
| Frasi taccuino | Google Sheets oppure `json/taccuino.json` |
| Progetti | `json/progetti.json` |
| Studi | `json/intervalli.json` |
| Collaborazioni commerciali | `json/collaborazioni.json` |
| Colori | `css/stile.css` → `:root` |
| Font | `css/stile.css` → `@import` e `--font-*` |
| Contatti | `js/libro.js` → sezione chi sono |
| URL Google Sheets | `js/libro.js` → `const SHEETS_URL` |
| Testo cookie | `index.html` → `#cookie-banner` |
| Soglia cursore scuro/chiaro | `js/libro.js` → `isColorDark()` → valore `0.4` |

---

### AGGIUNGERE UN NUOVO PROGETTO — CHECKLIST

- [ ] Aggiungi l'oggetto in `json/progetti.json`
- [ ] Crea cartella `images/progetti/nome-progetto/`
- [ ] Carica `cover.jpg` e le foto della galleria
- [ ] Imposta `immagine_copertina` e array `galleria` con i percorsi corretti
- [ ] Se vuoi la mappa: ottieni URL Google My Maps o inserisci le coordinate
- [ ] Se vuoi il link esterno: aggiungi l'URL in `link_esterno`
- [ ] Fai commit e push

---

### NOTE TECNICHE

- Zero dipendenze esterne (solo Google Fonts)
- Dati gestiti interamente via JSON
- Taccuino aggiornabile da smartphone via Google Sheets
- Lazy loading su tutte le immagini tranne l'hero
- Cache HTML per overlay progetto e taccuino (apertura istantanea dalla seconda volta)
- Compatibile con tutti i browser moderni
- Accessibile: navigazione da tastiera completa (frecce, Escape)
- PWA-ready: manifest e apple-touch-icon configurati
