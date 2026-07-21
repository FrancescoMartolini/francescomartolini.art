/* ══════════════════════════════════════════════
   push.js — iscrizione alle push notification.
   Modulo indipendente da libro.js: legge le
   stringhe da json/ui.json tramite window.t_ui
   (esposto da i18n.js) e aggiorna qualunque
   elemento con classe "notify-optin" trovato in
   pagina (una in fondo al libro mobile, una nel
   footer desktop).
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  // Chiave pubblica VAPID — sostituire con quella generata da
  // scripts/genera-chiavi-vapid.mjs (vedi README, sezione "Notifiche push").
  var VAPID_PUBLIC_KEY = 'INSERISCI_QUI_LA_CHIAVE_PUBBLICA_VAPID';

  var SW_URL = '/service-worker.js';
  var SUBSCRIBE_URL = '/subscribe';

  function base64UrlToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function supportato() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      VAPID_PUBLIC_KEY.indexOf('INSERISCI_QUI') === -1
    );
  }

  async function statoAttuale() {
    if (!supportato()) return 'non-supportato';
    if (Notification.permission === 'denied') return 'negato';
    var reg = await navigator.serviceWorker.getRegistration(SW_URL);
    if (reg) {
      var sub = await reg.pushManager.getSubscription();
      if (sub) return 'attivo';
    }
    return 'inattivo';
  }

  async function iscrivi() {
    var reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    await navigator.serviceWorker.ready;
    var permesso = await Notification.requestPermission();
    if (permesso !== 'granted') throw new Error('permesso-negato');

    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY)
    });

    var risposta = await fetch(SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    if (!risposta.ok) throw new Error('salvataggio-fallito');

    return sub;
  }

  function testo(chiave) {
    return (window.t_ui && window.t_ui(chiave)) || '';
  }

  async function aggiornaUI() {
    var nodi = document.querySelectorAll('.notify-optin');
    if (!nodi.length) return;

    var stato = await statoAttuale();

    nodi.forEach(function (nodo) {
      var invito = nodo.querySelector('.notify-invito');
      var bottone = nodo.querySelector('.notify-btn');
      if (!invito || !bottone) return;

      if (stato === 'non-supportato') {
        nodo.style.display = 'none';
        return;
      }

      nodo.style.display = '';

      if (stato === 'negato') {
        invito.textContent = testo('notifiche.negato');
        bottone.style.display = 'none';
        return;
      }

      if (stato === 'attivo') {
        invito.textContent = testo('notifiche.attivo');
        bottone.style.display = 'none';
        return;
      }

      invito.textContent = testo('notifiche.invito');
      bottone.textContent = testo('notifiche.attiva');
      bottone.style.display = '';
      bottone.disabled = false;
      bottone.onclick = async function () {
        bottone.disabled = true;
        try {
          await iscrivi();
          await aggiornaUI();
        } catch (e) {
          invito.textContent = testo('notifiche.errore');
          bottone.disabled = false;
        }
      };
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    (window.i18nReady || Promise.resolve()).then(aggiornaUI);
  });
})();
