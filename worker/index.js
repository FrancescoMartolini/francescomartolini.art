/* ══════════════════════════════════════════════
   worker/index.js — entry point del Worker Cloudflare.

   Il progetto è configurato su Cloudflare come Worker (non Pages
   classica): tutto il traffico passa da qui. Per la quasi totalità
   delle richieste (tutte le pagine del sito, css, js, immagini...)
   ci limitiamo a inoltrare la richiesta agli asset statici tramite
   env.ASSETS — il sito si comporta esattamente come prima.

   Le uniche due eccezioni sono POST /subscribe e POST /notify, usate
   dalle notifiche push (vedi README, sezione "NOTIFICHE PUSH").
   ══════════════════════════════════════════════ */

import { ApplicationServerKeys, generatePushHTTPRequest } from 'webpush-webcrypto';

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return gestisciSubscribe(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/notify') {
      return gestisciNotify(request, env);
    }

    // Tutto il resto: file statici del sito, invariati.
    return env.ASSETS.fetch(request);
  }
};

async function gestisciSubscribe(request, env) {
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

async function gestisciNotify(request, env) {
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
