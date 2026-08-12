# Taccuino

Appunti, frammenti, note fotografiche. Fonte di verità: **`json/taccuino.json`**.

## Struttura di una voce

```json
{
  "id": 18,
  "testo": { "it": "Testo in italiano.", "en": "Text in English." },
  "data": "2026-08-04",
  "foto": "https://res.cloudinary.com/…/immagine.jpg",
  "video": null,
  "camera": "Scattata con Canon 1D Mark III"
}
```

- `testo`: stringa semplice o oggetto `{it,en}`.
- `data`: `YYYY-MM-DD`. `caricaDati()` ordina per data decrescente: **l'ordine nell'array non conta**.
- `id`: numero progressivo (il bot assegna il prossimo libero; a mano, usare il max+1).
- `foto`/`video`: `null` o URL Cloudinary. Se ci sono entrambi, la foto fa da **poster** del video.
- **Nessun autoplay**: il video parte solo se il visitatore lo avvia (scelta editoriale).

## Come si scrive

### 1. Bot Telegram (consigliato)

Comando `/nuovanota`: flusso guidato (testo IT → EN → data → foto → video → camera → riepilogo → CONFERMA). Alla conferma il bot committa direttamente su `json/taccuino.json` via API GitHub — quel commit, come ogni push su `main`, è pronto per il deploy. Dettagli e setup: [telegram-bot.md](telegram-bot.md).

### 2. A mano

Modifica diretta di `json/taccuino.json` seguendo lo schema sopra, poi commit + push + `npx wrangler deploy`.

## Dove appare

- **Mobile**: le voci sono *intercalate* tra le pagine dei progetti e degli intervalli nel libro (una pagina taccuino dopo ciascuna pagina progetto, finché ci sono voci).
- **Desktop**: anteprima delle ultime 3 voci nella sezione Taccuino; archivio completo nell'overlay con **ricerca full-text**.
- **URL diretto**: `/taccuino` apre l'archivio; `/taccuino/<id>` apre l'archivio posizionato sulla nota, con un breve richiamo visivo (usato es. dalle caption Instagram).

## Feed e notifiche

- Le ultime 30 voci alimentano `/taccuino/feedrss.xml` e concorrono a `/feed.xml` ([rss.md](rss.md)).
- Le nuove voci possono scatenare una notifica push (sistema in pausa: [push-notifications.md](push-notifications.md)).

## Integrazione Google Sheets — disattivata

Il Taccuino nasceva su Google Sheets con sync notturna. È stata **disattivata** perché la sync riscriveva il file da zero, cancellando le voci aggiunte dal bot. Il codice è conservato, non cancellato:

| Punto | Stato |
|---|---|
| `.github/workflows/sincronizza-taccuino.yml` | trigger `schedule` commentato; resta il lancio manuale |
| `js/libro.js` → `caricaDati()` | lettura live dal foglio commentata; il sito legge solo `json/taccuino.json` |
| `scripts/sincronizza-taccuino.py` | invariato, pronto |
| `SHEETS_URL` / `SHEETS_URL_EN` | commentate in testa a `libro.js` |

**Per riattivarla**: rimuovere i commenti nei due punti sopra e verificare PRIMA che il foglio contenga anche le voci aggiunte via bot, altrimenti la prima sync le cancellerebbe.