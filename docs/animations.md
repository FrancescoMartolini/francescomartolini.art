# Animazioni e transizioni

**Nessuna libreria esterna** (niente GSAP/Lenis/PhotoSwipe): tutto è CSS + IntersectionObserver + rAF in vanilla JS.

## Inventario

| Sistema | Dove | Trigger | Tempi/easing |
|---|---|---|---|
| Sfoglio pagine mobile | `css/stile.css` `.page` / `.page.attiva` / `.uscita-sinistra`; logica in `libro.js` (`navigaA`, gesture) | swipe/tap/frecce | `opacity + translateX(±60px)`, 0.25s, `cubic-bezier(.25,.46,.45,.94)` |
| Overlay pagine (tutti i progetti, studi, chi sono, commercial) | `#overlay-pagina` | `apriPagina()` | `translateY(100%)→0`, 0.3s stesso easing |
| Overlay progetto / archivio taccuino | `#pagina-progetto`, `#pagina-taccuino-archivio` | `apriProgetto()` / `apriTaccuino()` | `translateY(100%)→0`, 0.6s + fade colore tema 0.4s |
| Scroll reveal contenuti progetto | `.reveal → .visible`; `avviaReveal()` in `libro.js` | IntersectionObserver (root: overlay, soglia 0.06) | `opacity + translateY(20px)`, 0.7s ease |
| Scroll reveal PLAYLIST | `rivelaAlloScroll()` | IO soglia 0.12 | come sopra |
| Immagine sticky layout `archivio` | `avviaScrollArchivio()` | scroll dell'overlay (marker `data-archivio-img`) | fade out 240ms → swap src → fade in (0.4s) |
| Foto sincronizzata Spotify | `avviaSpotifySections()` | evento `playback_update` dell'iFrame API | fade 0.6s, ritardo logico 180ms |
| Slider progetti desktop | `.progetti-griglia` | frecce slider | `transform`, 0.5s stesso easing |
| Hover card/immagini | `.progetto-card`, `.studio-img`, `.pl-volume-cover`… | hover CSS | scale 1.03–1.05, 0.5–0.6s; PLAYLIST: traslazione + ombra dura |
| Cursore custom | `avviaCursore()` in `libro.js` + `#cursore/#cursore-ring` | `mousemove` (solo `hover:hover`) | dot immediato; ring lerp 0.1 via rAF; inversione colore 0.15s |
| Epilogo "fin." e footer mobile | `.fin-epilogo.visibile`, `.fin-footer.visibile`, `.epilogo-desktop.visibile` | arrivo alla pagina / scroll | fade 1–1.4s (+ translateY 6px) |
| Segnalibro mobile | `.segnalibro-tab`, keyframes `segnalibro-scendi` | ritorno alla pagina salvata | discesa da -100%, 0.5s, ritardo 0.3s |
| Lightbox | `#lightbox.aperto`, keyframes `lightbox-fadein` | click immagine | fade 0.3s; cambio img con classe `caricando` (0.2s) |
| Nota evidenziata (link diretto) | `.taccuino-voce.evidenziata` | apertura `/taccuino/<id>` | keyframes sfondo 2.4s — **disattivata con `prefers-reduced-motion`** |
| Cookie banner | `#cookie-banner.visibile` | prima visita | `translateY`, 0.5s |

## Come modificare un'animazione

1. **Solo estetica** (durata/easing) → cercare la regola in `css/stile.css` (quasi tutte le durate sono dichiarate lì o nella variabile `--transizione: 0.4s cubic-bezier(.25,.46,.45,.94)`).
2. **Logica/trigger** → funzione corrispondente in `js/libro.js` (tabella sopra).
3. Le transizioni degli overlay usano `transform` su elementi `position: fixed`: non aggiungere `overflow` o `top/left` animati, si rompe il flusso stampa (`stampa.css` compensa con `!important`).

## Riduzione del movimento

Attualmente solo l'animazione "nota evidenziata" rispetta `prefers-reduced-motion`. Per estendere il supporto: aggiungere regole globali in `stile.css` (vedi suggerimenti in [accessibility.md](accessibility.md)).

## Nota per la stampa

`css/stampa.css` azzera transizioni/animazioni e forza `opacity: 1` sul contenuto rivelato: gli elementi `.reveal` non spariscono dal foglio.