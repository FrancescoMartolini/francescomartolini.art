#!/usr/bin/env python3
"""
Genera sitemap.xml a partire da json/progetti.json.

Include solo le pagine con un URL reale e indicizzabile:
- la home
- ogni progetto pubblicato (stesso criterio usato da apriProgetto() in
  js/libro.js: escluso solo se pubblicato è esplicitamente false)

Le altre sezioni (Intervalli, Taccuino, Chi Sono, Fotografie Commerciali)
non hanno un URL dedicato — vivono come overlay sulla home — quindi non
compaiono come voci separate nella sitemap.

Dominio: francescomartolini.art (dominio finale). Se in futuro cambia,
basta aggiornare DOMINIO qui sotto.

Uso (da qualunque cartella ci si trovi, va bene comunque):
    python3 scripts/genera-sitemap.py
Rigenera sitemap.xml nella root del repo. Va eseguito ogni volta che si
aggiunge/rimuove un progetto — oppure, meglio, lasciare che lo faccia
in automatico il workflow di deploy (vedi .github/workflows/static.yml).
"""
import json
import os
import xml.etree.ElementTree as ET

DOMINIO = "https://francescomartolini.art"
# Root del repo: uno sopra questo script (che ora vive in scripts/)
CARTELLA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Sezioni con URL dedicato oltre ai progetti — stessi slug usati in
# SEZIONI_URL / leggiRoute() in js/libro.js. Escluse volutamente
# 'tutti-progetti' (indice, ridondante con la home) e 'come-funziona'
# (nota di supporto, non una pagina a sé).
SEZIONI = [
    "chi-sono",
    "fotografie-commerciali",
    "intervalli",
    "taccuino",
]


def progetti_pubblicati():
    with open(os.path.join(CARTELLA, "json", "progetti.json"), encoding="utf-8") as f:
        dati = json.load(f)
    return [p for p in dati if p.get("pubblicato") is not False]


def genera():
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    home = ET.SubElement(urlset, "url")
    ET.SubElement(home, "loc").text = f"{DOMINIO}/"
    ET.SubElement(home, "changefreq").text = "weekly"
    ET.SubElement(home, "priority").text = "1.0"

    for slug in SEZIONI:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{DOMINIO}/{slug}"
        ET.SubElement(url, "changefreq").text = "monthly"
        ET.SubElement(url, "priority").text = "0.6"

    for pr in progetti_pubblicati():
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{DOMINIO}/progetti/{pr['id']}"
        ET.SubElement(url, "changefreq").text = "monthly"
        ET.SubElement(url, "priority").text = "0.8"

    albero = ET.ElementTree(urlset)
    ET.indent(albero, space="  ")
    percorso_output = os.path.join(CARTELLA, "sitemap.xml")
    albero.write(percorso_output, encoding="utf-8", xml_declaration=True)
    totale = 1 + len(SEZIONI) + len(progetti_pubblicati())
    print(f"sitemap.xml generata con {totale} URL → {percorso_output}")


if __name__ == "__main__":
    genera()
