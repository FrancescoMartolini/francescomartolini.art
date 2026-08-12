# Troubleshooting

### In locale il sito è vuoto / console piena di errori CORS-fetch
Aperto con doppio click (`file://`)? I fetch dei JSON sono bloccati. Usare `python3 scripts/serve-locale.py` → `http://localhost:8000/`.

### Il link diretto `/progetti/<id>` in locale dà 404 o cade sul fallback
Mancano le pagine statiche generate: eseguire prima `python3 scripts/genera-route-statiche.py`.

### Una sezione non appare (progetti/intervalli/collaborazioni…)
Quasi sempre JSON non valido (virgola, virgola finale, virgolette). Aprire la console: il `fetch` fallito è indicato. Validare il file e ricaricare.

### Il progetto non si apre / non è cliccabile
- `"pubblicato": false` → appare come "In lavorazione" ed è intenzionalmente chiuso.
- `id` che inizia con `playlist`: è trattato come collana, non come progetto.
- Id duplicati: `stato.progetti.find()` prende il primo.

### Le immagini non si caricano
- URL Cloudinary errato o senza trasformazioni; verificare che contenga `/image/upload/`.
- Per i video il prefisso è `/video/upload/`.
- In console: il fallback `img-wrap--vuota` mostra l'alt al posto dell'immagine → URL rotto.

### L'embed Spotify non compare
- Ad-blocker (uBlock, Brave Shields): testare in incognito.
- `playlistId` sbagliato (serve l'ID, non l'URL).
- `uri` traccia malformato: devono essere `spotify:track:` + 22 caratteri.

### Le animazioni/reveal non partono dentro un progetto
I reveal usano IntersectionObserver con root = l'overlay: se l'HTML del progetto è stato messo in un contenitore diverso, o la classe `.reveal` viene aggiunta dopo l'observe, il reveal non scatta. Verificare `avviaReveal()`/`rivelaAlloScroll()`.

### Il deploy non aggiorna il sito
- Il deploy **è manuale**: dopo il push serve `npx wrangler deploy`.
- Errore "Missing entry-point…": `wrangler.toml` mancante/incompleto o `name` errato.
- Il sito è tornato su `*.workers.dev`: manca il blocco `[[routes]]` in `wrangler.toml`.
- Modifica "sparita" dopo un riapertura di progetto: cache HTML (`_cacheProgetti`) — ricaricare duro; se si è cambiata la logica di generazione senza invalidare la cache, svuotare anche il localStorage di test.

### Il tasto indietro non chiude i progetti aperti
Comportamento voluto: il sito non crea history entries. Il back esce dal sito.

### Anteprime WhatsApp/Telegram generiche
Limite noto: `og:*` statici. Il link funziona, l'anteprima no. Vedi [seo.md](seo.md).

### Chromium mostra la sua pagina 404 invece del redirect
Il body di `404.html` è stato svuotato/alleggerito troppo: Chromium sostituisce i 404 leggeri. Il testo visibile nel body è necessario.

### Ho eseguito `prepara-deploy.sh` in locale e i sorgenti sono cambiati
Lo script minifica sovrascrivendo: è pensato per la build Cloudflare (checkout temporaneo). Ripristinare i file con git (`git checkout -- js css`) e non rieseguirlo localmente.

### Il bot Telegram non risponde / errore su `/nuovanota`
- Verificare webhook (`getWebhookInfo`), `TELEGRAM_WEBHOOK_SECRET` e `TELEGRAM_ALLOWED_CHAT_ID`.
- Stato conversazione scaduto dopo 30 minuti: ricominciare `/nuovanota`.
- Consultare `worker/guida-reset-bot-telegram.md` per le procedure di reset.

### Il tema chiaro/scuro non funziona
Il markup del bottone esiste; lo stato di `avviaTema()` in `libro.js` va verificato (il README v8.0 lo dava per disattivato). Se il bottone non reagisce, il punto è quello.