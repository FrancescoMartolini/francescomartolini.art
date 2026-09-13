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

// Etichette leggibili per gli utm_source usati nei link che pubblichi tu
// (bio Instagram, Biosite, newsletter, ecc.). Aggiungine quando ne crei
// di nuovi: basta che il valore combaci con quello messo nel link.
var NOMI_UTM = {
  instagram: 'Instagram (bio)',
  biosite: 'Biosite',
  linktree: 'Linktree',
  newsletter: 'newsletter',
  stampa: 'materiale stampato'
};

// Host noti a cui diamo un nome leggibile quando arrivano via
// document.referrer (click reale su un link, non un utm marcato a mano).
var NOMI_HOST = [
  [/(^|\.)google\./, 'ricerca Google'],
  [/(^|\.)bing\./, 'ricerca Bing'],
  [/(^|\.)duckduckgo\./, 'ricerca DuckDuckGo'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)l\.instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)linktr\.ee$/, 'Linktree'],
  [/(^|\.)bio\.site$/, 'Biosite'],
  [/(^|\.)(twitter|x)\.com$/, 'X (Twitter)'],
  [/(^|\.)t\.co$/, 'X (Twitter)'],
  [/(^|\.)pinterest\./, 'Pinterest'],
  [/(^|\.)behance\.net$/, 'Behance']
];

function nomeProvenienza(referrer, utmSource) {
  // Priorità all'utm_source: è quello che hai messo tu nel link, quindi
  // è affidabile anche quando l'in-app browser azzera il referrer.
  if (utmSource) {
    return NOMI_UTM[utmSource.toLowerCase()] || utmSource;
  }

  if (!referrer) {
    // Nessun referrer e nessun utm: URL digitato a mano, aperto da
    // un'app che non lo trasmette (spesso il caso di Instagram/TikTok
    // in-app browser), o preferiti/segnalibro.
    return 'diretto o app senza referrer';
  }

  try {
    var host = new URL(referrer).hostname;
    for (var i = 0; i < NOMI_HOST.length; i++) {
      if (NOMI_HOST[i][0].test(host)) return NOMI_HOST[i][1];
    }
    return host;
  } catch (e) {
    return 'sconosciuto';
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

  var referrer = null;
  var utmSource = null;
  try {
    var corpo = await request.json();
    referrer = corpo && corpo.referrer ? String(corpo.referrer).slice(0, 500) : null;
    utmSource = corpo && corpo.utm_source ? String(corpo.utm_source).slice(0, 100) : null;
  } catch (e) {
    // Body assente o non JSON: va bene, la notifica resta comunque utile
    // solo con paese/città.
  }

  var paese = nomePaese(codicePaese);
  var provenienza = nomeProvenienza(referrer, utmSource);
  var testo = '📖 Una nuova visita da ' + paese + (citta ? ' (' + citta + ')' : '') +
    '\nProvenienza: ' + provenienza;

  if (env.TELEGRAM_ALLOWED_CHAT_ID) {
    ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_ALLOWED_CHAT_ID, testo, env));
  }

  return new Response(JSON.stringify({ ok: true, notificato: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
