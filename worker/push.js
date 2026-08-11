/* ══════════════════════════════════════════════
   worker/push.js — notifiche push del sito.

   Due rotte, chiamate da index.js:
   - gestisciSubscribe: POST /subscribe, salva l'iscrizione di un browser
   - gestisciNotify:    POST /notify, invia una notifica a tutti gli iscritti

   Logica invariata rispetto alla versione precedente in un unico file:
   solo spostata qui.
   ══════════════════════════════════════════════ */

import { ApplicationServerKeys, generatePushHTTPRequest } from 'webpush-webcrypto';

export async function gestisciSubscribe(request, env) {
  let sub;
  try {
    sub = await request.json();
  } catch (e) {
    return new Response('JSON non valido', { status: 400 });
  }

  var valida =
    sub &&
    typeof sub.endpoint === 'string' &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string';

  if (!valida) {
    return new Response('Subscription non valida', { status: 400 });
  }

  var chiave = 'sub:' + sub.endpoint;
  await env.PUSH_SUBS.put(chiave, JSON.stringify(sub));

  return new Response('ok');
}

export async function gestisciNotify(request, env) {
  var secret = request.headers.get('x-notify-secret');
  if (!secret || secret !== env.NOTIFY_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response('JSON non valido', { status: 400 });
  }

  var title = payload.title || 'francescomartolini.art';
  var body = payload.body || '';
  var url = payload.url || '/';

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return new Response('Chiavi VAPID non configurate', { status: 500 });
  }

  var keys = await ApplicationServerKeys.fromJSON({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  });

  var elenco = await env.PUSH_SUBS.list();

  var inviati = 0;
  var rimossi = 0;
  var falliti = 0;

  await Promise.all(
    elenco.keys.map(async function (voce) {
      var raw = await env.PUSH_SUBS.get(voce.name);
      if (!raw) return;

      var sub = JSON.parse(raw);

      try {
        var richiesta = await generatePushHTTPRequest({
          applicationServerKeys: keys,
          payload: JSON.stringify({ title: title, body: body, url: url }),
          target: { endpoint: sub.endpoint, keys: sub.keys },
          adminContact: env.VAPID_CONTACT_EMAIL || 'mailto:info@francescomartolini.art',
          ttl: 60 * 60 * 24,
          urgency: 'normal'
        });

        var risposta = await fetch(richiesta.endpoint, {
          method: 'POST',
          headers: richiesta.headers,
          body: richiesta.body
        });

        if (risposta.status === 404 || risposta.status === 410) {
          await env.PUSH_SUBS.delete(voce.name);
          rimossi++;
        } else if (!risposta.ok) {
          falliti++;
        } else {
          inviati++;
        }
      } catch (e) {
        falliti++;
      }
    })
  );

  return new Response(JSON.stringify({ inviati: inviati, rimossi: rimossi, falliti: falliti }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
