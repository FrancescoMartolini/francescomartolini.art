/* ══════════════════════════════════════════════
   worker/index.js — entry point del Worker Cloudflare.

   Il progetto è configurato su Cloudflare come Worker (non Pages
   classica): tutto il traffico passa da qui. Per la quasi totalità
   delle richieste (tutte le pagine del sito, css, js, immagini...)
   ci limitiamo a inoltrare la richiesta agli asset statici tramite
   env.ASSETS — il sito si comporta esattamente come prima.

   Questo file è SOLO routing: la logica vera vive in
   - push.js      → notifiche push (POST /subscribe, POST /notify)
   - telegram.js  → bot Telegram (POST /telegram/webhook)
   - visite.js    → notifica Telegram di nuova visita (POST /visita)
   ══════════════════════════════════════════════ */

import { gestisciSubscribe, gestisciNotify } from './push.js';
import { handleTelegramUpdate } from './telegram.js';
import { gestisciVisita } from './visite.js';

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);

    // Rotta diagnostica TEMPORANEA — non rivela mai i valori dei
    // secret, solo se sono configurati e quanto sono lunghi. Da
    // rimuovere una volta risolto il problema del 401.
    if (request.method === 'GET' && url.pathname === '/debug-notify') {
      return new Response(
        JSON.stringify({
          NOTIFY_SECRET_configurato: !!env.NOTIFY_SECRET,
          NOTIFY_SECRET_lunghezza: (env.NOTIFY_SECRET || '').length,
          VAPID_PUBLIC_KEY_configurato: !!env.VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY_configurato: !!env.VAPID_PRIVATE_KEY,
          VAPID_CONTACT_EMAIL_configurato: !!env.VAPID_CONTACT_EMAIL,
          PUSH_SUBS_configurato: !!env.PUSH_SUBS
        }, null, 2),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (request.method === 'POST' && url.pathname === '/subscribe') {
      return gestisciSubscribe(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/notify') {
      return gestisciNotify(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/visita') {
      return gestisciVisita(request, env, ctx);
    }

    if (url.pathname === '/telegram/webhook') {
      var telegramSecret = url.searchParams.get('secret');
      if (telegramSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 403 });
      }
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      var update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
      return new Response('OK', { status: 200 });
    }

    // Tutto il resto: file statici del sito, invariati.
    return env.ASSETS.fetch(request);
  }
};
