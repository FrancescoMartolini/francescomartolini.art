#!/usr/bin/env python3
"""
Confronta la versione precedente e quella attuale di json/taccuino.json,
individua le voci nuove (id mai visto prima) e per ciascuna genera un
testo pronto da incollare come caption su Instagram (Broadcast Channel),
inviandolo tramite il bot Telegram già usato per le altre notifiche.

Perché esiste come script separato da notifica-nuovi-contenuti.py:
quello script serve alle push notification del sito (payload title/body/url
per il service worker), questo serve a un pubblico diverso (una caption
editoriale pronta per i social) con un formato di testo completamente
diverso. Tenerli separati evita di far dipendere due usi diversi dallo
stesso formato di output.

Uso:
    python3 scripts/genera-caption-instagram.py json/taccuino.json /tmp/taccuino-precedente.json

Variabili d'ambiente richieste per l'invio:
    TELEGRAM_BOT_TOKEN
    TELEGRAM_CHAT_ID

Se mancano, lo script stampa comunque le caption generate su stdout ma
non tenta l'invio (utile per testare in locale senza secrets).

Non introduce nessuno stato aggiuntivo: il "vecchio" json passato come
argomento è responsabilità del chiamante (il workflow ne fa un backup
prima di eseguire sincronizza-taccuino.py). Nessun file di "ultimo id
notificato" da mantenere: json/taccuino.json committato nel repo È
già quella memoria.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SITO_URL_BASE = "https://francescomartolini.art/taccuino"


def carica(path):
    try:
        with open(path, encoding="utf-8") as f:
            contenuto = f.read().strip()
        if not contenuto:
            return []
        dati = json.loads(contenuto)
        return dati if isinstance(dati, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def testo_it(voce):
    """testo può essere una stringa semplice o {it, en}: normalizza a stringa IT."""
    testo = voce.get("testo")
    if isinstance(testo, dict):
        return testo.get("it", "") or ""
    return testo or ""


def pulisci(testo):
    """Rimuove tag HTML (<br> ecc.) e normalizza gli spazi, mantenendo gli
    a-capo dove c'era un <br>, per una caption leggibile."""
    testo = re.sub(r"<br\s*/?>", "\n", testo, flags=re.IGNORECASE)
    testo = re.sub(r"<[^>]+>", " ", testo)
    righe = [" ".join(riga.split()) for riga in testo.split("\n")]
    righe = [r for r in righe if r]
    return "\n".join(righe)


def genera_caption(voce):
    corpo = pulisci(testo_it(voce))
    link = f"{SITO_URL_BASE}/{voce.get('id')}"
    return (
        "📖 Nuova pagina del Taccuino\n\n"
        f"{corpo}\n\n"
        f"🔗 {link}\n\n"
        "#Taccuino #Fotografia"
    )


def impronta(voce):
    """Identificatore stabile basato sul CONTENUTO della voce, non sulla
    sua posizione.

    L'id dentro taccuino.json è puramente posizionale (assegnato da
    sincronizza-taccuino.py come "numero di riga nel foglio"): se una
    riga viene cancellata o se ne inserisce una nuova non in fondo al
    foglio, gli id di tutte le righe successive slittano e un id può
    finire per indicare una voce completamente diversa da quella a cui
    puntava prima. Confrontare "è nuovo?" per id, in quel caso, dà
    risposte sbagliate. Confrontando invece il contenuto stesso (testo +
    data + foto + video) il rilevamento resta corretto qualunque cosa
    succeda alla numerazione delle righe nel foglio.
    """
    chiave = "|".join([
        testo_it(voce),
        str(voce.get("data") or ""),
        str(voce.get("foto") or ""),
        str(voce.get("video") or ""),
    ])
    return hashlib.sha1(chiave.encode("utf-8")).hexdigest()


def trova_voci_nuove(nuovo, vecchio):
    impronte_viste = {impronta(v) for v in vecchio}
    nuove = [v for v in nuovo if impronta(v) not in impronte_viste]
    # Ordine cronologico di pubblicazione: dalla data meno recente alla
    # più recente tra le voci nuove (le date mancanti finiscono per prime).
    nuove.sort(key=lambda v: v.get("data") or "")
    return nuove


def invia_telegram(testo, token, chat_id):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    dati = urllib.parse.urlencode({"chat_id": chat_id, "text": testo}).encode()
    richiesta = urllib.request.Request(url, data=dati, method="POST")
    try:
        with urllib.request.urlopen(richiesta, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except urllib.error.URLError as e:
        return None, str(e)


def main():
    if len(sys.argv) != 3:
        print(
            "Uso: genera-caption-instagram.py <nuovo.json> <vecchio.json>",
            file=sys.stderr,
        )
        sys.exit(1)

    path_nuovo, path_vecchio = sys.argv[1], sys.argv[2]
    nuovo = carica(path_nuovo)
    vecchio = carica(path_vecchio)

    if not vecchio:
        # Primo run o file precedente illeggibile: meglio non notificare
        # in massa tutto il taccuino esistente (stessa cautela di
        # notifica-nuovi-contenuti.py).
        print("Nessuno stato precedente valido: nessuna caption generata.")
        return

    voci_nuove = trova_voci_nuove(nuovo, vecchio)
    if not voci_nuove:
        print("Nessuna nuova voce nel Taccuino.")
        return

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    for voce in voci_nuove:
        caption = genera_caption(voce)
        print("── Caption generata " + "─" * 40)
        print(caption)
        print("─" * 60)

        if not token or not chat_id:
            print(
                "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID mancanti: caption non inviata.",
                file=sys.stderr,
            )
            continue

        codice, risposta = invia_telegram(caption, token, chat_id)
        if codice == 200:
            print(f"Inviata su Telegram (voce id={voce.get('id')}).")
        else:
            print(
                f"::error::Invio Telegram fallito per id={voce.get('id')} "
                f"(codice={codice}): {risposta}",
                file=sys.stderr,
            )
            sys.exit(1)


if __name__ == "__main__":
    main()
