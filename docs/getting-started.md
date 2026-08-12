# Getting started — sviluppo locale

## Prerequisiti

| Cosa | Quando serve |
|---|---|
| Python 3 | sempre (server locale, script di generazione) |
| Node.js ≥ 18 | solo per Worker/push: `npx wrangler …`, chiavi VAPID |
| Nessun `npm install` per il sito | il frontend non ha dipendenze |

`npm install` (root) serve soltanto se lavori sul Worker: installa `webpush-webcrypto`.

## Lavorare sul sito

```bash
git clone https://github.com/FrancescoMartolini/francescomartolini.art.git
cd francescomartolini.art

python3 scripts/serve-locale.py
# → http://localhost:8000/
```

**Aprire `index.html` col doppio click non funziona**: su protocollo `file://` i browser bloccano i `fetch()` dei JSON. Serve sempre un server HTTP.

### Testare gli URL profondi in locale

I link diretti (`/progetti/<id>`, `/chi-sono`, …) esistono perché a build vengono generate pagine fisiche. In locale vanno generate prima:

```bash
python3 scripts/genera-route-statiche.py
python3 scripts/serve-locale.py
```

Verifica:
- `http://localhost:8000/progetti/<id>` si apre sul progetto giusto e la barra torna a mostrare solo la radice;
- idem per `/chi-sono`, `/fotografie-commerciali`, `/intervalli`, `/taccuino`;
- un URL inesistente cade su `404.html` → redirect alla home (`serve-locale.py` include il fallback).

## Rigenerare artefatti in locale (facoltativo)

```bash
python3 scripts/genera-sitemap.py     # sitemap.xml
python3 scripts/genera-feed-rss.py    # 4 feed RSS
```

Non serve farlo prima di ogni push: la build di deploy li rigenera.

## Lavorare sul Worker (bot/push)

```bash
npm install          # webpush-webcrypto
npx wrangler dev     # Worker in locale con KV reale (legge wrangler.toml)
npx wrangler deploy  # pubblica
```

## Variabili d'ambiente / secret

Il **sito** non ha variabili d'ambiente. I secret riguardano solo il Worker e vivono su Cloudflare/GitHub, non nel repo:

| Secret | Dove | Guida |
|---|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`, `NOTIFY_SECRET` | Cloudflare (Variables and Secrets) | [push-notifications.md](push-notifications.md) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID`, `GITHUB_TOKEN` | Cloudflare, via `npx wrangler secret put` | [telegram-bot.md](telegram-bot.md) |
| `NOTIFY_SECRET` | GitHub → Settings → Secrets (Actions) | [push-notifications.md](push-notifications.md) |

## Checklist di test prima di pubblicare

1. Mobile (≤768px): sfoglio, indice, apertura progetto, taccuino.
2. Desktop: slider, overlay, un progetto per layout diverso se possibile.
3. Lingua EN (toggle in header / fondo pagina mobile).
4. Un URL diretto generato.
5. Console browser pulita (soprattutto dopo modifiche ai JSON).