# Francesco Martolini .art
## Guida completa al sito — v7.2

---

### CONCETTO

Il sito non è un portfolio fotografico tradizionale.

È concepito come un **libro digitale** che raccoglie progetti fotografici di lunga durata, note, riflessioni e ricerca visiva attorno a un tema comune: il **tempo**.

L'identità del sito ruota attorno a questa dichiarazione:

> *Il tempo lascia tracce. Io le cerco.*

Ogni progetto è un capitolo di una ricerca più ampia. Il visitatore non naviga tra progetti: entra in un archivio personale e in uno spazio narrativo.

---

### STRUTTURA DEL PROGETTO

```
francescomartolini.art/
│
├── index.html                    ← pagina principale
├── 404.html                      ← rete di sicurezza per URL non noti (vedi sezione URL)
├── sitemap.xml                   ← generata automaticamente (vedi sezione Sitemap)
├── robots.txt                    ← punta alla sitemap
├── .gitignore                    ← esclude le pagine generate da scripts/genera-route-statiche.py
├── scripts/
│   ├── serve-locale.py           ← server per testare in locale (vedi sezione URL)
│   ├── genera-route-statiche.py  ← genera le pagine reali dei progetti/sezioni (vedi sezione URL)
│   └── genera-sitemap.py         ← genera sitemap.xml da json/progetti.json
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
├── fonts/
│   └── Francescomartolini-Regular.otf   ← font calligrafico personale (taccuino)
│
├── images/
│   ├── favicon.svg
│   ├── apple-touch-icon.svg
│   ├── manifest.json
│   ├── chi-sono-img.jpg
│   └── progetti/
│       └── nome-progetto/
│           ├── cover.jpg
│           └── 01.jpg ...
│
└── TEMPLATE/                     ← materiali di supporto (non deployati)
    ├── Calligraphr-Template.pdf
    ├── taccuino_template.xlsx
    ├── INSPO_Layout_Progetti/    ← screenshot di riferimento per i layout
    └── Test_interfaccia_Descktop/
```

---

### DUE ESPERIENZE, UN SOLO SITO

**Mobile (≤ 768px):** libro a pagine orizzontali. Swipe o tap per sfogliare. Nessun header visibile. Navigazione con frecce in basso. L'esperienza è quella di leggere un libro fotografico, non di navigare un sito.

**Desktop (> 768px):** archivio editoriale. Scroll verticale. Menu in alto. Overlay a pagina intera per i progetti. Il sistema di layout permette a ogni progetto di avere un'identità visiva propria.

---

### NAVIGAZIONE DESKTOP

- Scroll verticale tra le sezioni
- Menu in alto per saltare ai capitoli
- Overlay per progetti, studi, chi sono, collaborazioni, taccuino
- Apertura overlay tramite `apriPagina()` in `libro.js`

### NAVIGAZIONE MOBILE

- Swipe sinistra/destra per sfogliare
- Tap zona destra (> 65%) → pagina successiva
- Tap zona sinistra (< 35%) → pagina precedente
- Frecce in basso
- Bottone **"info utilizzo"** (prima pagina): istruzioni di lettura
- Indicatore laterale a puntini (destra schermo): trascinabile per scorrere rapidamente

---

### URL PARLANTI E CONDIVISIONE PROGETTI

**Come funziona (due livelli):**

1. **Pagine statiche reali** (il meccanismo principale): a ogni pubblicazione, `scripts/genera-route-statiche.py` crea una cartella fisica per ogni progetto pubblicato e per le 4 sezioni con URL dedicato — es. `progetti/PLAYLIST.00/index.html`, `chi-sono/index.html` — ognuna una copia di `index.html`. Il server risponde quindi **200 OK**, un file reale: nessun trucco, nessuna dipendenza da JavaScript o dal comportamento del browser per l'apertura.
2. **`404.html`** resta come rete di sicurezza per URL non noti (link vecchi, errori di battitura): rimanda alla home preservando l'eventuale sottopercorso.

**Perché non bastava il solo `404.html`:** la prima versione si basava solo sul redirect 404→JS. Funziona nella maggior parte dei casi, ma alcuni browser Chromium (Edge, Chrome) **sostituiscono le risposte 404 "leggere" con una loro pagina di errore generica**, ignorando completamente lo script di redirect — indipendentemente da cosa ci sia scritto dentro. Le pagine statiche reali evitano il problema alla radice: non c'è mai una risposta 404 da intercettare.

L'unica differenza visibile: aprendo un link senza slash finale (es. `/progetti/alberi`) il server fa un redirect automatico verso `/progetti/alberi/` (con slash) prima di rispondere 200 — invisibile e istantaneo, comportamento standard di qualsiasi hosting statico.

