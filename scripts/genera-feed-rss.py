#!/usr/bin/env python3
"""
Genera TRE feed RSS 2.0 separati, uno per sezione:

    progetti/feedrss.xml   ← da json/progetti.json (solo pubblicato != false)
    taccuino/feedrss.xml   ← da json/taccuino.json (le più recenti)
    istanze/feedrss.xml    ← da json/intervalli.json
                              ("Istanze" è il nome pubblico attuale
                              della sezione — il file dati si chiama
                              ancora intervalli.json, solo l'etichetta
                              rivolta al visitatore è cambiata)

Le cartelle progetti/, taccuino/, istanze/ sono trattate come le altre
cartelle "generate" del sito (vedi genera-route-statiche.py e
.gitignore): NON vanno committate, si ricreano ad ogni build.

Uso:
    python3 scripts/genera-feed-rss.py
Va eseguito ad ogni build, insieme a genera-sitemap.py e
genera-route-statiche.py (vedi .github/workflows/static.yml e il
comando di build configurato su Cloudflare).
"""
import json
import os
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from xml.sax.saxutils import escape as escape_xml

DOMINIO = "https://francescomartolini.art"
CARTELLA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOCI_TACCUINO_MAX = 30

MESI_IT = [
    "", "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
]


def carica_json(nome_file):
    percorso = os.path.join(CARTELLA, "json", nome_file)
    with open(percorso, encoding="utf-8") as f:
        return json.load(f)


def testo_localizzato(valore, lingua="it", default=""):
    """I campi testuali di questi JSON a volte sono dizionari
    {"it": ..., "en": ...}, a volte semplici stringhe (inserite a mano
    nel tempo). Gestiamo entrambi i casi."""
    if isinstance(valore, dict):
        return valore.get(lingua) or valore.get("en") or default
    if isinstance(valore, str):
        return valore
    return default


def pulisci_html(testo):
    return (testo or "").replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ").strip()


def accorcia(testo, n=140):
    testo = " ".join(testo.split())
    return testo if len(testo) <= n else testo[: n - 1].rstrip() + "…"


def data_italiana(dt):
    return f"{dt.day} {MESI_IT[dt.month]} {dt.year}"


