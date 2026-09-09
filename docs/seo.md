# SEO

## Stato attuale

| Elemento | Dove | Stato |
|---|---|---|
| `<title>` | `index.html` (statico: "francescomartolini.art") + aggiornato via JS per pagina/progetto | ✅ dinamico via JS |
| `meta description` | `index.html` + versione EN via `meta.description` in `json/ui.json` (applicata da `i18n.js`) | ✅ |
| Open Graph | `og:title`/`og:description`/`og:type`/`og:url`/`og:image` statici in `index.html`; **per-progetto/sezione** riscritti a build time da `scripts/genera-route-statiche.py` (letti dal JSON, questo è ciò che vedono i crawler social — non eseguono JS); aggiornati anche a runtime via `js/i18n.js` (`window.aggiornaMetaSociale`) per la navigazione lato client, utile al rendering di Google ma non ai crawler social, che leggono solo la pagina statica | ✅ |
| `twitter:card` | statico in `index.html`, aggiornato a runtime insieme agli `og:*` | ✅ |
| `robots.txt` | root → `Sitemap: https://francescomartolini.art/sitemap.xml` | ✅ |
| `sitemap.xml` | generata a ogni build da `scripts/genera-sitemap.py` (costante `DOMINIO` nello script) | ✅ |
| canonical / hreflang | iniettati/aggiornati a runtime da `js/i18n.js` (`?lang=it`/`?lang=en` come varianti dichiarate, `x-default` sull'URL senza parametro); fallback statico in `index.html` per crawler senza JS | ✅ |
| structured data (JSON-LD) | `Person` + `WebSite` statici in `index.html`; `CreativeWork` per progetto/nota aperti, iniettato a runtime da `js/i18n.js` (`window.aggiornaJsonLdProgetto`) — Google esegue JS prima di leggere i dati strutturati, quindi qui funziona per davvero (diverso dagli `og:*` per i social, vedi sopra) | ✅ |
| feed RSS | 4 `<link rel="alternate">` in `index.html` | ✅ |

## Sitemap: regole di inclusione

Home, Chi sono, Fotografie Commerciali, Intervalli, Taccuino, Playlist + ogni progetto con `pubblicato !== false`. Restano fuori: indice "tutti i progetti" e nota "come funziona" (non hanno URL proprio).

> Nota: `genera-sitemap.py` scrive gli URL delle sezioni senza slash finale (`/chi-sono`), mentre `genera-route-statiche.py` genera la cartella con lo slash (`/chi-sono/` come `og:url` auto-riferito nella pagina stessa). Piccola incongruenza preesistente, non affrontata qui: in pratica non risulta un problema (i server serial­izzano comunque `index.html` in entrambi i casi), ma se un giorno emergesse un problema di indicizzazione doppia è il primo punto da controllare.

## Anteprime di condivisione

WhatsApp/iMessage/Telegram/Facebook non eseguono JavaScript: leggono solo l'HTML statico ricevuto alla prima richiesta. Per questo l'anteprima **per-progetto** funziona già, ma non tramite il JS di `i18n.js` (che serve solo al rendering di Google e alla navigazione lato client) — funziona perché `scripts/genera-route-statiche.py` genera una pagina fisica reale per ogni progetto/sezione con URL dedicato (`progetti/<id>/index.html`, ecc.), con `og:title`/`og:description`/`og:url`/`og:image` già riscritti per quel contenuto specifico, letti da `progetti.json`. Va eseguito a ogni build (lo fa già `scripts/prepara-deploy.sh`).

## Dove modificare

- Meta/OG/canonical/hreflang/JSON-LD statici (fallback per crawler senza JS) → `index.html` `<head>`.
- Meta/OG/canonical/hreflang/JSON-LD dinamici (per la navigazione lato client) → `js/i18n.js` (`aggiornaTagLingua`, `aggiornaMetaSociale`, `aggiornaJsonLdProgetto`), chiamati da `js/libro-routing.js` nei punti apri*/chiudi* di progetto e Taccuino.
- Meta/OG **per-progetto lato build** (quello che vedono davvero i crawler social) → `scripts/genera-route-statiche.py`.
- Description EN → `json/ui.json` → `meta.description`.
- Dominio sitemap → costante `DOMINIO` in `scripts/genera-sitemap.py`.
- Titoli di pagina → `apriPagina()`/`apriProgetto()` in `js/libro-routing.js`.

## Indicazioni per i contenuti

- `id` dei progetti = slug URL: sceglierli leggibili e stabili (cambiarli rompe i link già condivisi).
- `descrizione` breve (2-3 righe): è il testo più visibile nei contesti elenco.