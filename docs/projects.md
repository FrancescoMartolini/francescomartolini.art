# Progetti fotografici

Guida completa: schema, blocchi di contenuto, layout, temi, collana PLAYLIST.
Tutto avviene in **`json/progetti.json`**.

## Schema base

```json
{
  "id": "nome-progetto",
  "titolo": "Nome del Progetto",
  "anno": "2025",
  "descrizione": "Breve descrizione (2-3 righe).",
  "testo_lungo": "Testo completo.\n\nUsa \\n\\n per i paragrafi.",
  "immagine_copertina": "https://res.cloudinary.com/…/cover.jpg",
  "galleria": ["https://res.cloudinary.com/…/01.jpg"],
  "link_esterno": "",
  "label_link": "Vedi online",
  "mappa": null,
  "pubblicato": true
}
```

| Campo | Note |
|---|---|
| `id` | slug dell'URL: `/progetti/<id>`. kebab-case, niente spazi. Gli id che iniziano con `playlist` sono riservati alla collana |
| `pubblicato` | `false` → il progetto appare come "In lavorazione" ma non è apribile |
| `link_esterno` | se `""` il bottone non appare |
| `immagine_copertina` | trasformazione Cloudinary `w_600` (vedi [images.md](images.md)) |
| `galleria` | immagini `w_1400`; se c'è `contenuto[]` viene aggiunta in coda ai blocchi |
| `mappa` | `null` · `{url, label}` (embed Google Maps) · `{lat, lng, zoom, label}` (coordinate) |

## Checklist: aggiungere un nuovo progetto

