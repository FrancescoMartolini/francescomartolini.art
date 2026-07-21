/* ══════════════════════════════════════════════
   functions/subscribe.js — Cloudflare Pages Function
   Endpoint: POST /subscribe

   Riceve la PushSubscription generata dal browser
   (js/push.js) e la salva in Cloudflare KV, nel
   namespace collegato come "PUSH_SUBS" (vedi
   README, sezione "Notifiche push" per il setup).
   ══════════════════════════════════════════════ */

export async function onRequestPost({ request, env }) {
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
