# Performance

## Ottimizzazioni già in atto

| Ottimizzazione | Dove |
|---|---|
| Zero librerie JS esterne nel frontend | — |
| `preconnect` a Google Fonts | `index.html` |
| `font-display: swap` sul font locale | `css/stile.css` |
| Lazy loading su tutte le immagini tranne hero e cover progetto | `creaImg()` in `libro.js` |
| Cache HTML di overlay progetto e archivio taccuino (riaperture istantanee) | `_cacheProgetti`, `_cacheTaccuino` |
| Inserimento DOM a blocchi con `requestAnimationFrame` (studi, collaborazioni) | `apriPagina()` |
| Spotify iFrame API caricata solo se esiste un blocco spotify | `caricaSpotifyIframeAPI()` |
| Minificazione JS/CSS a ogni deploy (su checkout temporaneo) | `scripts/prepara-deploy.sh` |
| Immagini via Cloudinary con `q_auto,f_auto` e larghezze mirate | JSON |
| Service Worker senza cache offline (niente stale content) | `service-worker.js` |
| Asset non necessari esclusi dalla pubblicazione | `.assetsignore` |

## Costi noti

- **Google Fonts**: Playfair + Inter + *Caveat Brush*. Caveat Brush non è più usata dal CSS: rimuoverla dal link riduce richieste/peso.
- **`images/stile.css`**: copia orfana non referenziata — ininfluente a runtime ma rumore nel repo.
- Nessun `srcset`: su schermi piccoli le immagini `w_1400` sono sovradimensionate (possibile evoluzione con trasformazioni Cloudinary multiple).

## Linee guida per restare veloci

1. Immagini sempre con trasformazione Cloudinary appropriata (`w_600`/`w_1400`) — mai URL "raw".
2. Nuove immagini pesanti fuori viewport → lasciarle in blocchi gestiti da `creaImg`/lazy.
3. Non aggiungere dipendenze npm al frontend (vincolo di progetto).
4. Le liste lunghe nel DOM vanno inserite a blocchi (`requestAnimationFrame`) come fanno studi/collaborazioni.
5. Video: `preload="metadata"` (già impostato per il taccuino), mai autoplay.