1. Caricare le immagini su **Cloudinary**; comporre gli URL con `w_600,q_auto,f_auto` (copertina) e `w_1400,q_auto,f_auto` (galleria).
2. Aggiungere l'oggetto in `json/progetti.json` (schema sopra + blocchi `contenuto`).
3. Non pronto? `"pubblicato": false`.
4. Opzionale: `layoutType` ([layout](#layout)), `theme` ([tema](#tema)), `mappa`, `link_esterno`.
5. Validare il JSON, provare in locale (`scripts/serve-locale.py`), verificare desktop + mobile + EN.
6. Commit + push su `main`, poi `npx wrangler deploy`.
7. La build rigenera da sola: pagina statica `/progetti/<id>/`, sitemap, feed RSS. Nessun altro passaggio.

## Blocchi di contenuto: `contenuto[]` {#blocchi}

Il contenuto interno si costruisce con un array ordinato di blocchi:

```json
"contenuto": [
  { "tipo": "titolo",    "valore": "Sottotitolo interno" },
  { "tipo": "testo",     "valore": "Testo.\n\nSecondo paragrafo." },
  { "tipo": "immagine",  "valore": "https://…/01.jpg" },
  { "tipo": "galleria",  "valore": ["https://…/02.jpg", "https://…/03.jpg"] },
  { "tipo": "mappa" },
  { "tipo": "separatore" },
  { "tipo": "nota",      "valore": "Appunto in font calligrafico" },
  { "tipo": "spotify",   "valore": { "playlistId": "…", "tracks": [] } },
  { "tipo": "embed",     "valore": { "url": "https://…/embed/…", "ratio": "16:9" } }
]
```

| `tipo` | `valore` | Note |
|---|---|---|
| `titolo` | stringa o `{it,en}` | sottotitolo interno |
| `testo` | stringa o `{it,en}` | `\n` → `<br>` |
| `immagine` | URL | apre il lightbox |
| `galleria` | array di URL | apre il lightbox con navigazione |
| `mappa` | *(nessuno)* | i dati stanno nel campo `mappa` di primo livello; il blocco decide solo *dove* appare |
| `separatore` | *(nessuno)* | linea orizzontale |
| `nota` | stringa o `{it,en}` | resa col font calligrafico |
| `spotify` | oggetto, vedi sotto | embed playlist + foto sincronizzata |
| `embed` | `{url, label?, ratio?}` | iframe generico |

> Il JSON è sempre interpretato come **dati**: un tag `<iframe>` scritto come stringa viene ignorato. Per incorporare contenuti esterni usare il blocco `embed`.
>
> Esiste anche un vecchio schema `sections[]` (tipi `text`, `image`, `imageText`, `gallery`, `quote`, `embed`, `map`) ancora supportato da `generaContenutoProgetto()` per retrocompatibilità: **non usarlo per progetti nuovi**.

### Blocco `spotify`

```json
{
  "tipo": "spotify",
  "valore": {
    "playlistId": "6LIiTKNwUXfBmKRSApj9GJ",
    "tracks": [
      { "uri": "spotify:track:4uLU6hMCjMI75M1A2tKUQC", "image": "https://…/01.jpg" }
    ]
  }
}
```

- `playlistId`: solo l'ID (parte tra `/playlist/` e `?` nell'URL di condivisione).
- `tracks`: una voce per brano a cui associare una foto; quando l'utente preme play, la foto appare in dissolvenza sopra il player. Brani non elencati = nessuna foto.
- **URI brano**: formato `spotify:track:` + **esattamente 22 caratteri alfanumerici**. App Spotify: Condividi → (Alt/Option) "Copia URI Spotify". Web player: copia link e prendi i 22 caratteri tra `/track/` e `?`.
- L'embed usa la Spotify iFrame API ufficiale caricata dinamicamente. Gli ad-blocker possono bloccarla: testare in incognito.

### Blocco `embed`

```json
{ "tipo": "embed", "valore": { "url": "https://www.youtube.com/embed/ID", "label": "Didascalia", "ratio": "16:9" } }
```

- `url` obbligatorio: deve essere l'URL **embed** (`/embed/…`, `player.vimeo.com/…`), non quello della pagina. Accetta anche `{it,en}`.
- `ratio`: `"16:9"` (default), `"4:3"`, `"1:1"`, `"9:16"`.

## Layout (solo desktop) {#layout}

Campo `layoutType`. Su mobile tutti i layout collassano a colonna singola.

| `layoutType` | Carattere | CSS |
|---|---|---|
| *(assente)* | colonna singola centrata (aspetto originale) | `.layout-base` |
| `editorial` | spazio bianco, testo a destra, quote centrata | `.layout-editorial` |
| `magazine` | Courier New, grigi parziali, asimmetrico | `.layout-magazine` |
| `column` | due colonne CSS, uppercase giustificato | `.layout-column` |
| `archivio` | 58/42, testo sx + immagine sticky che segue lo scroll | `.layout-archivio` |
| `panoramico` | titolo enorme, testo alternato, ratio XPan 65:24 | `.layout-panoramico` |

Con `layoutType` valorizzato, la pagina apre con **cover a due colonne** (immagine + titolo/anno/descrizione); col layout base resta l'header semplice.

## Tema colori (solo desktop) {#tema}

```json
"theme": { "background": "#f2ede6", "text": "#1a1a18", "accent": "#8a7a6a" }
```

| JSON | Variabile CSS | Effetto |
|---|---|---|
| `background` | `--pr-bg` | sfondo overlay |
| `text` | `--pr-text` | testo principale |
| `accent` | `--pr-accent` | anno, label, quote, bottoni secondari |

- Senza `theme` → colori base del sito.
- Senza `layoutType` → anche `theme` viene ignorato.
- Su mobile il tema non viene applicato.
- In stampa (`css/stampa.css`) i temi sono sempre forzati a nero su bianco.

## Collana PLAYLIST {#playlist}

- I volumi sono voci normali di `progetti.json` con **`id` tipo `PLAYLIST.00`, `PLAYLIST.01`…** (`/^playlist\.\d+/i`).
- Qualunque id che inizi per `playlist` è escluso dai progetti normali; la collana compare nella lista Progetti come **card sintetica unica** (id interno `__playlist__`) che apre l'archivio della collana (renderizzato dentro l'overlay progetto, layout `editorial`).
- Testi dell'archivio (hero, manifesto, processo, filosofia) in **`json/playlist.json`** — struttura: `hero{kicker,titolo,sottotitolo}`, `manifesto{eyebrow,testo}`, `processo{eyebrow,titolo,fasi[]}`, `filosofia{eyebrow,citazione,paragrafi[]}`.
- Campi extra dei volumi:
  - `sottotitolo` — mostrato nella griglia dell'archivio;
  - `shop_url` + `shop_label` — bottone acquisto; senza `shop_url` compare "Prossimamente".
- In fondo alla pagina di ogni volume sono iniettati automaticamente blocco acquisto e navigazione volume precedente/successivo/indice.

## Verifiche dopo l'aggiunta

- Progetto apribile da: griglia/slider, overlay "Tutti i progetti", indice mobile, URL diretto `/progetti/<id>`.
- Immagini nel lightbox (frecce/swipe/Escape).
- Layout e tema corretti solo su desktop; mobile con colori base.
- `pubblicato: false` → card visibile ma "In lavorazione", non cliccabile, fuori da sitemap e feed.
