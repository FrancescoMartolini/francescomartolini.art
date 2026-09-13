/* ══════════════════════════════════════════════
   visite.js — segnala una nuova visita al worker,
   che manda una notifica Telegram con paese e
   provenienza (vedi worker/visite.js).

   Provenienza rilevata da:
   - document.referrer (link cliccato da Google, Instagram
     via browser, ecc. — assente se l'utente digita l'URL o
     se un in-app browser lo nasconde)
   - parametro ?utm_source=... nell'URL, se presente (il modo
     affidabile per marcare i link messi in bio Instagram,
     Biosite, ecc., indipendente dall'in-app browser)

   Una sola chiamata per sessione di navigazione
   (sessionStorage), indipendentemente da quante
   pagine/capitoli del libro vengono sfogliati.
   Fallisce in silenzio: non deve mai interferire
   con la lettura.
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  var SESSION_KEY = 'visita-segnalata';
  var VISITA_URL = '/visita';

  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch (e) {
    // Storage non disponibile (modalità privata restrittiva ecc.):
    // rinunciamo silenziosamente, meglio nessuna notifica che una
    // per ogni pagina.
    return;
  }

  var utmSource = null;
  try {
    utmSource = new URLSearchParams(window.location.search).get('utm_source');
  } catch (e) {
    // URLSearchParams non disponibile: pazienza, resta il referrer.
  }

  var dati = {
    referrer: document.referrer || null,
    utm_source: utmSource
  };

  fetch(VISITA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dati)
  }).catch(function () {
    // Rete assente o worker irraggiungibile: nessun problema per
    // l'esperienza di lettura.
  });
})();
