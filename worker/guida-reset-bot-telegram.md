# Bot Telegram — Guida completa: reset e ripartenza pulita

Segui le fasi in ordine, senza saltarne nessuna. Ogni fase ha una verifica: non
passare alla successiva finché quella corrente non è confermata.

---

## FASE 0 — Pulizia di quello che c'è già

Serve a partire da uno stato pulito e conosciuto, senza residui che confondono.

### 0.1 Rimuovi il webhook esistente

Nel browser (sostituisci `<TOKEN>` col token attuale del bot):
```
https://api.telegram.org/bot<TOKEN>/deleteWebhook
```
Deve rispondere `{"ok":true,"result":true,...}`.

### 0.2 Rimuovi le tre variabili TELEGRAM_* dal dashboard Cloudflare

Dashboard → Workers & Pages → il tuo progetto → Settings → Variables and
Secrets → elimina (icona cestino) `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID`.

Le lasciamo fuori dal dashboard perché d'ora in poi le gestiamo solo da
terminale con Wrangler — è il metodo che si applica subito e senza ambiguità,
a differenza del form web che nel tuo caso non stava avendo effetto.

### 0.3 Rimuovi i secret aggiunti su GitHub (facoltativo ma consigliato)

Non servono a nulla per questo progetto (il deploy gira su Cloudflare
Workers Builds, non su GitHub Actions), quindi solo per ordine: Settings del
repository → Secrets and variables → Actions → elimina i tre `TELEGRAM_*`
se li avevi aggiunti lì.

### 0.4 Verifica lo stato pulito

```
curl.exe --ssl-no-revoke https://francescomartolini.art/debug-telegram
```

Devi vedere tutti e tre i `TELEGRAM_*_configurato` a `false`. Se è così,
sei ripartito da zero correttamente.

---

## FASE 1 — Creazione del bot Telegram

Se il bot che avevi creato in precedenza va bene, puoi saltare questa fase e
riusare lo stesso token — non serve ricrearlo da capo, salvo tu preferisca
un bot pulito.

1. Apri Telegram, cerca **@BotFather**
2. Manda `/newbot`
3. Scegli un nome visualizzato (es. "Francesco Martolini Art Bot")
4. Scegli uno username che termini con `_bot` (es. `fmartolini_art_bot`)
5. BotFather ti restituisce un **token**, formato tipo `123456789:AAExxxxxx...`
   — copialo e tienilo da parte, ti servirà nella Fase 3.

### 1.1 Trova il tuo Chat ID

1. Cerca **@userinfobot** su Telegram
2. Avvialo, ti risponde subito con il tuo **Id** numerico (es. `148877314`)
3. Tienilo da parte, ti servirà nella Fase 3.

---

## FASE 2 — Genera il webhook secret

Da PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
(se hai Node installato, cosa certa dato che usi `npx wrangler`). In
alternativa, se hai OpenSSL disponibile:
```powershell
openssl rand -hex 32
```

Copia la stringa di 64 caratteri esadecimali che ottieni — è il tuo
`TELEGRAM_WEBHOOK_SECRET`. Tienila da parte per la Fase 3.

---

## FASE 3 — Imposta le tre variabili su Cloudflare via Wrangler

Da PowerShell, nella cartella del progetto (dove c'è `wrangler.toml`):

```powershell
cd C:\workspace\francescomartolini.art
```

Se non hai mai fatto login con Wrangler su questo PC:
```powershell
npx wrangler login
```
Si apre il browser: fai login con lo stesso account del dashboard Cloudflare.

Poi, uno alla volta:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
```
→ quando chiede il valore, incolla il token di BotFather (Fase 1), Invio.

```powershell
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```
→ incolla la stringa generata nella Fase 2, Invio.

```powershell
npx wrangler secret put TELEGRAM_ALLOWED_CHAT_ID
```
→ incolla il tuo Chat ID numerico (Fase 1.1), Invio.

Questi comandi si applicano **subito** al Worker live, senza bisogno di un
nuovo deploy.

---

## FASE 4 — Verifica che le variabili siano attive

```powershell
curl.exe --ssl-no-revoke https://francescomartolini.art/debug-telegram
```

Controlla che sia tutto così:
```json
{
  "TELEGRAM_BOT_TOKEN_configurato": true,
  "TELEGRAM_WEBHOOK_SECRET_configurato": true,
  "TELEGRAM_WEBHOOK_SECRET_lunghezza": 64,
  "TELEGRAM_ALLOWED_CHAT_ID_configurato": true,
  "TELEGRAM_ALLOWED_CHAT_ID_lunghezza": 9,
  "AI_binding_configurato": true,
  "PUSH_SUBS_configurato": true
}
```

(la lunghezza del chat ID varia in base a quante cifre ha il tuo id — non
deve necessariamente essere 9, basta che non sia 0)

**Non proseguire alla Fase 5 finché questo non è tutto `true`.** Se resta
`false` dopo aver lanciato `wrangler secret put`, incolla qui l'output
esatto del comando e ci fermiamo a capire quello, prima di andare oltre.

---

## FASE 5 — Registra il webhook

Nel browser (sostituisci `<TOKEN>` e `<SECRET>` con gli stessi valori
appena impostati in Fase 3):
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://francescomartolini.art/telegram/webhook?secret=<SECRET>&allowed_updates=["message"]
```

Deve rispondere `{"ok":true,"result":true,"description":"Webhook was set"}`.

Poi verifica:
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

`last_error_message` deve essere assente (o comunque non più `403 Forbidden`
con una data recente).

---

## FASE 6 — Test finale

Su Telegram, apri una chat col tuo bot e manda:
```
/start
```

Deve risponderti con la lista comandi. Poi prova:
```
/lista
```
Deve mostrarti l'elenco progetti da `json/progetti.json`. Infine:
```
/post <id-di-un-progetto>
```
Deve generare la caption IT+EN con l'AI.

---

## FASE 7 — Pulizia finale (dopo che tutto funziona)

La rotta `/debug-telegram` espone informazioni utili solo a te, ma è
comunque pubblicamente raggiungibile da chiunque conosca l'URL — meglio
rimuoverla una volta che il bot è confermato funzionante, come da commento
che avevi già nel codice per `/debug-notify`.

Fammi sapere quando arrivi a questo punto e ti preparo l'ultimo patch per
toglierla in modo pulito.
