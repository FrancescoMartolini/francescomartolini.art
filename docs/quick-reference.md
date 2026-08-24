# Quick reference — "Voglio fare X, dove metto le mani?"

| Voglio… | File / punto di partenza | Guida |
|---|---|---|
| Aggiungere un progetto fotografico | `json/progetti.json` | [projects.md](projects.md) |
| Mettere un progetto "in lavorazione" | `"pubblicato": false` in `json/progetti.json` | [projects.md](projects.md) |
| Cambiare layout di un progetto | campo `layoutType` in `json/progetti.json` | [projects.md](projects.md#layout) |
| Cambiare colori di un progetto | campo `theme` in `json/progetti.json` | [projects.md](projects.md#tema) |
| Aggiungere mappa / Spotify / video embed a un progetto | blocchi `contenuto[]` | [projects.md](projects.md#blocchi) |
| Aggiungere un volume della collana PLAYLIST | `json/progetti.json` con `id: "PLAYLIST.NN"` | [projects.md](projects.md#playlist) |
| Scrivere una nota del Taccuino | bot Telegram `/nuovanota` oppure `json/taccuino.json` | [taccuino.md](taccuino.md) |
| Aggiungere una sequenza Intervalli | `json/intervalli.json` | [content.md](content.md) |
| Aggiungere un lavoro commerciale | `json/collaborazioni.json` | [content.md](content.md) |
| Aggiungere una pubblicazione/press | `json/pubblicazioni.json` | [content.md](content.md) |
| Cambiare il testo dell'introduzione | `json/intro.json` | [content.md](content.md) |
| Cambiare testi di menu/bottoni/footer/popup | `json/ui.json` | [i18n.md](i18n.md) |
| Cambiare il titolo/hero della home | `index.html` → `#home` (mobile) e `.desktop-hero` | [architecture.md](architecture.md) |
| Inserire i video dell'intro cinematografica della Home | `js/intro-video.js` → `INTRO_VIDEO_LANDSCAPE`/`INTRO_VIDEO_PORTRAIT` | [intro-video.md](intro-video.md) |
| Cambiare i contatti | `index.html` → `#chi-sono` e `apriPagina('chi-sono-pagina')` in `js/libro.js` | — |
| Cambiare colori globali | `css/stile.css` → `:root` | [typography.md](typography.md) |
| Cambiare un font | `index.html` → `<head>` + variabili in `css/stile.css` | [typography.md](typography.md) |
| Cambiare un'animazione/transizione | `css/stile.css` + funzioni in `js/libro.js` | [animations.md](animations.md) |
| Aggiungere una voce al menu desktop | `index.html` → `.menu-voci` + chiave in `json/ui.json` | [navigation.md](navigation.md) |
| Aggiungere una pagina con URL proprio | `SEZIONI_URL` in `js/libro.js` + `scripts/genera-route-statiche.py` + `scripts/genera-sitemap.py` | [navigation.md](navigation.md) |
| Cambiare le immagini (caricamento/trasformazioni) | Cloudinary | [images.md](images.md) |
| Modificare SEO/meta | `index.html` → `<head>` + `meta.description` in `json/ui.json` | [seo.md](seo.md) |
| Cambiare cosa gira in fase di build | `scripts/prepara-deploy.sh` | [deployment.md](deployment.md) |
| Pubblicare il sito | `npx wrangler deploy` | [deployment.md](deployment.md) |
| Comandi del bot Telegram | — | [telegram-bot.md](telegram-bot.md) |
| Riattivare le notifiche push | `js/push.js` + workflow | [push-notifications.md](push-notifications.md) |
| Feed RSS | `scripts/genera-feed-rss.py`, popup in `js/rss-modal.js` | [rss.md](rss.md) |
| Risolvere un problema | [troubleshooting.md](troubleshooting.md) | — |