Oltre ai progetti, hanno un URL dedicato e condivisibile anche **Chi Sono**, **Fotografie Commerciali**, **Intervalli** e **Taccuino** — le pagine con un contenuto autonomo. Restano senza URL proprio l'indice "tutti i progetti" (ridondante con la home) e la nota "come funziona" (supporto, non una pagina a sé).

```
francescomartolini.art/progetti/<id>
francescomartolini.art/chi-sono
francescomartolini.art/fotografie-commerciali
francescomartolini.art/intervalli
francescomartolini.art/taccuino
```

dove `<id>` è lo slug già presente in `json/progetti.json` (campo `id`). Le altre corrispondenze sono nella mappa `SEZIONI_URL` in `js/libro.js`.

**Importante — l'URL non cambia mai visibilmente durante la navigazione:**

- Cliccando dentro il sito (progetti, Chi Sono, Intervalli, Taccuino, sfoglio delle pagine su mobile) la barra degli indirizzi **resta sempre sul dominio base** — non mostra mai `/progetti/...` o simili mentre l'utente naviga.
- Un link diretto tipo `francescomartolini.art/progetti/alberi` funziona comunque: all'avvio il sito rileva l'URL con cui si è arrivati, apre subito quella pagina, poi riporta silenziosamente la barra alla radice (`history.replaceState`, vedi fondo di `init()` in `js/libro.js`) — l'utente vede la pagina giusta, ma l'URL torna pulito.
- Non essendoci più voci di history create dal sito, il tasto "indietro" del browser non chiude più le pagine aperte (si esce direttamente dal sito, verso la pagina precedente nella cronologia del browser) — invariato rispetto a prima di introdurre gli URL parlanti.

**Perché c'è `404.html`:** GitHub Pages è hosting statico, non gestisce redirect lato server. `404.html` intercetta l'accesso diretto a un percorso tipo `/progetti/alberi` (che altrimenti darebbe 404) e rimanda a `index.html`, che ripristina l'URL corretto tramite `history.replaceState` prima che la pagina sia visibile. Se in futuro si cambia hosting (es. Netlify, Vercel), questo file **non serve più**: basta un redirect `/* → /index.html` nella configurazione del nuovo host.

**Sottopercorso GitHub Pages (Project Page):** finché non è collegato il dominio personalizzato `francescomartolini.art`, il sito vive su GitHub Pages sotto `francescomartolini.github.io/francescomartolini.art/` — cioè con un prefisso nel percorso, non alla radice del dominio. `BASE_PATH` (in `js/libro.js`, calcolato all'avvio guardando `location.hostname`/`location.pathname`) e il tag `<base>` generato dinamicamente in cima a `index.html` gestiscono questo automaticamente, sia per gli URL dei progetti sia per i percorsi relativi di CSS/JS/immagini/JSON. Se in futuro si collega il dominio personalizzato, il prefisso sparisce da solo, senza bisogno di modificare il codice.

**Limite noto — anteprime nei messaggi:** quando un link viene condiviso su WhatsApp/iMessage/Telegram, l'anteprima (immagine, titolo) è generata dai tag `<meta og:...>` statici in `index.html`, sempre gli stessi per tutto il sito. Il link si apre correttamente sul progetto giusto, ma l'anteprima mostrerà titolo/immagine generici del sito, non quelli del progetto specifico. Per anteprime per-progetto servirebbe pre-rendering lato server — non presente al momento.

#### Testare gli URL dei progetti in locale

Aprire `index.html` con doppio click (`file://`) **non funziona**: i `fetch()` dei file JSON vengono bloccati dal browser su quel protocollo. Serve un server HTTP locale — e per provare i link diretti servono anche le pagine statiche generate:

```bash
python3 scripts/genera-route-statiche.py
python3 scripts/serve-locale.py
```

Script da inserire nel builder di Cloudeflare
```bash
python3 scripts/genera-sitemap.py && python3 scripts/genera-feed-rss.py && python3 scripts/genera-route-statiche.py
```

(`scripts/serve-locale.py` include comunque il fallback su `404.html` per eventuali URL non generati — utile per provare anche quel meccanismo di riserva)

poi:

- `http://localhost:8000/` → la home
- `http://localhost:8000/progetti/PLAYLIST.00` (o qualsiasi altro id) aperto direttamente → deve caricare subito quel progetto, con lo stile corretto, e la barra degli indirizzi deve tornare a mostrare solo `http://localhost:8000/` (nessun percorso visibile)
- stessa cosa per `/chi-sono`, `/fotografie-commerciali`, `/intervalli`, `/taccuino`

Nota: in locale il sito gira alla radice (`localhost:8000/`), quindi `BASE_PATH` risulta vuoto — corrisponde allo scenario "dominio personalizzato collegato", non all'attuale sottopercorso di github.io. Il comportamento generale (apertura diretta, `indietro`, sfoglio pagine senza toccare l'URL) si verifica comunque correttamente.

