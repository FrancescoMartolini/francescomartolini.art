#!/usr/bin/env bash
# Prepara il sito per il deploy: rigenera sitemap, feed RSS e le pagine
# statiche per progetti/sezioni (vedi genera-*.py), poi minifica JS e CSS
# sovrascrivendo js/libro-*.js e css/stile.css IN PLACE, con gli stessi nomi
# che index.html carica sia in locale che in produzione — così non c'è
# nessuna differenza da gestire tra i due ambienti (vedi README, sezione
# "Script da inserire nel builder di Cloudflare").
#
# IMPORTANTE: questo script sovrascrive i sorgenti (js/libro-*.js,
# css/stile.css) con la versione minificata. Va eseguito SOLO sul builder
# Cloudflare, che gira su un checkout temporaneo creato e scartato a ogni
# deploy — MAI a mano dalla propria cartella locale: sovrascriverebbe i
# sorgenti veri che stai editando. Per testare in locale usa invece
# genera-route-statiche.py + serve-locale.py (vedi README).
#
# Uso (nel campo "Build command" del builder Cloudflare):
#   bash scripts/prepara-deploy.sh
set -e

python3 scripts/genera-sitemap.py
python3 scripts/genera-feed-rss.py
python3 scripts/genera-route-statiche.py

# Minifica su un file temporaneo, poi lo sposta sopra il sorgente:
# terser/clean-css non scrivono in modo affidabile sullo stesso file
# che stanno leggendo, quindi serve il passaggio intermedio + mv.
# libro.js è diviso in più file caricati in sequenza da index.html
# (vedi docs/architecture.md); ognuno va minificato singolarmente,
# SENZA unirli, per mantenere lo stesso ordine di caricamento.
for f in js/libro-nucleo.js js/libro-dom-mobile.js js/libro-dom-desktop.js js/libro-routing.js js/libro-interazioni.js js/libro-app.js; do
  npx --yes terser "$f" -c -m -o "$f.min"
  mv "$f.min" "$f"
done

npx --yes clean-css-cli -o css/stile.css.min css/stile.css
mv css/stile.css.min css/stile.css

echo "Pronto per il deploy: sitemap, feed, pagine statiche e minificazione completati."