def data_con_fallback_anno(voce):
    """Usata per progetti/istanze: preferisce un campo "pubblicato_il"
    (facoltativo, "YYYY-MM-DD") esplicito; altrimenti prova a leggere
    un anno da "anno" (stringa, dizionario it/en, o intervallo tipo
    "2020 - ad oggi"); altrimenti una data di fallback fissa, così
    l'ordinamento resta comunque stabile."""
    esplicita = voce.get("pubblicato_il")
    if esplicita:
        try:
            return datetime.strptime(esplicita, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    anno = voce.get("anno")
    if isinstance(anno, dict):
        anno = anno.get("it") or anno.get("en") or ""
    match = re.search(r"\d{4}", str(anno or ""))
    if match:
        return datetime(int(match.group()), 1, 1, tzinfo=timezone.utc)

    return datetime(2000, 1, 1, tzinfo=timezone.utc)


def data_taccuino(voce):
    try:
        return datetime.strptime(voce["data"], "%Y-%m-%d").replace(hour=12, tzinfo=timezone.utc)
    except (KeyError, ValueError, TypeError):
        return datetime(2000, 1, 1, tzinfo=timezone.utc)


def costruisci_item(titolo, link, descrizione_html, dt, guid):
    return f"""    <item>
      <title>{escape_xml(titolo)}</title>
      <link>{escape_xml(link)}</link>
      <guid isPermaLink="false">{escape_xml(guid)}</guid>
      <pubDate>{format_datetime(dt)}</pubDate>
      <description><![CDATA[{descrizione_html}]]></description>
    </item>"""


def scrivi_feed(percorso_relativo, titolo_canale, descrizione_canale, url_self, items_ordinati):
    items_xml = "\n".join(item_xml for _, item_xml in items_ordinati)
    ora = datetime.now(timezone.utc)

    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{escape_xml(titolo_canale)}</title>
    <link>{DOMINIO}/</link>
    <atom:link href="{url_self}" rel="self" type="application/rss+xml" />
    <description>{escape_xml(descrizione_canale)}</description>
    <language>it</language>
    <lastBuildDate>{format_datetime(ora)}</lastBuildDate>
{items_xml}
  </channel>
</rss>
"""
    percorso_assoluto = os.path.join(CARTELLA, percorso_relativo)
    os.makedirs(os.path.dirname(percorso_assoluto), exist_ok=True)
    with open(percorso_assoluto, "w", encoding="utf-8") as f:
        f.write(feed)
    print(f"{percorso_relativo} generato con {len(items_ordinati)} voci")


def genera_feed_progetti():
    progetti = [p for p in carica_json("progetti.json") if p.get("pubblicato") is not False]

    voci = []
    for pr in progetti:
        titolo = testo_localizzato(pr.get("titolo"), default="Nuovo progetto")
        descrizione = testo_localizzato(pr.get("descrizione"))
        dt = data_con_fallback_anno(pr)
        link = f"{DOMINIO}/progetti/{pr.get('id', '')}"
        voci.append((dt, costruisci_item(
            titolo=titolo, link=link, descrizione_html=escape(descrizione),
            dt=dt, guid=f"progetto-{pr.get('id', '')}",
        )))

    voci.sort(key=lambda coppia: coppia[0], reverse=True)
    scrivi_feed(
        "progetti/feedrss.xml",
        "Francesco Martolini — Progetti",
        "I capitoli della ricerca fotografica su tempo, memoria, tracce.",
        f"{DOMINIO}/progetti/feedrss.xml",
        voci,
    )
    return voci


def genera_feed_taccuino():
    taccuino = sorted(carica_json("taccuino.json"), key=data_taccuino, reverse=True)

    voci = []
    for v in taccuino[:VOCI_TACCUINO_MAX]:
        dt = data_taccuino(v)
        testo_pulito = pulisci_html(testo_localizzato(v.get("testo")))
        titolo = f"Taccuino — {data_italiana(dt)}" if testo_pulito else "Taccuino"
        html_descrizione = testo_localizzato(v.get("testo"))
        voci.append((dt, costruisci_item(
            titolo=titolo, link=f"{DOMINIO}/taccuino", descrizione_html=html_descrizione,
            dt=dt, guid=f"taccuino-{v.get('id', '')}",
        )))

    scrivi_feed(
        "taccuino/feedrss.xml",
        "Francesco Martolini — Taccuino",
        "Pensieri, note, frammenti, osservazioni.",
        f"{DOMINIO}/taccuino/feedrss.xml",
        voci,
    )
    return voci


def genera_feed_istanze():
    # Nota: le singole voci di "Istanze" non hanno ancora una pagina
    # dedicata (stesso limite del Taccuino) — il sito le mostra tutte
    # dentro la sezione generica. Il percorso reale della sezione sul
    # sito è ancora /intervalli (solo l'etichetta pubblica è cambiata
    # in "Istanze"): il link nel feed punta lì, mentre il FILE del feed
    # vive comunque su /istanze/feedrss.xml come richiesto.
    istanze = [v for v in carica_json("intervalli.json") if v.get("pubblicato") is not False]

    voci = []
    for v in istanze:
        titolo = testo_localizzato(v.get("titolo"), default="Nuova istanza")
        descrizione = testo_localizzato(v.get("descrizione"))
        dt = data_con_fallback_anno(v)
        voci.append((dt, costruisci_item(
            titolo=titolo, link=f"{DOMINIO}/intervalli", descrizione_html=escape(descrizione),
            dt=dt, guid=f"istanza-{v.get('id', '')}",
        )))

    voci.sort(key=lambda coppia: coppia[0], reverse=True)
    scrivi_feed(
        "istanze/feedrss.xml",
        "Francesco Martolini — Istanze",
        "Fotografia di strada, provini, frammenti, intervalli tra un progetto e l'altro.",
        f"{DOMINIO}/istanze/feedrss.xml",
        voci,
    )
    return voci


def genera_feed_completo(voci_progetti, voci_taccuino, voci_istanze):
    """Feed unico con dentro tutto — Progetti + Taccuino + Istanze,
    in un solo ordine cronologico. Utile a chi vuole seguire tutto il
    sito con una sola iscrizione, invece di scegliere fra i tre."""
    tutte = voci_progetti + voci_taccuino + voci_istanze
    tutte.sort(key=lambda coppia: coppia[0], reverse=True)
    scrivi_feed(
        "feed.xml",
        "Francesco Martolini — francescomartolini.art",
        "Il tempo lascia tracce. Io le cerco. Progetti, Taccuino e Istanze insieme.",
        f"{DOMINIO}/feed.xml",
        tutte,
    )


def genera():
    voci_progetti = genera_feed_progetti()
    voci_taccuino = genera_feed_taccuino()
    voci_istanze = genera_feed_istanze()
    genera_feed_completo(voci_progetti, voci_taccuino, voci_istanze)


if __name__ == "__main__":
    genera()