#### Sitemap

`sitemap.xml` elenca solo le pagine con un URL reale: la home, Chi Sono, Fotografie Commerciali, Intervalli, Taccuino, e ogni progetto pubblicato (stesso criterio di `apriProgetto()`: escluso solo se `pubblicato: false`). L'indice "tutti i progetti" e la nota "come funziona" restano fuori — non hanno un URL proprio (vedi sezione precedente).

Dominio usato: `https://francescomartolini.art` (il dominio finale, anche se non ancora collegato via DNS/CNAME). Se cambia, va aggiornata la costante `DOMINIO` in `scripts/genera-sitemap.py`.

`sitemap.xml` **si rigenera da solo a ogni deploy** (vedi step "Genera sitemap.xml" in `.github/workflows/static.yml`), leggendo `json/progetti.json`: aggiungere o pubblicare un progetto non richiede nessun passaggio manuale in più. Per rigenerarla anche in locale (utile solo per controllarla, non serve prima di ogni push):

```bash
python3 scripts/genera-sitemap.py
```

`robots.txt` (in root) punta alla sitemap con la riga `Sitemap: https://francescomartolini.art/sitemap.xml`, così i motori di ricerca la trovano automaticamente.

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
...
    Capitolo 02 — Intervalli
    Capitolo 03 — Chi sono
    Capitolo 04 — Commercial
    Capitolo 05 — Pubblicazioni
    fin.
```

---

### JSON — STRUTTURA E CAMPI

#### `json/progetti.json` — schema base

```json
[
  {
    "id": "nome-progetto",
    "titolo": "Nome del Progetto",
    "anno": "2025",
    "descrizione": "Breve descrizione (2-3 righe).",
    "testo_lungo": "Testo completo.\n\nUsa \\n\\n per i paragrafi.",
    "immagine_copertina": "https://res.cloudinary.com/.../cover.jpg",
    "galleria": [
      "https://res.cloudinary.com/.../01.jpg",
      "https://res.cloudinary.com/.../02.jpg"
    ],
    "link_esterno": "",
    "label_link": "Vedi online",
    "mappa": null,
    "pubblicato": true
  }
]
```

**pubblicato:** se `false`, il progetto appare come "In lavorazione" ma non è apribile.

**link_esterno:** se vuoto `""` il bottone non appare.

**mappa** — tre opzioni:

```json
"mappa": null

"mappa": {
  "url": "https://www.google.com/maps/d/embed?mid=XXXXXXXX",
  "label": "Luoghi del progetto"
}

