#!/usr/bin/env python3
"""
Genera una pagina fisica reale per ogni URL "parlante" (progetti + le 4
sezioni con URL dedicato), scrivendo una copia di index.html in una
sottocartella, con i meta tag og: riscritti per quella pagina specifica:

    progetti/<id>/index.html
    chi-sono/index.html
    fotografie-commerciali/index.html
    intervalli/index.html
    taccuino/index.html

Perché serve la pagina fisica: senza questo, quell'URL esiste solo
"virtualmente" — il server risponde 404 e un piccolo script in 404.html
rimanda alla home vera. Ma alcuni browser (Edge, Chrome) sostituiscono
le risposte 404 troppo "leggere" con una loro pagina di errore generica,
ignorando lo script — quindi il redirect non parte mai (vedi discussione
nel README, sezione URL PARLANTI).

Con una cartella e un index.html reali, il server risponde 200 OK: il
browser non interviene, e il contenuto (che è lo stesso index.html di
sempre) si accorge da solo, leggendo l'URL, di quale pagina aprire —
identico a quello che già fa oggi (leggiRoute() in js/libro.js).

Perché serve riscrivere i meta og: qui: i crawler dei social (WhatsApp,
Telegram, Facebook, ecc.) NON eseguono js/libro.js — leggono solo l'HTML
statico ricevuto alla prima richiesta. Se quell'HTML è sempre lo stesso
index.html con i tag og: fissi in testa, condividendo il link di un
progetto specifico l'anteprima mostra sempre titolo/immagine del sito
intero, mai quelli del progetto. Dato che qui generiamo comunque un
index.html reale e distinto per ogni pagina, ne approfittiamo per
sostituire in quella copia i tag og:title / og:description / og:image /
og:url con i valori specifici — usando gli stessi campi (titolo,
descrizione, immagine_copertina) già presenti in progetti.json.

Uso (da qualunque cartella ci si trovi, va bene comunque):
    python3 scripts/genera-route-statiche.py
Va eseguito ogni volta che si aggiunge/rimuove un progetto — oppure,
meglio, lasciare che lo faccia in automatico il workflow di deploy
(vedi .github/workflows/static.yml). Le cartelle generate NON vanno
committate: si ricreano a ogni deploy.
"""
import json
import os
import re

DOMINIO = "https://francescomartolini.art"  # stesso valore di genera-sitemap.py
CARTELLA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # root del repo, uno sopra scripts/
INDEX = os.path.join(CARTELLA, "index.html")

# Stesse sezioni di SEZIONI_URL in js/libro.js e SEZIONI in genera-sitemap.py.
# Per ognuna, titolo e descrizione da usare nell'anteprima social (i testi
# restano in italiano: è la lingua di default con cui rispondono i crawler,
# che non eseguono js/libro.js e quindi non possono scegliere la lingua).
SEZIONI = {
    "chi-sono": (
        "Chi sono",
        "Biografia e visione personale di Francesco Martolini.",
    ),
    "fotografie-commerciali": (
        "Fotografie commerciali",
        "Un piccolo archivio curato di lavori fotografici commerciali.",
    ),
    "intervalli": (
        "Intervalli",
        "Street photography, provini a contatto, appunti visivi tra un progetto e l'altro.",
    ),
    "taccuino": (
        "Taccuino",
        "Pensieri, appunti, frammenti e domande — non un blog, un taccuino.",
    ),
    "playlist": (
        "Playlist",
        "Playlist.01 e Playlist.02 — capitoli in corso della ricerca su Time.",
    ),
}

DESCRIZIONE_DEFAULT = "Il tempo lascia tracce. Io le cerco."


def progetti_pubblicati():
    with open(os.path.join(CARTELLA, "json", "progetti.json"), encoding="utf-8") as f:
        dati = json.load(f)
    return [p for p in dati if p.get("pubblicato") is not False]


def _sostituisci_meta(nome_o_proprieta, chiave, valore, html):
    """Sostituisce il content del tag <meta name/property="chiave" ...>.
    Se il tag non esiste ancora nell'HTML sorgente (es. og:image, og:url,
    che oggi non ci sono), lo aggiunge subito prima di </head>."""
    valore = valore.replace('"', "&quot;")
    pattern = rf'(<meta {nome_o_proprieta}="{re.escape(chiave)}" content=")[^"]*(")'
    if re.search(pattern, html):
        return re.sub(pattern, rf"\1{valore}\2", html)
    tag = f'  <meta {nome_o_proprieta}="{chiave}" content="{valore}">\n'
    return html.replace("</head>", tag + "</head>")


def html_personalizzato(titolo, descrizione, immagine, url):
    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    titolo_pagina = f"{titolo} — francescomartolini.art"
    html = re.sub(r"<title>[^<]*</title>", f"<title>{titolo_pagina}</title>", html)
    html = _sostituisci_meta("name", "description", descrizione, html)
    html = _sostituisci_meta("property", "og:title", titolo_pagina, html)
    html = _sostituisci_meta("property", "og:description", descrizione, html)
    html = _sostituisci_meta("property", "og:url", url, html)
    if immagine:
        html = _sostituisci_meta("property", "og:image", immagine, html)
    return html


def _testo_it(campo, default=""):
    """Alcuni progetti hanno titolo/descrizione come stringa semplice invece
    che come {"it": ..., "en": ...} — supporta entrambe le forme."""
    if isinstance(campo, dict):
        return campo.get("it", default)
    if isinstance(campo, str) and campo:
        return campo
    return default


def crea_pagina(percorso_relativo, titolo, descrizione, immagine=None):
    cartella_dest = os.path.join(CARTELLA, percorso_relativo)
    os.makedirs(cartella_dest, exist_ok=True)
    url = f"{DOMINIO}/{percorso_relativo}/"
    html = html_personalizzato(titolo, descrizione, immagine, url)
    with open(os.path.join(cartella_dest, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


def genera():
    for slug, (titolo, descrizione) in SEZIONI.items():
        crea_pagina(slug, titolo, descrizione)
    for pr in progetti_pubblicati():
        titolo = _testo_it(pr.get("titolo"), "Progetto")
        descrizione = _testo_it(pr.get("descrizione"), DESCRIZIONE_DEFAULT)
        immagine = pr.get("immagine_copertina")
        crea_pagina(os.path.join("progetti", pr["id"]), titolo, descrizione, immagine)
    totale = len(SEZIONI) + len(progetti_pubblicati())
    print(f"Generate {totale} pagine statiche (progetti + sezioni), con meta og: personalizzati")


if __name__ == "__main__":
    genera()
