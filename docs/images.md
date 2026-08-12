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
- Niente `srcset`/responsive images native: la responsività è delegata alle trasformazioni Cloudinary (scegliere la larghezza giusta per contesto).

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