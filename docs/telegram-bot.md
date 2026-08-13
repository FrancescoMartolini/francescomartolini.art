# Bot Telegram

Bot ospitato nello stesso Worker Cloudflare del sito (`worker/`), per gestire i contenuti dal telefono. L'architettura è **modulare** e basata su **bozze**: ogni flusso di creazione produce una bozza salvata in KV, che puoi modificare e pubblicare in un secondo momento.

## File coinvolti

| File | Ruolo |
|---|---|
| `worker/telegram.js` | Routing dei comandi, callback query, generazione caption AI |
| `worker/telegram-core.js` | Funzioni condivise: messaggi, bozze, stato, commit GitHub, traduzione AI |
| `worker/telegram-notes.js` | `/nuovanota` |
| `worker/telegram-projects.js` | `/nuovoprogetto` |
| `worker/telegram-intervals.js` | `/nuovointervallo` |
| `worker/telegram-publications.js` | `/nuovapubblicazione` |
| `worker/telegram-collaborations.js` | `/nuovacollaborazione` |
| `worker/telegram-drafts.js` | `/bozza`, `/modifica`, `/pubblica`, `/elimina` |
| `worker/guida-reset-bot-telegram.md` | Procedura di reset / ripartenza pulita |

## Comandi

| Comando | Cosa fa |
|---|---|
| `/start` | Benvenuto + elenco comandi |
| `/nuovanota` | Nuova voce del Taccuino |
| `/nuovoprogetto` | Nuovo progetto fotografico |
| `/nuovointervallo` | Nuovo intervallo |
| `/nuovapubblicazione` | Nuova pubblicazione |
| `/nuovacollaborazione` | Nuova collaborazione |
| `/bozza` (o `/bozze`) | Elenco le bozze in sospeso, raggruppate per tipo |
| `/modifica <id>` | Modifica i campi di una bozza (tastiera inline) |
| `/pubblica <id>` | Valida i campi obbligatori e committa su GitHub |
| `/elimina <id>` | Elimina una bozza (con conferma) |
| `/lista` | Elenco progetti con il loro `id` |
| `/post <id>` | Caption Instagram IT+EN generata con AI |
| `/rigenera <id>` | Rigenera la caption |
| `/annulla` | Annulla il flusso in corso (la bozza parziale resta salvata) |
| `/salta` | Salta il campo facoltativo corrente (dentro un flusso) |

## Come funziona

- **Stato conversazione**: salvato in KV `PUSH_SUBS` come `telegram_state:<chatId>`, con scadenza automatica dopo **1 ora** (`expirationTtl: 3600`).
- **Bozze**: salvate in KV come `bozza:<id>` (id = timestamp in base 36). Ogni bozza ha `type`, `status`, `data`, `created_at`, `updated_at`.
- **Traduzione EN**: automatica al momento della pubblicazione, via Workers AI (`traduciTesto()`, modello `@cf/meta/llama-3.3-70b-instruct-fp8-fast`). Non viene mai chiesta all'utente.
- **Data**: automatica, fuso `Europe/Rome` (`dataOggiRoma()`).
- **Pubblicazione**: `pubblicaSuGithub()` legge il JSON attuale da GitHub, aggiunge la voce col prossimo `id` libero e committa via API Contents su `main`. Il commit appare come un push normale; **il deploy resta manuale** (`npx wrangler deploy`).

### Flusso `/nuovanota`

Chiede, uno alla volta:

1. **Testo** (obbligatorio) — tradotto in EN automaticamente alla pubblicazione
2. **Camera** (facoltativa, `/salta`)
3. **Foto**, link Cloudinary (facoltativa, `/salta`)
4. **Video**, link Cloudinary (facoltativa, `/salta`)

Al termine mostra "Bozza completata" con tastiera **[Pubblica / Salva in bozza]**. Alla pubblicazione scrive in `json/taccuino.json` una voce coerente con lo schema del sito (`testo {it,en}`, `data`, `foto`, `video`, `camera`).

### Altri flussi di creazione

`/nuovoprogetto`, `/nuovointervallo`, `/nuovapubblicazione`, `/nuovacollaborazione` guidano attraverso i propri campi (con `/salta` per i facoltativi) e producono una bozza. `/nuovointervallo` può generare il testo con l'AI rispondendo `genera`.

> ⚠️ **Da verificare prima di affidarcisi**: le funzioni di pubblicazione dei flussi diversi da `/nuovanota` scrivono campi che **non coincidono pienamente** con gli schemi letti da `libro.js` (vedi [content.md](content.md) e [projects.md](projects.md)).
> - `pubblicaProgetto()` scrive `copertina`, `layout`, `foto`, `about`, `ispirazione`, ma il sito legge `immagine_copertina`, `layoutType`, `contenuto`. Il valore `layout` proposto ("grid", "minimal"…) non è uno dei `layoutType` supportati.
> - `pubblicaCollaborazione()` scrive `collaboratore` e `foto` come **array**, ma il sito legge `titolo` e `foto` come **stringa singola** + `galleria`.
> - `pubblicaIntervallo()` scrive `testo` e `immagini`, ma il sito legge anche `titolo` e `descrizione`.
> - `pubblicaPubblicazione()` scrive `link` e `nome`, ma il sito legge `titolo`, `anno`, `immagine`.
>
> Solo `/nuovanota` è pienamente allineato. Per gli altri: verificare la resa dopo la pubblicazione, oppure allineare i campi scritti dal bot agli schemi del sito.

### Caption Instagram (`/post`, `/rigenera`)

`/post <id>` genera una didascalia IT+EN col modello AI, nel registro editoriale del sito (sobrio, senza emoji, senza linguaggio marketing). L'inglese è una riscrittura naturale, non una traduzione letterale. Se l'AI fallisce, il bot ripiega sul testo originale del progetto senza rielaborazione.

## Campi obbligatori per tipo (validati da `/pubblica`)

| Tipo | Campi obbligatori |
|---|---|
| `note` | `testo_it` |
| `project` | `titolo_it`, `anno`, `descrizione` |
| `interval` | `testo` |
| `publication` | `link` |
| `collaboration` | `collaboratore`, `anno` |

Se manca un campo obbligatorio, `/pubblica` rifiuta e suggerisce `/modifica <id>`.

## Sicurezza

- `TELEGRAM_ALLOWED_CHAT_ID`: chiunque altro scriva al bot riceve "Accesso non autorizzato".
- Il webhook verifica il `secret` nel query string (`TELEGRAM_WEBHOOK_SECRET`).
- `GITHUB_TOKEN`: Fine-grained, limitato al solo repo e al solo permesso Contents. Danno massimo = scrittura di file in questo repo.

## Setup (una tantum)

1. Crea il bot con [@BotFather](https://t.me/BotFather) (`/newbot`), copia il token.
2. Trova il tuo Chat ID con [@userinfobot](https://t.me/userinfobot).
3. Genera un webhook secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Crea un GitHub **Fine-grained PAT**: solo il repo `francescomartolini.art`, permesso Contents Read&Write.
5. Imposta i secret sul Worker (si applicano subito, senza redeploy):