"mappa": {
  "lat": 43.7696,
  "lng": 11.2558,
  "zoom": 13,
  "label": "Firenze — luoghi del progetto"
}
```

---

#### Campo `contenuto` — sistema unico a blocchi

Ogni progetto costruisce il proprio contenuto interno con `contenuto`: un array di blocchi ordinati, mostrati nell'ordine in cui li scrivi. **È l'unico sistema usato dal sito** — vale per testo, immagini, mappe e anche per l'embed Spotify.

```json
"contenuto": [
  { "tipo": "titolo",    "valore": "Sottotitolo interno" },
  { "tipo": "testo",     "valore": "Testo.\n\nSecondo paragrafo." },
  { "tipo": "immagine",  "valore": "https://.../01.jpg" },
  { "tipo": "galleria",  "valore": ["https://.../02.jpg", "https://.../03.jpg"] },
  { "tipo": "mappa" },
  { "tipo": "separatore" },
  { "tipo": "spotify",   "valore": { "playlistId": "XXXXXXXXXXXXXXXXXXXX", "tracks": [] } }
]
```

Tipi disponibili: `titolo`, `testo`, `immagine`, `galleria`, `mappa`, `separatore`, `spotify`.

**I campi `valore` di tipo testo (`titolo`, `testo`) accettano sia una stringa semplice sia un oggetto bilingue** `{ "it": "...", "en": "..." }`.

Quando `contenuto` è presente viene usato come struttura principale al posto di `testo_lungo`. Il campo `galleria` di primo livello (se presente) viene aggiunto in fondo come blocco extra, dopo tutti i blocchi di `contenuto`.

**`mappa`**: il blocco `{ "tipo": "mappa" }` non contiene i dati della mappa — quelli vivono nel campo `mappa` di primo livello del progetto (vedi sopra, sezione `mappa`). Il blocco serve solo a dire *dove*, nell'ordine dei contenuti, la mappa deve apparire.

---

#### Blocco `spotify` — embed playlist + foto sincronizzata al brano in play

Usato nel progetto `PLAYLIST.01` e in generale ogni volta che si vuole collegare una playlist Spotify a un archivio fotografico: quando l'utente preme play su un brano, sopra il player appare in dissolvenza la foto associata a quel brano.

```json
{
  "tipo": "spotify",
  "valore": {
    "playlistId": "6LIiTKNwUXfBmKRSApj9GJ",
    "tracks": [
      { "uri": "spotify:track:4uLU6hMCjMI75M1A2tKUQC", "image": "https://res.cloudinary.com/.../01.jpg" },
      { "uri": "spotify:track:1301WleyT98MSxVHPZCA6M", "image": "https://res.cloudinary.com/.../02.jpg" }
    ]
  }
}
```

**`playlistId`** — l'ID della playlist Spotify (non l'URL intero). Si trova nel link di condivisione: `open.spotify.com/playlist/`**`6LIiTKNwUXfBmKRSApj9GJ`**`?si=...` → è la parte tra `/playlist/` e `?`.

**`tracks`** — un oggetto per ogni brano della playlist a cui vuoi associare una foto. Ogni traccia non elencata qui semplicemente non attiva nessuna foto quando viene suonata.

**⚠️ Come trovare l'`uri` corretto di un brano** (l'errore più comune):
Un URI Spotify valido è sempre nel formato `spotify:track:` seguito da **esattamente 22 caratteri alfanumerici** — es. `spotify:track:4uLU6hMCjMI75M1A2tKUQC`. Non va confuso con hash di altro tipo (es. i nomi file delle immagini su Cloudinary, che sono più lunghi).

Per copiarlo correttamente:
- **App Spotify (desktop/mobile):** tre puntini `...` sul brano (o tasto destro) → *Condividi* → tieni premuto `Alt` (Windows) / `Option` (Mac) mentre il menu è aperto → compare *"Copia URI Spotify"* → è già nel formato giusto, incollalo così com'è.
- **Web player:** tre puntini → *Condividi* → *Copia link brano* → ottieni un URL tipo `https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=...`. Prendi solo i 22 caratteri tra `/track/` e `?`, e scrivi `spotify:track:` davanti.

Il player viene creato con la [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api) ufficiale (script caricato dinamicamente in `js/libro.js` → `caricaSpotifyIframeAPI()` / `avviaSpotifySections()`), che espone l'evento `playback_update` con l'URI del brano attualmente in ascolto. Se un ad-blocker (uBlock, Brave Shields, ecc.) è attivo, può bloccare lo script e l'embed non carica: testare in incognito senza estensioni in caso di pagina vuota.

---

### LAYOUT PROGETTO (desktop)

Ogni progetto può avere un layout visivo diverso, selezionato tramite il campo `layoutType` in `progetti.json`. Se `layoutType` è assente, viene usato il layout base.

#### Selezione del layout

```json
{
  "id": "nome-progetto",
  "titolo": "...",
  "layoutType": "archivio",
  ...
}
```

#### Layout disponibili

| `layoutType` | Carattere visivo | Ispirazione |
|---|---|---|
| *(assente)* | Colonna singola centrata, lettura semplice — aspetto originale del sito | — |
| `editorial` | Grande spazio bianco, testo a colonna destra, immagini allineate a destra, quote centrata | Arch-Workman |
| `magazine` | Font typewriter (Courier New), immagini in scala di grigi parziale, testo frammentato e asimmetrico | Dora Lazarevic |
| `column` | Due colonne CSS, testo uppercase giustificato, quote enorme bold | Point62 |
| `archivio` | Due colonne 58/42: testo giustificato a sinistra, immagine sticky a destra che si aggiorna con lo scroll | Rivista letteraria |
| `panoramico` | Titolo enorme, testo alternato sinistra/destra, immagini con offset verticale, galleria in ratio XPan 65:24 | Formato Hasselblad XPan |

**Su mobile tutti i layout collassano automaticamente a colonna singola.** Il `layoutType` è una proprietà esclusivamente desktop.

---

### TEMA COLORI PER PROGETTO (desktop)

Ogni progetto può avere colori propri tramite il campo `theme`. Questi colori vengono applicati solo alla pagina di dettaglio del progetto quando è aperta su desktop.

```json
{
  "id": "nome-progetto",
  "titolo": "...",
  "layoutType": "archivio",
  "theme": {
    "background": "#f2ede6",
    "text": "#1a1a18",
    "accent": "#8a7a6a"
  }
}
```

I tre valori controllano:

| Proprietà CSS | Campo JSON | Effetto |
|---|---|---|
| `--pr-bg` | `background` | Sfondo dell'overlay progetto |
| `--pr-text` | `text` | Colore del testo principale |
| `--pr-accent` | `accent` | Anno, label, citazioni, bottoni secondari |

**Se `theme` è assente**, il progetto usa i colori base del sito (bianco, nero, grigio). Non è necessario definire `theme` per ogni progetto: funziona correttamente anche senza.

**Se `layoutType` è assente**, anche `theme` viene ignorato e la pagina usa l'aspetto originale.

#### Combinazioni tipiche

```json
// Progetto chiaro, toni caldi
"theme": {
  "background": "#f2ede6",
  "text": "#1a1a18",
  "accent": "#8a7a6a"
}

