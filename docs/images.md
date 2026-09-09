# Immagini e video

## Principio

Le fotografie dei contenuti **non vivono nel repository**: si caricano su **Cloudinary** e nei JSON si incolla l'URL trasformato. In `images/` restano solo gli asset di branding (favicon/manifest/foto chi-sono).

## Trasformazioni consigliate

| Uso | Trasformazione |
|---|---|
| Copertine progetti, anteprime, taccuino, collaborazioni | `w_600,q_auto,f_auto` |
| Gallerie progetto, intervalli, immagini grandi | `w_1400,q_auto,f_auto` |

`q_auto` = qualità automatica, `f_auto` = formato migliore per il browser (webp/avif quando supportati).

## Come vengono servite

- Tutte le immagini create da `libro.js` passano da `creaImg()`: `loading="lazy"` tranne hero e cover progetto (`eager`), `draggable=false`, fallback testuale se l'URL fallisce (`img-wrap--vuota`).
- Le immagini nei blocchi progetto usano `loading="lazy"`.
- `pointer-events: none` sulle immagini + protezione click destro/drag (vedi README, logica in `libro.js`): le immagini restano cliccabili solo tramite i wrapper che aprono il lightbox.
- `creaImg()` genera anche uno **`srcset` responsive** a partire dall'URL Cloudinary già incollato nel JSON: riscrive `w_NNN` nella trasformazione esistente per le larghezze `400/700/1000/1400/2000` (con `c_limit` per non fare upscaling), lasciando invariati `q_auto`/`f_auto`. Non serve incollare più URL diversi: basta l'unico URL già presente (`w_600` o `w_1400`), il browser sceglie da solo il file giusto in base a viewport e densità dello schermo — così un iPhone e un monitor esterno non scaricano più lo stesso peso.
- `sizes` di default è `100vw` (immagine a pagina intera, il caso più comune nel libro mobile). Nei punti dove l'immagine occupa una frazione della larghezza in una griglia desktop (es. `studi-griglia`, `tutti-card-img`, `collab-griglia`, `pl-volume-cover`) `creaImg()` riceve un quarto argomento `sizes` esplicito, per non far scaricare al browser una variante più pesante del necessario.
- Se l'URL non è Cloudinary (es. `images/chi-sono-img.jpg`) `creaImg()` non genera `srcset` e si comporta come prima.

## Didascalie/alt per foto (opzionale) {#didascalie}

Di norma una foto di galleria non ha una descrizione propria: l'`alt` usa il titolo del progetto, ripetuto identico su ogni immagine. Va bene per screen reader e SEO solo fino a un certo punto — non descrive *quella* foto specifica, e scriverla è un lavoro editoriale (bisogna sapere cosa c'è nello scatto), non qualcosa che si automatizza.

Per una foto alla volta, quando e se serve, si può sostituire il semplice URL con un oggetto — sia in `galleria` di primo livello sia nei blocchi `contenuto[]` di tipo `immagine`/`galleria` (vedi [projects.md](projects.md#blocchi)):

```json
"galleria": [
  "https://res.cloudinary.com/…/01.jpg",
  { "src": "https://res.cloudinary.com/…/02.jpg",
    "alt": { "it": "Muro scrostato, via Ghibellina", "en": "Peeling wall, via Ghibellina" } }
]
```

- Nessun obbligo di migrazione: gli URL semplici continuano a funzionare esattamente come oggi (l'`alt` resta il titolo del progetto).
- `normalizzaImg()` in `js/libro-nucleo.js` è il punto unico che interpreta questo formato: usato da `creaImg()` e da ogni generatore di galleria in `js/libro-routing.js`.
- `alt` è bilingue come tutti i testi del sito (`{it,en}`): mai una stringa unica per due lingue.
- La foto di una nota del Taccuino (`json/taccuino.json`, campo `foto`) non segue questo schema: il suo `alt` è generato automaticamente dal testo della nota stessa (`altTaccuino()` in `js/libro-nucleo.js`), niente da scrivere a mano.

## Video (Cloudinary)

- L'URL video ha prefisso **`/video/upload/…`** (non `/image/upload/…`).
- `f_auto,q_auto` funziona anche sui video (mp4/webm per browser).
- Poster automatico: cambiare l'estensione dell'URL video in `.jpg` (solo se si vuole un poster diverso da quello caricato nel campo `foto`).
- Il piano gratuito ha limiti più stretti sui video (peso, minuti di trasformazione): verificarli prima di caricarne molti in alta qualità.

## Asset locali (`images/`)

| File | Uso |
|---|---|
| `manifest.json` | PWA (icona, nome, colori) |
| `favicon-generate.js` | solo documentazione: la favicon è generata dinamicamente da `libro.js` (lettera per sezione, SVG data-URI) |
| `chi-sono-img.jpg` | ritratto nella sezione Chi sono (se presente nel repo) |

> ⚠️ Nel tree analizzato compaiono solo questi file: i riferimenti in `index.html` a `images/favicon.svg`, `images/icon.jpg` e nel manifest a `apple-touch-icon.svg`, `icon-192.png`, `icon-512.png` vanno verificati nel repo reale (potrebbero essere stati omessi nel dump).

## Naming (suggerito)

Non essendoci convenzioni rigide nel codice, si propone: kebab-case, prefisso per progetto (es. `playlist01-cover.jpg`, `playlist01-01.jpg`), versione per larghezza gestita solo via trasformazioni (mai duplicati `nome-600.jpg`/`nome-1400.jpg`).