/* ══════════════════════════════════════════════
   service-worker.js
   Si occupa solo delle push notification (nuovi
   capitoli / voci del Taccuino). Nessuna cache
   offline: il sito resta sempre allineato alla
   versione pubblicata, coerente con l'idea che
   non è un'app da "installare e dimenticare" ma
   un libro che si aggiorna nel tempo.
   ══════════════════════════════════════════════ */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var dati = {};
  try {
    dati = event.data ? event.data.json() : {};
  } catch (e) {
    dati = { title: 'francescomartolini.art', body: event.data ? event.data.text() : '' };
  }

  var titolo = dati.title || 'francescomartolini.art';
  var opzioni = {
    body: dati.body || '',
    icon: dati.icon || '/images/icon-192.png',
    badge: dati.badge || '/images/icon-192.png',
    lang: dati.lang || 'it',
    silent: true, // nessun suono: coerente con il registro silenzioso del sito
    data: { url: dati.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(titolo, opzioni));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (elenco) {
      for (var i = 0; i < elenco.length; i++) {
        var client = elenco[i];
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