// Progetto scuro, toni freddi
"theme": {
  "background": "#0f0f0d",
  "text": "#f0ede8",
  "accent": "#c8b89a"
}

// Neutro, quasi base
"theme": {
  "background": "#fafaf8",
  "text": "#0a0a0a",
  "accent": "#999999"
}
```

**Nota:** su mobile il tema non viene applicato. L'esperienza mobile mantiene sempre i colori base del sito, indipendentemente da `theme`.

---

### AGGIUNGERE UN NUOVO PROGETTO — CHECKLIST

- [ ] Aggiungi l'oggetto in `json/progetti.json`
- [ ] Se il progetto non è pronto: `"pubblicato": false`
- [ ] Applica le trasformazioni Cloudinary: `w_600` alla copertina, `w_1400` alle immagini
- [ ] Costruisci il contenuto con `contenuto[]` (testo, immagini, mappa, spotify...)
- [ ] Se vuoi un layout specifico: aggiungi `"layoutType"` con uno dei valori disponibili
- [ ] Se vuoi colori propri: aggiungi `"theme"` con `background`, `text`, `accent`
- [ ] Se non vuoi personalizzare: ometti `layoutType` e `theme` — il layout base funziona perfettamente
- [ ] Se vuoi la mappa: compila `mappa` con URL o coordinate
- [ ] Se vuoi il link esterno: compila `link_esterno` e `label_link`
- [ ] Fai commit e push

---

### `json/intervalli.json`

```json
[
  {
    "id": "sequenza-01",
    "titolo": "Sequenza 01",
    "descrizione": "Breve descrizione.",
    "immagini": [
      "https://res.cloudinary.com/.../seq01-a.jpg",
      "https://res.cloudinary.com/.../seq01-b.jpg"
    ]
  }
]
```

---

### `json/collaborazioni.json`

```json
[
  {
    "id": "Cliente1",
    "titolo": "Nome Cliente",
    "anno": "2025",
    "foto": "https://res.cloudinary.com/.../cover.jpg",
    "galleria": []
  }
]
```

**galleria:** array opzionale di immagini extra oltre alla `foto` di copertina. Se presente:
- **su mobile**, il tap sulla copertina apre il lightbox con tutte le immagini della collaborazione;
- **su desktop**, il click sul nome cliente (o Invio/Spazio da tastiera) apre inline una striscia a tutta larghezza con le immagini della galleria — un solo pannello aperto alla volta nella griglia.

Se `galleria` è vuoto o assente, resta visibile solo la copertina e nessuna delle due interazioni è attiva.

---

### `json/pubblicazioni.json`

```json
[
  {
    "id": 1,
    "titolo": "Titolo pubblicazione",
    "anno": "2025",
    "link": "https://esempio.com/articolo",
    "immagine": ""
  }
]
```

---

### `json/intro.json`

```json
{
  "titolo": "Introduzione",
  "testo": "Il tuo testo introduttivo.\n\nUsa \\n\\n per i paragrafi.",
  "firma": "Francesco Martolini",
  "anno": "2026"
}
```

---

### `json/epiloghi.json`

```json
[
  "Il tempo lascia tracce.",
  "Questo archivio rimane aperto.",
  "Ogni immagine conserva una domanda."
]
```

Array di frasi brevi per la pagina finale "fin.".

---

### `json/taccuino.json` (fallback locale)

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

`foto` può essere `null` o un URL Cloudinary (`w_600,q_auto,f_auto`).

---

### TACCUINO — GOOGLE SHEETS (fonte principale)

Il taccuino si scrive su Google Sheets, ma **il sito non legge più il foglio in tempo reale
ad ogni visita** — solo `json/taccuino.json`, sincronizzato automaticamente. Questo perché il
CSV pubblicato di Google Sheets può essere molto lento "a freddo" (anche 30-60s+ se non viene
richiesto da un po'), e prima bloccava il rendering dell'intero sito fino alla risposta.

**Come funziona oggi:**

1. Scrivi una nuova voce nel foglio Google, come sempre.
2. `.github/workflows/sincronizza-taccuino.yml` gira ogni notte (06:00 UTC) — oppure a mano da
   **Actions → Sincronizza Taccuino da Google Sheets → Run workflow** se vuoi vederla subito —
   e lancia `scripts/sincronizza-taccuino.py`, che scarica i due fogli (IT/EN), li combina e
   riscrive `json/taccuino.json` **solo se qualcosa è cambiato**. Se ci sono modifiche, fa
   commit + push, il che a sua volta fa scattare il deploy normale (`static.yml`).
3. `js/libro.js` legge `json/taccuino.json` all'avvio. In più, prova comunque a chiamare anche
   il foglio live (`caricaDati()`), ma con un timeout di `SHEETS_TIMEOUT_MS` (3000ms di default):
   se Google non risponde in tempo, usa subito `json/taccuino.json` senza bloccare la pagina.
   Questo è solo un bonus per vedere una voce freschissima nello stesso giorno in cui viene
   scritta, prima che scatti la sync notturna — non è il meccanismo principale.

**Setup iniziale del foglio (se se ne crea uno nuovo):**

1. Crea un foglio con intestazioni: `testo` / `testo en` / `data` / `foto` / `video` / `camera`
   (le colonne si riconoscono per nome, non per posizione — vedi `TEMPLATE/taccuino_template.xlsx`)
2. File → Condividi → Pubblica sul web → CSV
3. In `js/libro.js` **e** in `scripts/sincronizza-taccuino.py` sostituisci:
   ```javascript
   const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/XXXXXXXX/pub?output=csv';
   ```
   (gli URL vanno tenuti identici nei due file — uno li usa per il tentativo live nel browser,
   l'altro per la sync notturna)

**Fallback finale:** se anche `json/taccuino.json` mancasse o fosse illeggibile, il taccuino
resta semplicemente vuoto — non blocca mai il resto del sito.

**Colonna `video`:** incolla un URL video Cloudinary (`.../video/upload/...`). Se una riga ha
sia `video` che `foto`, la foto diventa il poster (fotogramma di anteprima) del video; se manca,
il browser mostra il primo fotogramma. Se `video` è vuoto la riga si comporta come prima (solo
foto o solo testo). Nessun autoplay: il video parte solo se il visitatore lo avvia, per restare
coerente col ritmo silenzioso del libro.

---

### LIGHTBOX

Click su qualsiasi immagine di contenuto → lightbox a schermo intero.

- Frecce ← → o swipe su mobile
- Tasti `ArrowLeft` / `ArrowRight`
- `Escape` o click fuori per chiudere
- Contatore N / TOT se le immagini sono più di una

---

### IMMAGINI

**Cloudinary — trasformazioni consigliate:**

```
w_600,q_auto,f_auto   → copertine, anteprime, taccuino, collaborazioni
w_1400,q_auto,f_auto  → gallerie progetto, intervalli, immagini grandi
```

---

### VIDEO (Cloudinary)

Cloudinary gestisce i video con la stessa logica delle immagini: si carica il file, si prende
l'URL pubblico e lo si incolla nella colonna `video` del foglio Taccuino (vedi sopra). Da tenere
presente:

- L'URL video ha il prefisso `/video/upload/...` (non `/image/upload/...` come le foto).
- `f_auto,q_auto` funziona anche sui video: sceglie il formato migliore (mp4/webm) per il browser
  del visitatore.
- Per un fotogramma di anteprima automatico, basta cambiare l'estensione dell'URL video in `.jpg`
  — utile solo se si vuole un poster diverso da quello caricato manualmente nella colonna `foto`.
- Il piano gratuito Cloudinary ha limiti più stretti sui video (peso file, minuti di trasformazione
  al mese) rispetto alle immagini: se si caricano molti video in alta qualità conviene controllare
  i limiti del proprio piano prima.

---

### FONT

| Uso | Font |
|---|---|
| Titoli, capitoli, fin | Playfair Display |
| Menu, testi, UI | Inter |
| Taccuino | Francescomartolini-Regular (font calligrafico personale) |

Il font calligrafico è generato con Calligraphr dal template in `TEMPLATE/Calligraphr-Template.pdf`.

---

### FAVICON DINAMICA

Il tab del browser mostra una lettera diversa per ogni sezione.

| Sezione | Lettera |
|---|---|
| Home | H |
| Progetti | P |
| Taccuino | T |
| Intervalli | I |
| Chi sono | C |
| Commercial | F |
| Pubblicazioni | P |
| Indice | ≡ |
| Fine | · |

---

### TEMA CHIARO / SCURO

Il bottone sole nell'header è attualmente **disabilitato** (commentato in `index.html`). Il codice è presente in `js/libro.js` → `avviaTema()` e può essere riattivato decommentando `#tema-toggle`.

