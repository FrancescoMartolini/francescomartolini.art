# SEO

## Stato attuale

| Elemento | Dove | Stato |
|---|---|---|
| `<title>` | `index.html` (statico: "francescomartolini.art") + aggiornato via JS per pagina/progetto | ✅ dinamico via JS |
| `meta description` | `index.html` + versione EN via `meta.description` in `json/ui.json` (applicata da `i18n.js`) | ✅ |
| Open Graph | `og:title`, `og:description`, `og:type` statici in `index.html` | ⚠️ uguali per tutto il sito |
| `og:image`, `og:url` | — | ❌ assenti |
| `robots.txt` | root → `Sitemap: https://francescomartolini.art/sitemap.xml` | ✅ |
| `sitemap.xml` | generata a ogni build da `scripts/genera-sitemap.py` (costante `DOMINIO` nello script) | ✅ |
| canonical / hreflang | — | ❌ assenti |
| structured data (JSON-LD) | — | ❌ assente |
| feed RSS | 4 `<link rel="alternate">` in `index.html` | ✅ |

## Sitemap: regole di inclusione

Home, Chi sono, Fotografie Commerciali, Intervalli, Taccuino, Playlist + ogni progetto con `pubblicato !== false`. Restano fuori: indice "tutti i progetti" e nota "come funziona" (non hanno URL proprio).

## Anteprime di condivisione (limite noto)

WhatsApp/iMessage/Telegram leggono gli `og:*` statici: il link apre il progetto giusto ma l'anteprima è generica. Anteprime per-progetto richiederebbero meta tag dedicati nelle pagine statiche generate — possibile evoluzione di `genera-route-statiche.py` (titolo/copertina del progetto già noti dal JSON).

## Dove modificare

- Meta/OG statici → `index.html` `<head>`.
- Description EN → `json/ui.json` → `meta.description`.
- Dominio sitemap → costante `DOMINIO` in `scripts/genera-sitemap.py`.
- Titoli di pagina → `apriPagina()`/`apriProgetto()` in `libro.js`.

## Indicazioni per i contenuti

- `id` dei progetti = slug URL: sceglierli leggibili e stabili (cambiarli rompe i link già condivisi).
- `descrizione` breve (2-3 righe): è il testo più visibile nei contesti elenco.