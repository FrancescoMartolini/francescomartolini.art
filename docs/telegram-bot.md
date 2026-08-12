# Bot Telegram

Bot ospitato nello stesso Worker del sito (`worker/`), per gestire i contenuti dal telefono. La logica è **modulare**: `telegram.js` + `telegram-core.js` + moduli per ambito (`telegram-projects.js`, `telegram-notes.js`, `telegram-intervals.js`, `telegram-collaborations.js`, `telegram-publications.js`, `telegram-drafts.js`). In `worker/` esiste anche `guida-reset-bot-telegram.md` per le procedure di reset.

> ⚠️ I contenuti dei moduli non sono stati analizzati direttamente (dump troncato). I comandi documentati qui sotto sono quelli del README v8.0; la presenza dei moduli aggiuntivi (intervalli, collaborazioni, pubblicazioni, bozze) indica funzionalità più ampie: verificare nei file per l'elenco completo.

## Comandi documentati

| Comando | Cosa fa |
|---|---|
| `/start` | benvenuto + elenco comandi |
| `/lista` | progetti con il loro `id` |
| `/post <id>` | caption Instagram IT+EN generata con AI (tono editoriale, niente emoji) |
| `/rigenera <id>` | rigenera la caption |
| `/nuovanota` | flusso guidato nuova voce Taccuino (testo IT → EN → data → foto → video → camera → riepilogo → CONFERMA) |
| `/annulla` | interrompe `/nuovanota` senza salvare |

`/nuovanota`: lo stato della conversazione vive nella KV `PUSH_SUBS` con scadenza di 30 minuti. Alla conferma, il bot legge `json/taccuino.json` da GitHub, aggiunge la voce col prossimo `id` libero e committa via API Contents — il commit appare su `main` come un push normale (il deploy resta manuale).

## Setup (una tantum)

1. Creare il bot con [@BotFather](https://t.me/BotFather) (`/newbot`) → token.
2. Recuperare il proprio Chat ID con [@userinfobot](https://t.me/userinfobot).
3. Generare un webhook secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. GitHub **Fine-grained PAT** ([settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)): solo il repo `francescomartolini.art`, permesso Contents Read&Write.
5. Secret sul Worker (da terminale, si applicano subito senza redeploy):
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
   npx wrangler secret put TELEGRAM_ALLOWED_CHAT_ID
   npx wrangler secret put GITHUB_TOKEN
   ```
6. Verificare il binding `[ai]` in `wrangler.toml` (usato da `/post` e `/rigenera` con modello Workers AI).
7. Registrare il webhook:
   ```text
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://francescomartolini.art/telegram/webhook?secret=<SECRET>&allowed_updates=["message"]
   ```
8. Inviare `/start` per verifica.

## Sicurezza

- `TELEGRAM_ALLOWED_CHAT_ID`: chiunque altro scriva al bot riceve accesso negato.
- `GITHUB_TOKEN`: limitato al solo repo e al solo permesso Contents — danno massimo = scrittura di file in questo repo.
- Il webhook verifica il `secret` nel query string.