---

### CURSORE CUSTOM (desktop)

Punto nero con anello. Cambia colore automaticamente:
- Su sfondo chiaro → cursore nero
- Su sfondo scuro → cursore bianco

---

### OTTIMIZZAZIONI PERFORMANCE

- Preconnect font in `index.html`
- Lazy loading su tutte le immagini tranne l'hero
- Cache HTML per overlay progetto e taccuino (apertura istantanea dalla seconda volta)
- Inserimento a blocchi con `requestAnimationFrame` per studi e collaborazioni
- Timeout di 3s (`SHEETS_TIMEOUT_MS` in `js/libro.js`) sul tentativo di fetch live a Google
  Sheets, con fallback immediato a `json/taccuino.json` — il rendering non resta mai bloccato
  in attesa di Google (vedi sezione TACCUINO — GOOGLE SHEETS sopra per il meccanismo completo)

---

### PROTEZIONE IMMAGINI

- Click destro bloccato
- Drag & drop bloccato
- Ctrl+S, Ctrl+U, Ctrl+P bloccati
- `pointer-events: none` sulle immagini

---

### PERSONALIZZAZIONE RAPIDA

| Cosa | Dove |
|---|---|
| Titolo del libro | `index.html` → sezione `#home` mobile |
| Testo hero desktop | `index.html` → `.hero-sinistra` |
| Introduzione | `json/intro.json` |
| Frasi taccuino | Google Sheets oppure `json/taccuino.json` |
| Frasi pagina "fin" | `json/epiloghi.json` |
| Progetti | `json/progetti.json` |
| Layout progetto | `json/progetti.json` → campo `layoutType` |
| Tema colori progetto | `json/progetti.json` → campo `theme` |
| Playlist Spotify + foto sincronizzate | `json/progetti.json` → blocco `contenuto` di tipo `spotify` |
| Intervalli | `json/intervalli.json` |
| Collaborazioni commerciali | `json/collaborazioni.json` |
| Pubblicazioni e press | `json/pubblicazioni.json` |
| Colori globali | `css/stile.css` → `:root` |
| Font | `index.html` → `<head>` |
| Contatti | `index.html` → `#chi-sono` + `js/libro.js` → `apriPagina('chi-sono-pagina')` |
| URL Google Sheets | `js/libro.js` → `const SHEETS_URL` |
| URL diretto progetto (routing) | `js/libro.js` → `apriProgetto()` / `chiudiProgetto()` / `slugProgettoDaURL()` |

