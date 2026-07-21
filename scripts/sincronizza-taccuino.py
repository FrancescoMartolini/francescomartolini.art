#!/usr/bin/env python3
"""
Sincronizza json/taccuino.json a partire dai due fogli Google Sheets
pubblicati (IT ed EN) usati come sorgente "live" del Taccuino.

Perché serve: il sito NON legge più Google Sheets in tempo reale ad ogni
visita (era la causa di caricamenti lenti/bloccati — vedi js/libro.js,
caricaDati()). js/libro.js prova comunque prima il foglio live con un
timeout breve (SHEETS_TIMEOUT_MS), ma la fonte "vera" per i visitatori è
sempre json/taccuino.json, committato nel repo. Questo script è il modo
per tenerlo aggiornato: lo esegue in automatico il workflow schedulato
(.github/workflows/sincronizza-taccuino.yml), oppure lo si può lanciare
a mano dopo aver scritto una nuova voce nel foglio.

Uso (da qualunque cartella ci si trovi, va bene comunque):
    python3 scripts/sincronizza-taccuino.py

Riscrive json/taccuino.json solo se il contenuto è effettivamente
cambiato, così non sporca la cronologia git ad ogni esecuzione a vuoto.
"""
import csv
import io
import json
import os
import sys
import unicodedata
import urllib.request

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TACCUINO_JSON = os.path.join(RADICE, 'json', 'taccuino.json')

SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1174325309&single=true&output=csv'
SHEETS_URL_EN = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1079818483&single=true&output=csv'

ALIAS_COLONNE = {
    'testo': ['testo', 'testo it', 'nota', 'nota it'],
    'data': ['data', 'date'],
    'foto': ['foto', 'photo', 'immagine'],
    'video': ['video', 'filmato', 'video url', 'url video'],
    'camera': ['camera'],
}


def normalizza_header(h):
    h = h.lower().strip()
    h = unicodedata.normalize('NFD', h)
    h = ''.join(c for c in h if unicodedata.category(c) != 'Mn')  # rimuove accenti
    return h


def trova_indice_colonna(headers, chiave):
    alias = ALIAS_COLONNE[chiave]
    for i, h in enumerate(headers):
        if h in alias:
            return i
    return -1


def scarica_csv(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return r.read().decode('utf-8')


def parse_csv(testo_csv):
    """Stessa logica di parseCsv() in js/libro.js: colonne trovate per
    nome (con fallback posizionale testo/data/foto/camera), riga per
    riga, id progressivo."""
    righe = list(csv.reader(io.StringIO(testo_csv)))
    if not righe:
        return []
    header = [normalizza_header(h) for h in righe[0]]

    idx_testo = trova_indice_colonna(header, 'testo')
    idx_data = trova_indice_colonna(header, 'data')
    idx_foto = trova_indice_colonna(header, 'foto')
    idx_video = trova_indice_colonna(header, 'video')
    idx_camera = trova_indice_colonna(header, 'camera')

    if idx_testo == -1: idx_testo = 0
    if idx_data == -1: idx_data = 1
    if idx_foto == -1: idx_foto = 2
    if idx_camera == -1: idx_camera = 3

    voci = []
    for i, riga in enumerate(righe[1:]):
        def cella(idx):
            return riga[idx].strip() if idx != -1 and idx < len(riga) else ''
        testo = cella(idx_testo)
        if not testo:
            continue
        voci.append({
            'id': i + 1,
            'testo': testo,
            'data': cella(idx_data),
            'foto': cella(idx_foto) or None,
            'video': (cella(idx_video) or None) if idx_video != -1 else None,
            'camera': cella(idx_camera) or None,
        })
    return voci


def unisci_it_en(voci_it, voci_en):
    """Abbina le voci IT ed EN per id (stessa riga nei due fogli) e
    produce testo come {it, en} quando l'EN esiste, altrimenti stringa
    semplice — stessa convenzione di json/taccuino.json oggi."""
    en_per_id = {v['id']: v['testo'] for v in voci_en}
    risultato = []
    for v in voci_it:
        testo_en = en_per_id.get(v['id'], '')
        voce = dict(v)
        if testo_en:
            voce['testo'] = {'it': v['testo'], 'en': testo_en}
        risultato.append(voce)
    return risultato


def main():
    try:
        csv_it = scarica_csv(SHEETS_URL)
    except Exception as e:
        print(f'Errore scaricando il foglio IT: {e}', file=sys.stderr)
        sys.exit(1)

    try:
        csv_en = scarica_csv(SHEETS_URL_EN)
        voci_en = parse_csv(csv_en)
    except Exception as e:
        print(f'Avviso: foglio EN non disponibile ({e}), procedo solo con IT', file=sys.stderr)
        voci_en = []

    voci_it = parse_csv(csv_it)
    voci = unisci_it_en(voci_it, voci_en)
    voci.sort(key=lambda v: v['data'], reverse=True)

    nuovo_contenuto = json.dumps(voci, ensure_ascii=False, indent=2) + '\n'

    vecchio_contenuto = None
    if os.path.exists(TACCUINO_JSON):
        with open(TACCUINO_JSON, encoding='utf-8') as f:
            vecchio_contenuto = f.read()

    if nuovo_contenuto == vecchio_contenuto:
        print('taccuino.json già aggiornato, nessuna modifica.')
        return

    with open(TACCUINO_JSON, 'w', encoding='utf-8') as f:
        f.write(nuovo_contenuto)
    print(f'taccuino.json aggiornato: {len(voci)} voci.')


if __name__ == '__main__':
    main()
