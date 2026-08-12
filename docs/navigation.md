# Navigazione e URL

## Le due navigazioni

### Desktop (>768px)
- Scroll verticale tra sezioni; header fisso (60px) con menu: **Progetti · Intervalli · Chi sono · Taccuino** + toggle lingua (il bottone Collaborazioni nell'header è commentato; la sezione resta raggiungibile dal blocco Chi sono).
- Le voci menu chiamano `apriPagina()`/`apriTaccuino()`: overlay a pagina intera (`#overlay-pagina`, `#pagina-progetto`, `#pagina-taccuino-archivio`), chiusura con X o `Escape`.
- **Aggiungere una voce menu**: `<li>` in `index.html` → `.menu-voci`, con `data-i18n="menu.xxx"` e chiave in `json/ui.json`.

### Mobile (≤768px) — il libro
Ordine delle pagine: Home → Cap. 00 Introduzione (titolo+testo) → Indice → Cap. 01 Progetti (pagine progetto intercalate a voci Taccuino) → Cap. 02 Intervalli → Cap. 03 Chi sono → Commercial → Pubblicazioni → fin.

Controlli (implementati in `libro.js`, parte finale del file): swipe, tap zona destra/sinistra, frecce in basso (`#mobile-nav`), indicatore a puntini trascinabile (`#indicatore`), bottone "info utilizzo" → overlay `come-funziona`.

**Aggiungere una pagina al libro**: creare l'elemento `.page` (o generarlo in `costruisciMobile()`), con `data-favicon` e `data-titolo`; l'indice mobile (`costruisciIndice()`) va aggiornato se la pagina deve comparirvi.

## URL parlanti (routing silenzioso)

Il sito ha URL condivisibili ma **la barra degli indirizzi resta sempre sulla radice** durante la navigazione.

### Meccanismo (due livelli)

1. **Pagine statiche reali** — a ogni build `scripts/genera-route-statiche.py` crea copie fisiche di `index.html`:

   | URL | Contenuto |
   |---|---|
   | `/progetti/<id>/` | progetto (id da `progetti.json`) |
   | `/chi-sono/` | Chi sono |
   | `/fotografie-commerciali/` | Fotografie Commerciali |
   | `/intervalli/` | Intervalli |
   | `/taccuino/` (+ `/taccuino/<id>/`) | Taccuino / singola nota |
   | `/playlist/` | archivio collana |

   Il server risponde 200 con un file reale: nessuna dipendenza da JS per l'apertura.
2. **`404.html` come rete di sicurezza** — per URL non generati (refusi, link vecchi): salva il percorso, redirect a `/?redirect=…`; l'head di `index.html` ripristina l'URL con `history.replaceState`. Il body del 404 **deve restare sostanzioso**: Chromium sostituisce i 404 leggeri con la propria pagina errore.

### All'avvio

`leggiRoute()` (in `libro.js`) è l'unica fonte di verità: interpreta il path (al netto del prefisso legacy `BASE_PATH`) e apre la pagina corrispondente; poi l'URL viene riportato alla radice. Il sito **non crea history entries**: il tasto indietro del browser esce dal sito invece di chiudere gli overlay (comportamento voluto).

### Aggiungere una sezione con URL proprio

1. Pagina/overlay in `index.html` + funzione `apriPagina('nome-pagina')`.
2. Mappa `SEZIONI_URL` in `js/libro.js`: `'nome-pagina': { slug: 'url-slug', titolo: '…' }`.
3. `scripts/genera-route-statiche.py`: aggiungere la sezione all'elenco di generazione.
4. `scripts/genera-sitemap.py`: includere il nuovo URL.
5. Eventuale voce menu/indice + chiavi `json/ui.json`.

## Favicon dinamica

Ogni sezione dichiara `data-favicon="X"`; `libro.js` genera una favicon SVG data-URI con la lettera (H, P, T, I, C, F, ≡, ·…).

## Segnalibro

`localStorage['libro-pagina']` ricorda l'ultima pagina letta nel libro mobile; al ritorno compare il nastro `.segnalibro-tab` che propone di riprendere la lettura.