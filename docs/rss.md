# Feed RSS

4 feed RSS 2.0 **statici**, ricreati a ogni build da `scripts/genera-feed-rss.py`.

| Feed | URL | Contenuto |
|---|---|---|
| Tutto | `/feed.xml` | Progetti + Taccuino + Istanze in ordine cronologico unico |
| Progetti | `/progetti/feedrss.xml` | solo progetti pubblicati |
| Taccuino | `/taccuino/feedrss.xml` | ultime 30 voci |
| Istanze | `/istanze/feedrss.xml` | voci pubblicate di `intervalli.json` |

- I file generati non vanno committati.
- I 4 feed sono dichiarati anche come `<link rel="alternate">` in `index.html`.

## Come li vedono i visitatori

Bottone **Feed RSS** (pagina "fin." mobile + footer desktop) → popup `js/rss-modal.js` (`#rss-modal-backdrop`) con i 4 indirizzi e tasto Copia. Nessuna link diretto all'XML: solo testo da incollare nel lettore. Testi del popup in `rss.*` in `json/ui.json`.

## Nota sul nome "Istanze"

È solo l'etichetta pubblica della sezione Intervalli nei feed. File (`intervalli.json`) e percorso (`/intervalli`) restano invariati. Se in futuro si rinomina davvero la sezione, allineare:

1. `menu.intervalli` in `json/ui.json`;
2. `id`/`data-i18n` che iniziano con `intervalli` in `index.html`;
3. `genera_feed_istanze()` in `scripts/genera-feed-rss.py`.