---

### PUBBLICAZIONE

Il sito è pubblicato su GitHub Pages. Ogni commit e push aggiorna automaticamente il sito.

`404.html` nella root è necessario per far funzionare gli URL diretti dei progetti (`/progetti/<id>`) su GitHub Pages — vedi sezione "URL PARLANTI E CONDIVISIONE PROGETTI". Se si migra a un host con redirect server-side (Netlify, Vercel...), `404.html` diventa superfluo.

Per un dominio personalizzato: connetti il repository a [Netlify](https://netlify.com) (gratuito).

---

### NOTIFICHE PUSH

Il sito è una PWA in grado di inviare una push notification quando esce
un nuovo progetto o una nuova voce del Taccuino — anche a sito chiuso.
Tutta l'infrastruttura vive dentro lo stesso progetto Cloudflare
collegato a questa repo, niente servizi terzi.

**Un punto importante sull'hosting:** il progetto Cloudflare collegato
a questa repo è un **Worker** (deploy con `wrangler deploy`), non una
"Pages" classica. Questo significa due cose:
- `wrangler.toml`, nella root, è la **fonte di verità** per il deploy:
  se manca o è incompleto, il build fallisce con l'errore *"Missing
  entry-point to Worker script or to assets directory"*.
- Non esiste una cartella `functions/` con auto-routing come nella
  vecchia Cloudflare Pages: tutta la logice extra (subscribe/notify)
  passa da un **unico Worker**, `worker/index.js`, che per il resto
  (tutte le pagine, css, immagini...) si limita a inoltrare la
  richiesta agli asset statici — il sito si comporta esattamente come
  prima, invariato.

**Come funziona, in breve:**

1. Chi visita il sito può attivare gli avvisi da un piccolo invito in
   fondo al libro mobile (pagina "fin.") — testo in `notifiche.*` in
   `json/ui.json`, logica in `js/push.js`. L'equivalente nel footer
   desktop esiste nel markup (`index.html`) ma è **commentato** al
   momento: sull'area di lavoro attuale l'opt-in è attivo solo su
   mobile.
2. Il consenso genera una *subscription* del browser, inviata a
   `POST /subscribe`; `worker/index.js` la salva in Cloudflare KV
   (namespace `PUSH_SUBS`).
3. Quando `json/progetti.json` o `json/taccuino.json` cambiano su
   `main`, il workflow `.github/workflows/notifica-nuovi-contenuti.yml`
   confronta la versione nuova con quella precedente, individua le voci
   aggiunte (`scripts/notifica-nuovi-contenuti.py`) e chiama
   `POST /notify` per ciascuna.
4. `worker/index.js` (funzione `gestisciNotify`) legge tutte le
   subscription da KV e invia il push a ognuna, usando
   `webpush-webcrypto` (nessuna dipendenza Node, gira nativamente nel
   runtime dei Workers — nessun flag `nodejs_compat` da attivare).

**File coinvolti:**
```
wrangler.toml         ← config del Worker: main, assets, KV binding
.assetsignore          ← esclude sorgenti (worker/, scripts/...) dal sito pubblico
worker/index.js         ← Worker: /subscribe, /notify, poi fallback su ASSETS
service-worker.js       ← Service Worker lato browser (push, notificationclick)
js/push.js              ← iscrizione lato client + UI
package.json            ← dipendenza webpush-webcrypto (usata da worker/index.js)
```

**Setup, una tantum:**

1. **Genera le chiavi VAPID** (in locale, richiede Node ≥ 18):
   ```
   npm install
   node scripts/genera-chiavi-vapid.mjs
   ```
   Salva subito `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`: la privata
   non va mai committata né condivisa.

2. **Genera anche un secret per `/notify`:**
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Incolla la chiave pubblica** in `js/push.js`, costante
   `VAPID_PUBLIC_KEY` (in cima al file). È l'unica delle tre chiavi che
   può stare nel codice pubblico.

4. **Crea il namespace KV** (in locale, con l'account Cloudflare già
   collegato):
   ```
   npx wrangler kv namespace create PUSH_SUBS
   ```
   Copia l'`id` restituito e incollalo in `wrangler.toml`, al posto di
   `sostituisci-con-id-namespace-kv`. Non è un dato segreto: può stare
   nel repo pubblico.

5. **Su Cloudflare** → dashboard → *Workers & Pages* → il progetto →
   *Settings → Variables and Secrets*, aggiungi:
   - `VAPID_PUBLIC_KEY` (tipo testo)
   - `VAPID_PRIVATE_KEY` (tipo **Secret**)
   - `VAPID_CONTACT_EMAIL` → es. `mailto:info@francescomartolini.art`
   - `NOTIFY_SECRET` (tipo **Secret**)

   Queste restano configurate stabilmente e non vengono toccate dai
   deploy successivi via `wrangler deploy`, perché quel comando gestisce
   solo ciò che è dichiarato in `wrangler.toml`.

6. **Verifica il campo `name`** in `wrangler.toml`: deve corrispondere
   esattamente al nome del progetto già esistente nella dashboard
   Cloudflare. Se non coincide, correggilo prima del prossimo deploy.

7. **Su GitHub** → repo → *Settings → Secrets and variables → Actions*,
   aggiungi un secret `NOTIFY_SECRET` con lo stesso valore del punto 2.

8. Fai un commit qualsiasi su `main` per far ripartire il build: legge
   il `package.json` e installa `webpush-webcrypto` prima del deploy.

**Da lì in poi non serve più toccare nulla**: ogni volta che
`json/progetti.json` o `json/taccuino.json` cambiano su `main` (a mano
o dal workflow di sincronizza-taccuino), gli iscritti ricevono
l'avviso in automatico.

**Note editoriali:**
- Le notifiche sono silenziose (`silent: true`) e senza badge numerico,
  coerenti con il registro del sito.
- Per non trasformare il Taccuino in un flusso continuo, valuta di
  rimuovere `json/taccuino.json` dai `paths` del workflow (o l'intero
  blocco "Invia notifiche per le nuove voci del Taccuino") se preferisci
  notificare solo i Progetti.
- Per testare tutto in locale: `npx wrangler dev` (legge `wrangler.toml`,
  usa la KV reale collegata all'id inserito al punto 4).

---

### MATERIALI DI SUPPORTO (`TEMPLATE/`)

| File | Descrizione |
|---|---|
| `Calligraphr-Template.pdf` | Template per creare font calligrafici su Calligraphr |
| `taccuino_template.xlsx` | Foglio Excel per strutturare il taccuino |
| `INSPO_Layout_Progetti/` | Screenshot di riferimento per i layout della pagina progetto |
| `Test_interfaccia_Descktop/` | Prototipi HTML di interfacce desktop alternative |

Questi file non influenzano il sito in produzione.

---

### NOTE TECNICHE

- Zero dipendenze esterne oltre a Google Fonts
- Dati gestiti interamente via JSON
- Taccuino aggiornabile da smartphone via Google Sheets
- Lightbox con navigazione frecce, swipe e tastiera
- Indice mobile generato dinamicamente
- Compatibile con tutti i browser moderni
- Navigazione da tastiera completa (frecce, Escape)
- PWA-ready: manifest e apple-touch-icon configurati
- URL parlanti per i progetti (`/progetti/<id>`), condivisibili direttamente — vedi sezione dedicata
