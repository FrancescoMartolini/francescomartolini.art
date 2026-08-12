# Gestione dei contenuti (JSON)

Tutti i contenuti vivono in `json/`, caricati a runtime da `js/libro.js` (`caricaDati()`).

## Mappa dei file

| File | Contenuto | Guida specifica |
|---|---|---|
| `progetti.json` | progetti fotografici + volumi PLAYLIST | [projects.md](projects.md) |
| `playlist.json` | testi della collana PLAYLIST (hero, manifesto, processo, filosofia) | [projects.md](projects.md#playlist) |
| `intervalli.json` | sequenze "Intervalli" (etichetta pubblica "Istanze" nei feed) | qui sotto |
| `collaborazioni.json` | lavori commerciali | qui sotto |
| `pubblicazioni.json` | pubblicazioni e press | qui sotto |
| `intro.json` | introduzione del libro | qui sotto |
| `epiloghi.json` | frasi di chiusura | qui sotto |
| `taccuino.json` | note del Taccuino | [taccuino.md](taccuino.md) |
| `ui.json` | testi di interfaccia IT/EN | [i18n.md](i18n.md) |

## Regole generali

- **Bilingue**: ogni testo può essere una stringa semplice (solo IT) oppure un oggetto `{ "it": "...", "en": "..." }`. Il fallback è sempre IT.
- **A capo nei testi**: usare `\n` nelle stringhe JSON; `libro.js` li converte in `<br>`.
- **Paragrafi**: doppio `\n\n` dove la logica lo interpreta (es. `testo_lungo`, manifesto).
- **JSON valido**: virgolette e virgole sono l'errore più comune; un JSON rotto fa sparire la sezione corrispondente (vedi [troubleshooting.md](troubleshooting.md)).
- I file vanno committati su `main`; il deploy è manuale ([deployment.md](deployment.md)).

## Schemi

### `intervalli.json`

```json
[
  {
    "id": "sequenza-01",
    "titolo": "Sequenza 01",
    "descrizione": "Breve descrizione.",
    "immagini": ["https://res.cloudinary.com/…/a.jpg", "https://res.cloudinary.com/…/b.jpg"]
  }
]
```

Nota: il nome pubblico "Istanze" compare solo nel feed (`/istanze/feedrss.xml`) e nel popup RSS; file e percorsi restano `intervalli` (vedi [rss.md](rss.md)).

### `collaborazioni.json`

```json
[
  {
    "id": "cliente-1",
    "titolo": "Nome Cliente",
    "anno": "2025",
    "foto": "https://res.cloudinary.com/…/cover.jpg",
    "galleria": ["https://res.cloudinary.com/…/extra-1.jpg"]
  }
]
```

`galleria` è opzionale. Se popolata: su mobile il tap sulla copertina apre il lightbox con tutte le foto; su desktop il click sul nome cliente (anche da tastiera, Invio/Spazio) apre una striscia inline a tutta larghezza — un solo pannello aperto alla volta.

### `pubblicazioni.json`

```json
[ { "id": 1, "titolo": "Titolo", "anno": "2025", "link": "https://…", "immagine": "" } ]
```

`immagine` e `link` opzionali. Sul desktop l'elenco appare nella colonna destra di Chi sono (scroll interno); su mobile è un capitolo del libro.

### `intro.json`

```json
{ "titolo": "Introduzione", "testo": "Testo…\n\nSecondo paragrafo.", "firma": "Francesco Martolini", "anno": "2026" }
```

Usato sia nel libro mobile (capitolo 0) sia nell'overlay Chi sono.

### `epiloghi.json`

Array di frasi brevi per la pagina "fin.".
**Stato attuale**: il file viene caricato, ma la frase mostrata è fissa (`FRASE_FIN` in `libro.js`); la selezione casuale dall'elenco è commentata. Per usarlo davvero: decommentare la riga in `inizializzaFin()`.

## Dove viene reso ciascun contenuto

| Dato | Mobile | Desktop |
|---|---|---|
| `intro` | pagine capitolo 0 | overlay Chi sono |
| `progetti` | pagine progetto nel libro | slider + overlay "Tutti i progetti" + overlay dettaglio |
| `playlist` | card sintetica nel libro | card nella griglia + archivio PLAYLIST |
| `taccuino` | pagine intercalate tra i progetti | colonna 3 voci + archivio completo |
| `intervalli` | pagine capitolo 02 | griglia + overlay "Tutti gli studi" |
| `collaborazioni` | capitolo Commercial | overlay Fotografie Commerciali |
| `pubblicazioni` | capitolo Pubblicazioni | colonna in Chi sono |
| `epiloghi`/`FRASE_FIN` | pagina "fin." | epilogo nel footer |