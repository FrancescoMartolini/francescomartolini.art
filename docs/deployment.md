# Pubblicazione (deploy)

## Flusso

```text
Locale ──→ git commit + push (main) ──→ GitHub
                                          │  (nessun deploy automatico!)
                          npx wrangler deploy (manuale)
                                          ↓
                          Cloudflare build: bash scripts/prepara-deploy.sh
                          (sitemap + feed RSS + pagine statiche + minificazione)
                                          ↓
                          Cloudflare Worker "francescomartoliniart"
                          (worker/index.js + asset statici)
                                          ↓
                          https://francescomartolini.art
```

**Differenza chiave rispetto al passato (GitHub Pages)**: il deploy **non è automatico**. Dopo ogni push da rendere live va eseguito `npx wrangler deploy`.

## `wrangler.toml` — fonte di verità

| Voce | Valore | Note |
|---|---|---|
| `name` | `francescomartoliniart` | deve coincidere col progetto in dashboard, altrimenti il deploy fallisce ("Missing entry-point…") |
| `main` | `worker/index.js` | entry point del Worker |
| `[assets]` | `directory="."`, `binding="ASSETS"`, `not_found_handling="404-page"` | gli asset sono serviti direttamente; il 404 serve al fallback URL |
| `[[kv_namespaces]]` | `PUSH_SUBS` (id nel file) | iscrizioni push + stato bot |
| `[ai]` | binding `AI` | Workers AI per le caption del bot |
| `[[routes]]` | `francescomartolini.art`, `custom_domain=true` | **da mantenere**: senza, wrangler rimuove la route remota a ogni deploy e il sito torna su `*.workers.dev` |

## Build: `scripts/prepara-deploy.sh`

È il "Build command" di Cloudflare. Contiene, nell'ordine: generazione sitemap, feed RSS, pagine statiche e — ultimi — la **minificazione**.

**Minificazione**: minifica su file temporanei e li sposta *sopra* `js/libro.js`/`css/stile.css`. Sicuro perché la build gira su un checkout temporaneo. **Non eseguire mai questo script nella working copy locale**: sovrascriverebbe i sorgenti veri.

## `.assetsignore`

Esclude dalla pubblicazione: `worker/`, `scripts/`, `.github/`, `TEMPLATE/`, `node_modules/`, configurazioni e `README.md`. Modificarlo può esporre file riservati o appesantire il sito.

## Procedura di pubblicazione

```bash
# 1. sviluppare e testare in locale (getting-started.md)
git add … && git commit -m "…"
git push origin main

# 2. pubblicare
npx wrangler deploy
```

Il bot Telegram committa autonomamente su `main` (vedi [telegram-bot.md](telegram-bot.md)): quei commit seguono lo stesso flusso — il deploy resta manuale.

## Rollback

Non esiste un meccanismo dedicato: per tornare indietro, riportare `main` al commit precedente (`git revert`) e rilanciare `npx wrangler deploy`. I feed/sitemap/pagine statiche vengono rigenerati a ogni deploy, quindi si riallineano da soli.

## GitHub Pages (legacy)

`.github/workflows/static.yml` è disattivato. Il codice che gestiva il sottopercorso `github.io` (`BASE_PATH` in `libro.js`, `<base>` dinamico, redirect in `404.html`) è ancora presente e innocuo sul dominio attuale.

## Cache

Nessuna configurazione cache custom nel repo: vale la cache edge standard di Cloudflare sugli asset statici. Dopo un deploy, se una modifica non compare, verificare in finestra anonima prima di sospettare la cache.