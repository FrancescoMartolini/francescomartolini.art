/* ══════════════════════════════════════════════
   worker/telegram-core.js — Funzioni base del bot Telegram
   ══════════════════════════════════════════════ */

export async function sendTelegramMessage(chatId, text, env, keyboard = null) {
  var url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  var body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (keyboard) {
    body.reply_markup = keyboard;
  }
  
  try {
    var risposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!risposta.ok) {
      var corpoErrore = await risposta.text();
      console.error('sendTelegramMessage fallita: HTTP ' + risposta.status);
    }
    return risposta.ok;
  } catch (e) {
    console.error('sendTelegramMessage — errore di rete:', e);
    return false;
  }
}

export function sendKeyboard(chatId, text, buttons, env) {
  var keyboard = { inline_keyboard: buttons };
  return sendTelegramMessage(chatId, text, env, keyboard);
}

export function dataOggiRoma() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

export function encodeBase64Utf8(str) {
  var bytes = new TextEncoder().encode(str);
  var binaria = '';
  for (var i = 0; i < bytes.length; i++) binaria += String.fromCharCode(bytes[i]);
  return btoa(binaria);
}

export function decodeBase64Utf8(b64) {
  var binaria = atob(b64.replace(/\n/g, ''));
  var bytes = new Uint8Array(binaria.length);
  for (var i = 0; i < binaria.length; i++) bytes[i] = binaria.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function testoCampo(valore, lang) {
  if (valore == null) return '';
  if (typeof valore === 'object') return valore[lang] || valore.it || valore.en || '';
  return String(valore);
}

export async function salvaStato(chatId, stato, env) {
  await env.PUSH_SUBS.put('telegram_state:' + chatId, JSON.stringify(stato), { expirationTtl: 3600 });
}

export async function getStato(chatId, env) {
  return await env.PUSH_SUBS.get('telegram_state:' + chatId, 'json');
}

export async function cancellaStato(chatId, env) {
  await env.PUSH_SUBS.delete('telegram_state:' + chatId);
}

export function chiaveBozza(id) {
  return 'bozza:' + id;
}

export async function aggiungiBozza(type, data, env) {
  var id = Date.now().toString(36);
  var bozza = {
    id: id,
    type: type,
    status: 'draft',
    created_at: Date.now(),
    updated_at: Date.now(),
    data: data || {}
  };
  await env.PUSH_SUBS.put(chiaveBozza(id), JSON.stringify(bozza));
  return id;
}

export async function elencaBozze(env) {
  var elenco = await env.PUSH_SUBS.list({ prefix: 'bozza:' });
  var bozze = await Promise.all(
    elenco.keys.map(function (voce) {
      return env.PUSH_SUBS.get(voce.name, 'json');
    })
  );
  bozze = bozze.filter(function (b) { return b; });
  bozze.sort(function (a, b) { return b.created_at - a.created_at; });
  return bozze;
}

export async function ottieniBozza(id, env) {
  return await env.PUSH_SUBS.get(chiaveBozza(id), 'json');
}

export async function aggiornaBozza(id, updates, env) {
  var bozza = await ottieniBozza(id, env);
  if (!bozza) return null;
  
  Object.assign(bozza.data, updates);
  bozza.updated_at = Date.now();
  
  await env.PUSH_SUBS.put(chiaveBozza(id), JSON.stringify(bozza));
  return bozza;
}

export async function rimuoviBozza(id, env) {
  await env.PUSH_SUBS.delete(chiaveBozza(id));
}

export async function traduciTesto(testoIt, env) {
  var prompt =
    'Traduci il seguente testo dall\'italiano all\'inglese, mantenendo un registro sobrio, letterario, mai promozionale.\n\n' +
    'Regole:\n' +
    '- Non è una traduzione letterale, ma una riscrittura naturale\n' +
    '- Mantieni invariati eventuali tag HTML\n' +
    '- Rispondi SOLO con il testo tradotto, senza virgolette, senza markdown\n\n' +
    'Testo originale:\n' + testoIt;

  try {
    var response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Traduttore editoriale italiano-inglese. Voce sobria, letteraria. Rispondi solo col testo tradotto.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.5
    });

    var tradotto = (response.response || '').trim();
    tradotto = tradotto.replace(/^["\u201C\u201D]|["\u201C\u201D]$/g, '').trim();
    return tradotto || null;
  } catch (e) {
    console.error('Errore traduzione AI:', e);
    return null;
  }
}

export async function pubblicaSuGithub(path, contenuto, messaggioCommit, env) {
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';

  var headersBase = {
    'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'francescomartolini-art-bot',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  var getResp = await fetch(
    'https://api.github.com/repos/' + repo + '/contents/' + path + '?ref=' + branch,
    { headers: headersBase }
  );
  
  if (!getResp.ok) {
    throw new Error('Impossibile leggere ' + path + ' da GitHub: HTTP ' + getResp.status);
  }
  
  var fileInfo = await getResp.json();

  var putResp = await fetch('https://api.github.com/repos/' + repo + '/contents/' + path, {
    method: 'PUT',
    headers: Object.assign({}, headersBase, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message: messaggioCommit,
      content: encodeBase64Utf8(JSON.stringify(contenuto, null, 2)),
      sha: fileInfo.sha,
      branch: branch
    })
  });

  if (!putResp.ok) {
    var corpoErrore = await putResp.text();
    throw new Error('GitHub ha rifiutato il salvataggio: HTTP ' + putResp.status + ' — ' + corpoErrore.substring(0, 200));
  }
  
  return true;
}

export function isValidCloudinaryUrl(url) {
  try {
    var parsed = new URL(url);
    return parsed.hostname.includes('cloudinary.com');
  } catch {
    return false;
  }
}

export function parseMultipleUrls(text) {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(function(url) { return url.trim(); })
    .filter(function(url) { return url.startsWith('http'); });
}