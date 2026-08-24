# Intro cinematografica della Home

## Cos'è

Un video a schermo intero che precede l'apertura della Home, come l'apertura
di un progetto editoriale — non un preloader. Vive interamente in:

- `index.html` → blocco `#intro-cinematica` (subito dopo `<body>`, prima dell'header)
- `js/intro-video.js` → tutta la logica (nessuna dipendenza nuova, vanilla JS)
- `css/stile.css` → sezione "INTRO CINEMATOGRAFICA HOME"

## Dove inserire i video

In cima a `js/intro-video.js`:

```js
var INTRO_VIDEO_LANDSCAPE = ''; // video orizzontale (desktop / landscape)
var INTRO_VIDEO_PORTRAIT  = ''; // video verticale (mobile / portrait)
```

Incollare i due URL Cloudinary completi, stessa convenzione delle immagini
(vedi [images.md](images.md) → "Video (Cloudinary)"): prefisso
`/video/upload/…`, trasformazione `f_auto,q_auto` per formato e qualità
automatici. Esempio:

```text
https://res.cloudinary.com/dgo7tnyv6/video/upload/f_auto,q_auto/intro-desktop.mp4
```

Finché uno dei due (o entrambi) resta vuoto, l'intro usa quello disponibile;
se sono entrambi vuoti l'intro non viene proprio mostrata e la Home si apre
come oggi. Nessun URL è precaricato o inventato nel codice.

## Come viene scelto landscape/portrait

In base al **viewport reale al momento dell'apertura** (`innerHeight >
innerWidth` → portrait), non allo user-agent: copre desktop, laptop, tablet
e smartphone in entrambi gli orientamenti. Solo il video scelto viene
caricato — l'altro non viene mai richiesto dal browser.

## Quando NON viene mostrata

- `prefers-reduced-motion: reduce`
- già mostrata in questa sessione di navigazione (`sessionStorage`, chiave
  `fm-intro-vista`) — si ripresenta alla sessione successiva, non ad ogni
  refresh
- link profondo (`/progetti/…`, `/taccuino`, `/chi-sono`, `/intervalli`,
  `/playlist`, `/fotografie-commerciali`): chi apre un link condiviso vede
  subito quel contenuto
- nessuno dei due video è configurato

In tutti questi casi l'elemento `#intro-cinematica` viene rimosso dal DOM
subito, senza flash nero.

## Autoplay, fine, fallback

- `muted` + `playsinline` (attributi HTML, non solo proprietà JS: necessario
  per l'autoplay su iOS Safari), nessun controllo nativo del browser.
- Se `video.play()` viene rifiutato (autoplay bloccato) o il video va in
  errore, o non è pronto entro 4s: si passa subito alla Home, nessun blocco.
- Alla fine naturale del video: breve dissolvenza sul frontespizio (stesso
  titolo già presente in Home) su fondo nero, poi dissolvenza dell'intera
  intro verso la Home sottostante (già interamente costruita, non ricaricata).
- Bottone "Salta" sempre presente (angolo in basso a destra, rispetta
  `env(safe-area-inset-*)`), utilizzabile anche da tastiera: Escape/Invio/Spazio
  chiudono l'intro in ogni momento; il focus viene portato lì all'apertura.

## Interazione con il libro mobile

Le gesture/tastiera del libro (`gestisciTap`, `gestisciTastiera`,
`gestisciTouchEnd` in `js/libro.js`) si fermano finché `#intro-cinematica`
esiste nel DOM, per evitare che un tap o una freccia durante l'intro
sfoglino la pagina sottostante.

## Performance

- Nessuna libreria nuova; script minimo, caricato subito dopo il markup
  di cui ha bisogno (non aspetta `DOMContentLoaded`), per far partire il
  video il prima possibile.
- `preload="auto"` solo sul video effettivamente scelto.
- Poster automatico Cloudinary (stessa trasformazione, estensione `.jpg`)
  mostrato finché il video non è pronto.
- `f_auto,q_auto` lascia a Cloudinary la scelta del formato/qualità più
  leggeri per il browser e la CDN per la consegna.
