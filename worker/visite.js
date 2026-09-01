/* ══════════════════════════════════════════════
   worker/visite.js — notifica Telegram a ogni nuova visita.

   POST /visita, chiamata dal frontend (js/visite.js) una sola volta
   per sessione di navigazione. Legge il paese da request.cf.country
   (dato fornito nativamente da Cloudflare, nessun servizio esterno)
   e manda un messaggio al bot con sendTelegramMessage(), la stessa
   funzione già usata da worker/telegram.js.

   Rate limit: al massimo una notifica ogni RATE_LIMIT_SECONDI per lo
   stesso IP, per evitare spam da reload, prefetch o crawler. Usa lo
   stesso namespace KV (PUSH_SUBS) già bindato nel Worker.
   ══════════════════════════════════════════════ */

import { sendTelegramMessage } from './telegram-core.js';

var RATE_LIMIT_SECONDI = 30 * 60; // 30 minuti per IP

var NOMI_PAESE = {
  it: new Intl.DisplayNames(['it'], { type: 'region' })
};

function nomePaese(codice) {
  if (!codice) return 'un paese sconosciuto';
  try {
    var nome = NOMI_PAESE.it.of(codice);
    return nome || codice;
  } catch (e) {
    return codice;
  }
}

export async function gestisciVisita(request, env, ctx) {
  var cf = request.cf || {};
  var codicePaese = cf.country || null;
  var citta = cf.city || null;

  var ip = request.headers.get('cf-connecting-ip') || 'sconosciuto';
  var chiaveLimite = 'visita:' + ip;

  // Se abbiamo già notificato questo IP di recente, non rimandiamo
  // nulla a Telegram ma rispondiamo comunque 200 (il frontend non
  // deve accorgersene né riprovare).
  var giaNotificato = await env.PUSH_SUBS.get(chiaveLimite);
  if (giaNotificato) {
    return new Response(JSON.stringify({ ok: true, notificato: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  ctx.waitUntil(env.PUSH_SUBS.put(chiaveLimite, '1', { expirationTtl: RATE_LIMIT_SECONDI }));

  var paese = nomePaese(codicePaese);
  var testo = '📖 Una nuova visita da ' + paese + (citta ? ' (' + citta + ')' : '');

  if (env.TELEGRAM_ALLOWED_CHAT_ID) {
    ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_ALLOWED_CHAT_ID, testo, env));
  }

  return new Response(JSON.stringify({ ok: true, notificato: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
