# Francesco Martolini .art

Portfolio personale di Francesco Martolini — fotografo e autore contemporaneo.
Non un portfolio tradizionale: un **libro digitale** dedicato al tema del tempo.

> *Il tempo lascia tracce. Io le cerco.*

## Com'è fatto

- **Sito statico senza framework**: un solo `index.html`, vanilla JS (`js/libro.js` è il motore), CSS proprio. Zero librerie esterne oltre ai Google Fonts.
- **Due esperienze in un solo sito**: mobile = libro a pagine da sfogliare (≤768px) · desktop = archivio editoriale a scroll con overlay per i progetti.
- **Contenuti interamente in JSON** (`json/`), caricati a runtime via `fetch`.
- **Generazione a build**: sitemap, feed RSS e pagine statiche degli URL profondi sono creati da script Python durante il deploy.
- **Hosting**: Cloudflare **Worker** (`wrangler.toml` + `worker/index.js`) con asset statici, dominio `francescomartolini.art`. Deploy **manuale**: `npx wrangler deploy`.
- **Extra**: bot Telegram per gestire i contenuti dal telefono, feed RSS, notifiche push (attualmente in pausa), bilingue IT/EN.

## Avvio rapido

```bash
# Server locale (file:// NON funziona: i fetch dei JSON vengono bloccati)
python3 scripts/serve-locale.py
# → http://localhost:8000/

# Per provare i link diretti (/progetti/<id>, /chi-sono, ...) genera prima le pagine statiche:
python3 scripts/genera-route-statiche.py

# Pubblicare
npx wrangler deploy
```

## Dove modifico…?

| Voglio… | Vado in |
|---|---|
| Aggiungere/modificare un progetto | `json/progetti.json` → [docs/projects.md](docs/projects.md) |
| Scrivere una nota del Taccuino | Bot Telegram `/nuovanota` o `json/taccuino.json` → [docs/taccuino.md](docs/taccuino.md) |
| Cambiare testi di interfaccia (menu, bottoni…) | `json/ui.json` → [docs/i18n.md](docs/i18n.md) |
| Cambiare stile/animazioni | `css/stile.css` → [docs/animations.md](docs/animations.md) |
| Cambiare navigazione/URL | [docs/navigation.md](docs/navigation.md) |
| Pubblicare il sito | [docs/deployment.md](docs/deployment.md) |

**Mappa completa: [docs/quick-reference.md](docs/quick-reference.md)**

## Documentazione

| File | Contenuto |
|---|---|
| [quick-reference](docs/quick-reference.md) | "Voglio fare X → vado in Y" |
| [ai-context](docs/ai-context.md) | Mappa del progetto per coding agent (Claude Code ecc.) |
| [architecture](docs/architecture.md) | Architettura e flussi dati |
| [project-structure](docs/project-structure.md) | Struttura cartelle annotata |
| [getting-started](docs/getting-started.md) | Sviluppo locale |
| [content](docs/content.md) | Sistema dati JSON |
| [projects](docs/projects.md) | Aggiungere progetti: schema, blocchi, layout, temi, PLAYLIST |
| [taccuino](docs/taccuino.md) | Taccuino e scrittura via bot |
| [images](docs/images.md) | Immagini e video (Cloudinary) |
| [typography](docs/typography.md) | Font |
| [animations](docs/animations.md) | Animazioni e transizioni |
| [navigation](docs/navigation.md) | Menu, overlay, URL parlanti, libro mobile |
| [responsive](docs/responsive.md) | Le due esperienze |
| [i18n](docs/i18n.md) | Bilingue IT/EN |
| [seo](docs/seo.md) · [accessibility](docs/accessibility.md) · [performance](docs/performance.md) | Qualità del sito |
| [deployment](docs/deployment.md) | Build e pubblicazione su Cloudflare |
| [telegram-bot](docs/telegram-bot.md) · [push-notifications](docs/push-notifications.md) · [rss](docs/rss.md) | Servizi |
| [troubleshooting](docs/troubleshooting.md) | Problemi comuni |
| [conventions](docs/conventions.md) | Convenzioni di sviluppo |
| [changelog](docs/changelog.md) | Storico |

## Stato dei sistemi

| Sistema | Stato |
|---|---|
| Sito (mobile + desktop) | ✅ Attivo |
| Bot Telegram | ✅ Attivo |
| Feed RSS | ✅ Attivi (generati a ogni build) |
| Notifiche push | ⏸️ In pausa ([dettagli](docs/push-notifications.md)) |
| Sync Taccuino da Google Sheets | ⏸️ Disattivata, codice conservato ([dettagli](docs/taccuino.md)) |
| Deploy GitHub Pages | ⏸️ Disattivato, workflow conservato |
| Tema chiaro/scuro | 🔧 Codice presente, stato da verificare (`avviaTema()` in `libro.js`) |