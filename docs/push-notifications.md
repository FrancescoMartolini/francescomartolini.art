# Notifiche push

> **Stato: in pausa.** L'infrastruttura è completa ma l'opt-in è disattivato.

## Come funziona (quando attivo)

1. Invito all'iscrizione in fondo al libro mobile (pagina "fin.") — testi in `notifiche.*` in `json/ui.json`, logica in `js/push.js`. L'equivalente desktop nel footer esiste nel markup ma è commentato.
2. Il consenso genera una subscription del browser → `POST /subscribe` → salvata nella KV `PUSH_SUBS` da `worker/index.js`.
3. Quando `json/progetti.json` o `json/taccuino.json` cambiano su `main`, il workflow `.github/workflows/notifica-nuovi-contenuti.yml` diffa le versioni (`scripts/notifica-nuovi-contenuti.py`) e chiama `POST /notify` per ogni voce nuova.
4. `worker/index.js` legge le subscription dalla KV e invia le push con `webpush-webcrypto` (nativo del runtime Workers, niente `nodejs_compat`).
5. `service-worker.js` mostra la notifica (`silent: true`, niente badge) e gestisce il click (focus/apertura URL).

## Stato attuale e riattivazione

| Punto | Stato | Per riattivare |
|---|---|---|
| `js/push.js` | `var ATTIVO = false;` + `VAPID_PUBLIC_KEY` placeholder | `ATTIVO = true` + chiave pubblica reale |
| workflow | solo `workflow_dispatch` (manuale dalla tab Actions) | ripristinare il blocco `on: push` commentato in testa al file |

## Setup (una tantum, già eseguito la prima volta)

1. `npm install && node scripts/genera-chiavi-vapid.mjs` → salvare `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (la privata mai nel repo).
2. Secret `/notify`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. `VAPID_PUBLIC_KEY` in `js/push.js` (unica chiave ammessa nel codice pubblico).
4. KV: `npx wrangler kv namespace create PUSH_SUBS` → id in `wrangler.toml` (non segreto).
5. Cloudflare dashboard → Variables and Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (Secret), `VAPID_CONTACT_EMAIL`, `NOTIFY_SECRET` (Secret). Questi sopravvivono ai deploy (wrangler gestisce solo quanto dichiarato in `wrangler.toml`).
6. Verificare `name` in `wrangler.toml`.
7. GitHub → Settings → Secrets → Actions: `NOTIFY_SECRET`.
8. Un commit su `main` installa `webpush-webcrypto` e completa il setup.

## Note editoriali

- Notifiche silenziose, coerenti col registro del libro.
- Per notificare solo i Progetti: rimuovere `json/taccuino.json` dai `paths` del workflow.
- Test completo in locale: `npx wrangler dev`.