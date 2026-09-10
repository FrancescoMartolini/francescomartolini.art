/* ══════════════════════════════════════════════
   worker/mostralo.js — POST /mostralo
   Riceve le submission pubbliche del progetto "Quello che Hai Visto"
   e le inoltra via Telegram al proprietario del sito (stesso bot e
   stesso chat id già usati da worker/visite.js e worker/telegram.js).

   Volutamente NON scrive nulla su GitHub e NON tocca Cloudinary: la
   pubblicazione resta una decisione manuale del proprietario, che dopo
   aver guardato le foto in chat le carica lui stesso (vedi docs/content.md
   e la richiesta originale — flusso V1: INVIA → RICEVO → GUARDO →
   SELEZIONO → CARICO → PUBBLICO).
   ══════════════════════════════════════════════ */

import { sendTelegramMessage, sendTelegramMediaGroup } from './telegram-core.js';

var MAX_FOTO = 3;
var MAX_BYTES = 8 * 1024 * 1024; // 8MB
var TIPI_AMMESSI = ['image/jpeg', 'image/png', 'image/webp'];
var RATE_LIMIT_SECONDI = 10 * 60; // 10 minuti per IP

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rispostaJson(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function gestisciMostralo(request, env, ctx) {
  var form;
  try {
    form = await request.formData();
  } catch (e) {
    return rispostaJson({ ok: false, errore: 'Corpo della richiesta non valido.' }, 400);
  }

  // Honeypot: un bot che compila anche questo campo invisibile ottiene
  // comunque una risposta 200 (per non insospettirlo), ma non viene
  // notificato nulla e non si consuma la quota di rate-limit dell'IP.
  var honeypot = (form.get('sito_web') || '').toString().trim();
  if (honeypot) {
    return rispostaJson({ ok: true });
  }

  var ip = request.headers.get('cf-connecting-ip') || 'sconosciuto';
  var chiaveLimite = 'mostralo:' + ip;
  if (env.PUSH_SUBS) {
    var giaInviato = await env.PUSH_SUBS.get(chiaveLimite);
    if (giaInviato) {
      return rispostaJson({ ok: false, errore: 'Hai già inviato una segnalazione da poco. Riprova più tardi.' }, 429);
    }
  }

  var nome = (form.get('nome') || '').toString().trim();
  var instagram = (form.get('instagram') || '').toString().trim();
  var email = (form.get('email') || '').toString().trim();
  var luogo = (form.get('luogo') || '').toString().trim();
  var anno = (form.get('anno') || '').toString().trim();
  var testo = (form.get('testo') || '').toString().trim();
  var consenso = (form.get('consenso') || '').toString();

  if (!nome || !email || !luogo || !anno || !testo) {
    return rispostaJson({ ok: false, errore: 'Compila tutti i campi obbligatori.' }, 400);
  }
  if (!/^\d{4}$/.test(anno)) {
    return rispostaJson({ ok: false, errore: 'L\'anno deve essere di 4 cifre.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return rispostaJson({ ok: false, errore: 'Email non valida.' }, 400);
  }
  if (consenso !== 'on' && consenso !== 'true' && consenso !== '1') {
    return rispostaJson({ ok: false, errore: 'È necessario il consenso alla pubblicazione.' }, 400);
  }

  var file = form.getAll('foto').filter(function (f) { return f && typeof f.arrayBuffer === 'function' && f.size > 0; });
  if (file.length > MAX_FOTO) {
    return rispostaJson({ ok: false, errore: 'Massimo ' + MAX_FOTO + ' fotografie.' }, 400);
  }
  for (var i = 0; i < file.length; i++) {
    if (TIPI_AMMESSI.indexOf(file[i].type) === -1) {
      return rispostaJson({ ok: false, errore: 'Formato immagine non ammesso: usa jpg, png o webp.' }, 400);
    }
    if (file[i].size > MAX_BYTES) {
      return rispostaJson({ ok: false, errore: 'Ogni fotografia deve pesare al massimo 8MB.' }, 400);
    }
  }

  if (!env.TELEGRAM_ALLOWED_CHAT_ID) {
    console.error('gestisciMostralo: TELEGRAM_ALLOWED_CHAT_ID non configurato.');
    return rispostaJson({ ok: false, errore: 'Servizio momentaneamente non disponibile.' }, 500);
  }

  var didascalia =
    '👁️ <b>Nuovo sguardo — Quello che Hai Visto</b>\n\n' +
    '<b>Nome:</b> ' + escapeHtml(nome) + '\n' +
    (instagram ? '<b>Instagram/sito:</b> ' + escapeHtml(instagram) + '\n' : '') +
    '<b>Email:</b> ' + escapeHtml(email) + '\n' +
    '<b>Luogo:</b> ' + escapeHtml(luogo) + '\n' +
    '<b>Anno:</b> ' + escapeHtml(anno) + '\n\n' +
    '<i>' + escapeHtml(testo) + '</i>' +
    (file.length ? '' : '\n\n<i>(nessuna fotografia allegata)</i>');

  var inviato;
  if (file.length) {
    inviato = await sendTelegramMediaGroup(env.TELEGRAM_ALLOWED_CHAT_ID, file, didascalia, env);
  } else {
    inviato = await sendTelegramMessage(env.TELEGRAM_ALLOWED_CHAT_ID, didascalia, env);
  }

  if (!inviato) {
    return rispostaJson({ ok: false, errore: 'Invio non riuscito. Riprova tra qualche minuto.' }, 500);
  }

  if (env.PUSH_SUBS) {
    ctx.waitUntil(env.PUSH_SUBS.put(chiaveLimite, '1', { expirationTtl: RATE_LIMIT_SECONDI }));
  }

  return rispostaJson({ ok: true });
}
