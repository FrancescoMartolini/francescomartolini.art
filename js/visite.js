/* ══════════════════════════════════════════════
   visite.js — segnala una nuova visita al worker,
   che manda una notifica Telegram con il paese di
   provenienza (vedi worker/visite.js).

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

  fetch(VISITA_URL, { method: 'POST' }).catch(function () {
    // Rete assente o worker irraggiungibile: nessun problema per
    // l'esperienza di lettura.
  });
})();
