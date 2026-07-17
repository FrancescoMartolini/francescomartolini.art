#!/usr/bin/env python3
"""
Genera una pagina fisica reale per ogni URL "parlante" (progetti + le 4
sezioni con URL dedicato), copiando index.html in una sottocartella:

    progetti/<id>/index.html
    chi-sono/index.html
    fotografie-commerciali/index.html
    intervalli/index.html
    taccuino/index.html

Perché serve: senza questo, quell'URL esiste solo "virtualmente" — il
server risponde 404 e un piccolo script in 404.html rimanda alla home
vera. Ma alcuni browser (Edge, Chrome) sostituiscono le risposte 404
troppo "leggere" con una loro pagina di errore generica, ignorando lo
script — quindi il redirect non parte mai (vedi discussione nel README,
sezione URL PARLANTI).

Con una cartella e un index.html reali, il server risponde 200 OK: il
browser non interviene, e il contenuto (che è lo stesso index.html di
sempre) si accorge da solo, leggendo l'URL, di quale pagina aprire —
identico a quello che già fa oggi (leggiRoute() in js/libro.js). Non
serve nessuna modifica a index.html: funziona semplicemente perché è
raggiungibile a un URL più profondo.

Uso:
    python3 genera-route-statiche.py
Va eseguito ogni volta che si aggiunge/rimuove un progetto — oppure,
meglio, lasciare che lo faccia in automatico il workflow di deploy
(vedi .github/workflows/static.yml). Le cartelle generate NON vanno
committate: si ricreano a ogni deploy.
"""
import json
import os
import shutil

CARTELLA = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(CARTELLA, "index.html")

# Stesse sezioni di SEZIONI_URL in js/libro.js e SEZIONI in genera-sitemap.py
SEZIONI = ["chi-sono", "fotografie-commerciali", "intervalli", "taccuino"]


def progetti_pubblicati():
    with open(os.path.join(CARTELLA, "json", "progetti.json"), encoding="utf-8") as f:
        dati = json.load(f)
    return [p for p in dati if p.get("pubblicato") is not False]


def crea_pagina(percorso_relativo):
    cartella_dest = os.path.join(CARTELLA, percorso_relativo)
    os.makedirs(cartella_dest, exist_ok=True)
    shutil.copyfile(INDEX, os.path.join(cartella_dest, "index.html"))


def genera():
    for slug in SEZIONI:
        crea_pagina(slug)
    for pr in progetti_pubblicati():
        crea_pagina(os.path.join("progetti", pr["id"]))
    totale = len(SEZIONI) + len(progetti_pubblicati())
    print(f"Generate {totale} pagine statiche (progetti + sezioni)")


if __name__ == "__main__":
    genera()
