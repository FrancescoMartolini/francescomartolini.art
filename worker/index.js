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

/* ══════════════════════════════════════════════
   TELEGRAM BOT + AI — caption Instagram bilingue (IT/EN)
   generate a partire da json/progetti.json, con tono
   editoriale coerente al sito (nessuna emoji nella
   caption, nessun linguaggio da social media manager).
   ══════════════════════════════════════════════ */

async function sendTelegramMessage(chatId, text, env) {
  var url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}

async function getProjectsCache(env) {
  var CACHE_KEY = 'telegram_projects_cache';
  var cached = await env.PUSH_SUBS.get(CACHE_KEY, 'json');
  if (cached) return cached;

  var resp = await fetch('https://francescomartolini.art/json/progetti.json');
  var projects = await resp.json();
  await env.PUSH_SUBS.put(CACHE_KEY, JSON.stringify(projects), { expirationTtl: 3600 });
  return projects;
}

async function generateCaption(project, env) {
  var testoIt = '';
  var testoEn = '';

  if (project.contenuto) {
    for (var i = 0; i < project.contenuto.length; i++) {
      var blocco = project.contenuto[i];
      if (blocco.tipo === 'testo') {
        var val = blocco.valore;
        if (typeof val === 'object') {
          testoIt += (val.it || '') + '\n';
          testoEn += (val.en || '') + '\n';
        } else {
          testoIt += val + '\n';
        }
      }
    }
  } else {
    testoIt = project.descrizione || '';
  }

  var prompt =
    'Scrivi una didascalia per Instagram per un progetto fotografico\n' +
    'che fa parte di un libro fotografico digitale, non di un portfolio commerciale.\n' +
    'Il tema di fondo di tutta la ricerca è il tempo: tracce, memoria, trasformazione,\n' +
    'assenza, percezione.\n\n' +
    'Titolo: ' + project.titolo + '\n' +
    'Anno: ' + (project.anno || 'non specificato') + '\n' +
    'Testo originale (IT): ' + testoIt.substring(0, 800) + '\n' +
    'Testo originale (EN), se disponibile: ' + testoEn.substring(0, 800) + '\n\n' +
    'Regole di voce, da rispettare rigorosamente:\n' +
    '- Registro letterario, sobrio, mai promozionale, mai entusiasta\n' +
    '- Frasi brevi, silenzio tra le frasi\n' +
    '- Nessuna emoji\n' +
    '- Nessun linguaggio da marketing ("scopri", "non perdere", "guarda cosa")\n' +
    '- Deve sembrare la didascalia di una pagina di un libro, non un post social\n' +
    '- Lunghezza: 2-5 frasi per lingua\n' +
    '- Chiudi ciascuna versione, solo se pertinente, con 3-5 hashtag essenziali in\n' +
    '  minuscolo su una riga separata (possono differire tra IT e EN se ha senso)\n\n' +
    'Genera la didascalia sia in italiano che in inglese: la versione inglese non è\n' +
    'una traduzione letterale, ma una riscrittura nello stesso registro, naturale\n' +
    'in quella lingua.\n\n' +
    'Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, in questo\n' +
    'formato esatto:\n' +
    '{"it": "didascalia in italiano qui", "en": "caption in English here"}';

  try {
    var response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Curatore editoriale bilingue di un libro fotografico. Voce sobria, letteraria, mai da social media manager. Rispondi sempre e solo con JSON valido quando richiesto.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    var raw = (response.response || '').trim();
    var cleaned = raw.replace(/```json|```/g, '').trim();
    var parsed = JSON.parse(cleaned);

    if (!parsed.it && !parsed.en) return null;
    return { it: parsed.it || '', en: parsed.en || '' };
  } catch (e) {
    console.error('Errore generazione AI:', e);
    return null;
  }
}

function testoOriginaleFallback(project, lang) {
  var testo = '';
  if (project.contenuto) {
    for (var i = 0; i < project.contenuto.length; i++) {
      var blocco = project.contenuto[i];
      if (blocco.tipo === 'testo') {
        var val = blocco.valore;
        if (typeof val === 'object') {
          testo += (val[lang] || '') + '\n\n';
        } else if (lang === 'it') {
          testo += val + '\n\n';
        }
      }
    }
  } else if (lang === 'it') {
    testo = project.descrizione || '';
  }
  return testo.trim();
}

async function inviaCaptionProgetto(chatId, project, env) {
  var link = '\n\n🔗 https://francescomartolini.art/progetti/' + project.id;
  var result = await generateCaption(project, env);

  if (!result) {
    var it = testoOriginaleFallback(project, 'it');
    var en = testoOriginaleFallback(project, 'en');
    var messaggio =
      '<b>' + project.titolo + '</b> (' + (project.anno || '') + ')\n\n' +
      '<b>IT</b>\n' + it + link +
      (en ? '\n\n<b>EN</b>\n' + en + link : '');
    await sendTelegramMessage(chatId, messaggio, env);
    return;
  }

  var messaggioAI =
    '<b>IT</b>\n' + result.it + link + '\n\n' +
    '<b>EN</b>\n' + result.en + link;
  await sendTelegramMessage(chatId, messaggioAI, env);
}

async function handleTelegramUpdate(update, env) {
  var message = update.message;
  if (!message || !message.text) return;

  if (env.TELEGRAM_ALLOWED_CHAT_ID &&
      message.from.id.toString() !== env.TELEGRAM_ALLOWED_CHAT_ID) {
    await sendTelegramMessage(message.chat.id, '⛔ Accesso non autorizzato.', env);
    return;
  }

  var text = message.text.trim();
  var chatId = message.chat.id;

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      '👋 Ciao! Sono il bot di francescomartolini.art\n\n' +
      'Comandi disponibili:\n' +
      '/lista — Vedi tutti i progetti\n' +
      '/post <ID> — Genera caption Instagram IT+EN con AI\n' +
      '/rigenera <ID> — Rigenera caption per un progetto', env);
    return;
  }

  if (text === '/lista') {
    var projects = await getProjectsCache(env);
    var lines = projects.map(function (p) { return '• <code>' + p.id + '</code> — ' + p.titolo; });
    await sendTelegramMessage(chatId,
      '<b>Progetti disponibili:</b>\n\n' + lines.join('\n'), env);
    return;
  }

  if (text.indexOf('/post ') === 0) {
    var postId = text.replace('/post ', '').trim();
    var postProjects = await getProjectsCache(env);
    var postProject = postProjects.find(function (p) { return p.id === postId; });

    if (!postProject) {
      await sendTelegramMessage(chatId,
        '❌ Progetto "' + postId + '" non trovato.\nUsa /lista per vedere gli ID.', env);
      return;
    }

    await sendTelegramMessage(chatId, '⏳ Sto generando la caption con AI...', env);
    await inviaCaptionProgetto(chatId, postProject, env);
    return;
  }

  if (text.indexOf('/rigenera ') === 0) {
    var regenId = text.replace('/rigenera ', '').trim();
    var regenProjects = await getProjectsCache(env);
    var regenProject = regenProjects.find(function (p) { return p.id === regenId; });

    if (!regenProject) {
      await sendTelegramMessage(chatId, '❌ Progetto "' + regenId + '" non trovato.', env);
      return;
    }

    await sendTelegramMessage(chatId, '🔄 Rigenerazione caption in corso...', env);
    await inviaCaptionProgetto(chatId, regenProject, env);
    return;
  }

  await sendTelegramMessage(chatId,
    '❓ Comando non riconosciuto.\nUsa /start per vedere la lista comandi.', env);
}
