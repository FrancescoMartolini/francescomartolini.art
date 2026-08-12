# Convenzioni di sviluppo

Derivate dal codice esistente; le ultime due sono proposte.

## Codice

- **Vanilla JS**, niente librerie frontend, niente transpiler: il codice gira com'è.
- **Identificatori e commenti in italiano**, camelCase: `apriPagina`, `stato`, `creaImg`, `progettiVisualizzati`. Mantenerlo.
- Helper brevi in testa ai moduli (`$`, `crea`, `formatNum`, `t`, `tu`).
- Funzioni di rendering che restituiscono/iniettano HTML template literal; DOM creato con `crea()` per gli elementi ripetuti.
- CSS: una grande stylesheet organizzata per sezioni commentate con box `══`; variabili in `:root`; componenti nominati in italiano (`.freccia`, `.taccuino-voce`).

## Dati

- Campi JSON **in italiano** (`titolo`, `anno`, `descrizione`, `immagine_copertina`).
- `id` in **kebab-case**; per i progetti l'id coincide con lo slug URL: sceglierlo stabile.
- Testi traducibili come `{it,en}`; mai duplicare strutture per lingua.
- `pubblicato: false` per sospendere, non rimuovere.

## Asset

- Fotografie dei contenuti su **Cloudinary** (trasformazioni `w_600`/`w_1400` + `q_auto,f_auto`), mai nel repo.
- `images/` solo per il branding.
- File generati (feed, pagine statiche) **non si committano**.
- `TEMPLATE/` per bozze e prototipi: mai referenziato dal sito.

## Git (proposta)

- Branch unico `main` per la pubblicazione.
- Commit brevi e descrittivi in italiano o inglese coerente: `nuovo progetto: <nome>`, `taccuino: nuova voce`, `fix: <cosa>`.
- Un commit per contenuto (così il diff del bot e quelli manuali restano leggibili).

## Documentazione

- Quando si aggiunge un sistema/feature: aggiornare il file `docs/` pertinente e `quick-reference.md`.
- Le informazioni "di stato" (in pausa/disattivato) vivono vicino al codice che descrivono (commenti) e sono riassunte in questa docs: evitare di duplicarle in 5 posti.