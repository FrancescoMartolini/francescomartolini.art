#!/usr/bin/env python3
"""
Confronta la versione precedente e quella attuale di un file JSON
(progetti.json o taccuino.json) e stampa, una per riga, il payload
JSON della notifica push da inviare per ogni voce NUOVA (per id).

Uso:
    python3 scripts/notifica-nuovi-contenuti.py progetti json/progetti.json /tmp/vecchio-progetti.json
    python3 scripts/notifica-nuovi-contenuti.py taccuino json/taccuino.json /tmp/vecchio-taccuino.json

Se il file "vecchio" non esiste o non è JSON valido, lo script non
stampa nulla: evita di notificare in massa tutti i contenuti già
esistenti alla primissima esecuzione del workflow.

Usato da .github/workflows/notifica-nuovi-contenuti.yml
"""
import json
import re
import sys


def carica(path):
    try:
        with open(path, encoding="utf-8") as f:
            contenuto = f.read().strip()
        if not contenuto:
            return None
        return json.loads(contenuto)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def pulisci_html(testo):
    return re.sub(r"<[^>]+>", " ", testo or "").strip()


def accorcia(testo, n=120):
    testo = " ".join(testo.split())
    return testo if len(testo) <= n else testo[: n - 1].rstrip() + "…"


def main():
    if len(sys.argv) != 4:
        print("Uso: notifica-nuovi-contenuti.py <progetti|taccuino> <nuovo.json> <vecchio.json>", file=sys.stderr)
        sys.exit(1)

    tipo, path_nuovo, path_vecchio = sys.argv[1], sys.argv[2], sys.argv[3]

    nuovo = carica(path_nuovo)
    if nuovo is None:
        return

    vecchio = carica(path_vecchio)
    if vecchio is None:
        # Nessuna versione precedente leggibile (primo run, file appena
        # creato, o prima esecuzione del workflow): meglio non notificare
        # nulla piuttosto che notificare in massa tutti i contenuti esistenti.
        return

    id_precedenti = {str(voce.get("id")) for voce in vecchio}

    for voce in nuovo:
        id_voce = str(voce.get("id"))
        if id_voce in id_precedenti:
            continue

        if tipo == "progetti":
            titolo = (voce.get("titolo") or {}).get("it", "Nuovo progetto")
            descrizione = (voce.get("descrizione") or {}).get("it", "")
            corpo = titolo + (" — " + descrizione if descrizione else "")
            payload = {
                "title": "Nuovo capitolo",
                "body": accorcia(corpo),
                "url": "/progetti/" + str(voce.get("id", "")),
            }
        elif tipo == "taccuino":
            testo = pulisci_html((voce.get("testo") or {}).get("it", ""))
            payload = {
                "title": "Nuova voce nel Taccuino",
                "body": accorcia(testo),
                "url": "/taccuino",
            }
        else:
            continue

        print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
