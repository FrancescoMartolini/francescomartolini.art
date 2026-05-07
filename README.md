# Francesco Martolini .art
## Guida completa al sito — v2.0

---

### STRUTTURA DEL PROGETTO

```
martolini/
│
├── index.html              ← pagina principale (il libro)
│
├── css/
│   └── stile.css           ← stile globale
│
├── js/
│   └── libro.js            ← motore del libro
│
├── json/
│   ├── taccuino.json       ← frasi taccuino (fallback locale)
│   ├── progetti.json       ← dati progetti fotografici
│   └── intervalli.json     ← dati sequenze intervalli
│
└── images/
    ├── progetti/
    │   ├── la-pelle-della-citta/
    │   │   ├── cover.jpg
    │   │   └── 01.jpg ... 05.jpg
    │   ├── anatomia-degli-alberi/
    │   │   ├── cover.jpg
    │   │   └── 01.jpg ... 04.jpg
    │   └── divina-commedia/
    │       ├── cover.jpg
    │       └── 01.jpg ... 03.jpg
    └── intervalli/
        ├── seq01-a.jpg ... seq01-c.jpg
        └── seq02-a.jpg ... seq02-c.jpg
```

---

### TACCUINO — GOOGLE SHEETS (fonte principale)

Il taccuino si aggiorna automaticamente da Google Sheets.
Ogni volta che apri il sito, legge il foglio e mostra le ultime frasi.

**Setup iniziale:**

1. Vai su sheets.google.com e crea un nuovo foglio
2. Nella prima riga metti esattamente:
   ```
   A1: testo    B1: data    C1: foto
   ```
3. Aggiungi le frasi nelle righe successive:
   ```
   A2: Il tempo non passa nelle immagini. Si deposita.
   B2: 2026-04-30
   C2: (lascia vuoto oppure metti un URL immagine)
   ```
4. File → Condividi → Pubblica sul web → formato CSV → Pubblica
5. Copia l'URL che ti dà
6. In `js/libro.js` sostituisci:
   ```javascript
   const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXX/pub?output=csv';
   ```
   con il tuo URL

**Da quel momento:** apri Sheets dal telefono, scrivi una riga, il sito si aggiorna.

**Fallback:** se Sheets non è raggiungibile (offline, URL sbagliato), il sito carica `json/taccuino.json` automaticamente.

**Aggiungere una foto al taccuino:**
Nel campo C della riga, metti l'URL dell'immagine (es. Cloudinary):
```
https://res.cloudinary.com/tuo-nome/image/upload/taccuino/foto.jpg
```

---

### TACCUINO — JSON LOCALE (fallback)

Il file `json/taccuino.json` ha la stessa struttura del foglio Google:

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

`foto` può essere `null` oppure un URL immagine.

---

### AGGIUNGERE UN PROGETTO

1. Apri `json/progetti.json`
2. Aggiungi un oggetto:

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
  "mappa": null,
  "pagina_libro": 9
}
```

**link_esterno:** se vuoto `""`, il bottone non appare. Se presente, appare "Vedi online ↗".

**mappa:** se `null`, non appare. Se presente, mostra Google Maps nella pagina del progetto:
```json
"mappa": {
  "lat": 41.9028,
  "lng": 12.4964,
  "zoom": 13,
  "label": "Roma — luoghi del progetto"
}
```

3. Crea la cartella `images/progetti/nome-progetto/`
4. Copia le immagini dentro

---

### IMMAGINI — FORMATO E DIMENSIONI

**Copertine:** JPG, 1200×800px (orizzontale) o 800×1200px (verticale)
**Galleria:** qualsiasi proporzione, il sito si adatta centrandole
**Peso:** sotto i 500KB per immagine (usa Cloudinary per ottimizzare automaticamente)
**Gap galleria:** 10px fisso tra ogni immagine

**Cloudinary — ottimizzazione automatica:**
Usa questo formato URL per avere WebP automatico e compressione ottimale:
```
https://res.cloudinary.com/tuo-nome/image/upload/w_1200,q_auto,f_auto/percorso/immagine.jpg
```

---

### PROTEZIONE IMMAGINI

Il sito implementa queste protezioni:
- Click destro sulle immagini bloccato
- Drag & drop delle immagini bloccato
- Ctrl+S e Ctrl+U bloccati
- Overlay trasparente sopra ogni immagine
- `pointer-events: none` su tutti i tag `<img>`
- `user-drag: none` e `-webkit-user-drag: none`

**Nota:** nessuna protezione è al 100% inviolabile lato client. Chi vuole davvero salvare un'immagine può farlo tramite DevTools. La protezione scoraggia l'utente casuale e riduce significativamente l'uso non autorizzato per stampa.

---

### COOKIE BANNER

Il banner appare automaticamente alla prima visita.
L'utente sceglie tra "Solo essenziali" e "Accetto".
La scelta viene salvata in `localStorage` e il banner non riappare.

Per personalizzare il testo del banner, modifica in `index.html`:
```html
<p class="cookie-testo">
  Questo sito non utilizza cookie di profilazione...
</p>
```

---

### FONT

- **Titoli progetti, capitoli, fin:** Playfair Display (serif)
- **Menu, date, testi, UI:** Inter (sans-serif)
- **Frasi taccuino:** Caveat Brush (handwriting)

---

### CONTATTI (pagina Chi sono)

Modifica i contatti in `js/libro.js`, cerca `paginaChiSono()`:

```javascript
// Email
href="mailto:tua@email.com"

// Instagram
href="https://instagram.com/tuonome"

// Telefono
href="tel:+39XXXXXXXXXX"
```

---

### NAVIGAZIONE

**Desktop:** frecce tastiera, scroll mouse, frecce a schermo, puntini laterali, menu in alto
**Mobile:** swipe sinistra/destra, frecce a schermo
**Ultima pagina:** freccia sinistra / swipe destra → torna all'inizio

---

### PUBBLICAZIONE

**Netlify (consigliata):**
1. netlify.com → account gratuito
2. Trascina la cartella `martolini/` nel browser
3. Online in 30 secondi

**GitHub Pages:**
1. Crea repository su GitHub
2. Carica tutti i file
3. Settings → Pages → main branch

**Hosting tradizionale:**
Carica via FTP nella root del tuo hosting.

---

### PERSONALIZZAZIONE RAPIDA

| Cosa | Dove |
|------|------|
| Titolo del libro | `js/libro.js` → `paginaTitolo()` |
| Frasi taccuino | Google Sheets oppure `json/taccuino.json` |
| Colori | `css/stile.css` → `:root` |
| Font | `css/stile.css` → `@import` e variabili `--font-*` |
| Contatti | `js/libro.js` → `paginaChiSono()` |
| URL Google Sheets | `js/libro.js` → `const SHEETS_URL` |
| Testo cookie | `index.html` → `#cookie-banner` |
