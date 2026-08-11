/* ══════════════════════════════════════════════
   worker/telegram.js — bot Telegram + AI.

   Tutto quello che il bot sa fare:
   - /lista, /post, /rigenera → caption Instagram bilingue (IT/EN)
     generate a partire da json/progetti.json, con tono editoriale
     coerente al sito (nessuna emoji nella caption, nessun linguaggio
     da social media manager)
   - /nuovanota → flusso conversazionale completo per una nota del
     taccuino (bilingue, con foto/video/camera)
   - /nota, /bozze, /modifica, /pubblica, /elimina, /stato → bozze
     rapide, cattura veloce di frammenti grezzi in italiano

   L'unica funzione esportata è handleTelegramUpdate, chiamata da
   index.js dentro ctx.waitUntil(). Logica invariata rispetto alla
   versione precedente in un unico file: solo spostata qui.
   ══════════════════════════════════════════════ */

export async function sendTelegramMessage(chatId, text, env) {
  var url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  try {
    var risposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
    });
    if (!risposta.ok) {
      // fetch() non lancia eccezioni per risposte HTTP di errore (es. 401
      // token invalido, 400 chat_id sbagliato): senza questo controllo il
      // fallimento è invisibile, il Worker torna comunque 200 OK al
      // webhook e in chat non arriva nulla. Lo logghiamo esplicitamente
      // così compare in "wrangler tail".
      var corpoErrore = await risposta.text();
      console.error('sendTelegramMessage fallita: HTTP ' + risposta.status + ' — ' + corpoErrore.substring(0, 300));
    }
  } catch (e) {
    console.error('sendTelegramMessage — errore di rete:', e);
  }
}

async function getProjectsCache(env) {
  var CACHE_KEY = 'telegram_projects_cache';
  var cached = await env.PUSH_SUBS.get(CACHE_KEY, 'json');
  if (cached) return cached;

  // Legge il file direttamente dagli asset statici del Worker (env.ASSETS),
  // non con un fetch HTTP pubblico verso il proprio dominio: evita che WAF,
  // Bot Fight Mode o altre regole di sicurezza sulla zona blocchino questa
  // richiesta interna restituendo una pagina di sfida HTML invece del JSON.
  var resp = await env.ASSETS.fetch(new Request('https://francescomartolini.art/json/progetti.json'));
  if (!resp.ok) {
    throw new Error('Impossibile leggere json/progetti.json dagli asset: HTTP ' + resp.status);
  }
  var projects = await resp.json();
  await env.PUSH_SUBS.put(CACHE_KEY, JSON.stringify(projects), { expirationTtl: 3600 });
  return projects;
}

// I campi titolo/anno nel JSON a volte sono stringhe semplici, a volte
// oggetti bilingue { it, en }. Questa funzione normalizza sempre a una
// stringa, evitando che finisca "[object Object]" nei messaggi o nei
// prompt per l'AI.
function testoCampo(valore, lang) {
  if (valore == null) return '';
  if (typeof valore === 'object') return valore[lang] || valore.it || valore.en || '';
  return String(valore);
}

// Il modello a volte restituisce quasi-JSON invece di JSON valido:
// - a-capo o testo prima/dopo l'oggetto, nonostante le istruzioni
// - a-capo letterali DENTRO le stringhe (non validi lì) invece di "\n"
// - virgole finali di troppo prima di } o ]
// Questa funzione ripulisce tutto questo. La parte delicata è che un
// a-capo FUORI da una stringa è formattazione legittima (JSON la
// permette) e va lasciata stare — solo dentro una stringa va escapata.
// Per saperlo bisogna scorrere il testo carattere per carattere tenendo
// traccia se ci si trova dentro una stringa, gestendo correttamente gli
// escape già presenti (es. \" dentro una stringa non la chiude).
function sanificaJsonModello(testoGrezzo) {
  var testo = testoGrezzo.replace(/```json|```/g, '').trim();

  var indiceInizio = testo.indexOf('{');
  var indiceFine = testo.lastIndexOf('}');
  if (indiceInizio !== -1 && indiceFine !== -1 && indiceFine > indiceInizio) {
    testo = testo.substring(indiceInizio, indiceFine + 1);
  }

  var risultato = '';
  var dentroStringa = false;
  var precedenteEscape = false;

  for (var i = 0; i < testo.length; i++) {
    var ch = testo[i];
    var codice = testo.charCodeAt(i);
    if (dentroStringa) {
      if (precedenteEscape) {
        risultato += ch;
        precedenteEscape = false;
        continue;
      }
      if (ch === '\\') {
        risultato += ch;
        precedenteEscape = true;
        continue;
      }
      if (ch === '"') {
        dentroStringa = false;
        risultato += ch;
        continue;
      }
      if (codice <= 0x1F) {
        if (ch === '\n') risultato += '\\n';
        else if (ch === '\r') risultato += '\\r';
        else if (ch === '\t') risultato += '\\t';
        else risultato += '\\u' + codice.toString(16).padStart(4, '0');
        continue;
      }
      risultato += ch;
    } else {
      if (ch === '"') dentroStringa = true;
      risultato += ch;
    }
  }

  return risultato.replace(/,(\s*[}\]])/g, '$1');
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
    'Titolo: ' + testoCampo(project.titolo, 'it') + '\n' +
    'Anno: ' + (testoCampo(project.anno, 'it') || 'non specificato') + '\n' +
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

    var sanificato = sanificaJsonModello(response.response);

    var parsed;
    try {
      parsed = JSON.parse(sanificato);
    } catch (erroreParse) {
      console.error('JSON non valido dal modello, testo ricevuto:', sanificato.substring(0, 500));
      throw erroreParse;
    }

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
      '⚠️ <i>L\'AI non è riuscita a generare la caption, questo è il testo originale del progetto senza rielaborazione:</i>\n\n' +
      '<b>' + testoCampo(project.titolo, 'it') + '</b> (' + testoCampo(project.anno, 'it') + ')\n\n' +
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

/* ══════════════════════════════════════════════
   TACCUINO — comando /nuovanota
   Flusso conversazionale a stati: il bot chiede i campi uno alla volta,
   li salva temporaneamente su KV (PUSH_SUBS), mostra un riepilogo e,
   solo dopo conferma esplicita, scrive la nuova nota su GitHub tramite
   le API Contents — che genera un commit vero e proprio e fa ripartire
   la build automatica del sito.
   ══════════════════════════════════════════════ */

var CAMPI_NOTA = [
  { chiave: 'testo_it', domanda: 'Testo della nota, in italiano:' },
  { chiave: 'testo_en', domanda: 'Stesso testo, in inglese:' },
  { chiave: 'foto', domanda: 'URL della foto (o "-" se non c\'è):' },
  { chiave: 'video', domanda: 'URL del video (o "-" se non c\'è):' },
  { chiave: 'camera', domanda: 'Camera/fotocamera usata (o "-" se non specificata):' }
];

// La data della nota è sempre "oggi", nel fuso orario italiano (non UTC,
// altrimenti scrivendo dopo mezzanotte risulterebbe il giorno sbagliato).
// Formato en-CA per comodità: restituisce direttamente AAAA-MM-GG.
function dataOggiRoma() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

async function salvaNotaState(chatId, stato, env) {
  await env.PUSH_SUBS.put('telegram_nota_state:' + chatId, JSON.stringify(stato), { expirationTtl: 1800 });
}

async function getNotaState(chatId, env) {
  return await env.PUSH_SUBS.get('telegram_nota_state:' + chatId, 'json');
}

async function cancellaNotaState(chatId, env) {
  await env.PUSH_SUBS.delete('telegram_nota_state:' + chatId);
}

function costruisciRiepilogoNota(d) {
  return '<b>Riepilogo nuova nota</b>\n\n' +
    '<b>IT</b>: ' + d.testo_it + '\n' +
    '<b>EN</b>: ' + d.testo_en + '\n' +
    '<b>Data</b>: ' + d.data + '\n' +
    '<b>Foto</b>: ' + (d.foto || '—') + '\n' +
    '<b>Video</b>: ' + (d.video || '—') + '\n' +
    '<b>Camera</b>: ' + (d.camera || '—') + '\n\n' +
    'Scrivi <b>CONFERMA</b> per pubblicare, oppure <b>ANNULLA</b> per annullare.';
}

async function gestisciPassoNuovaNota(chatId, text, stato, env) {
  if (stato.step === 'conferma') {
    var risposta = text.trim().toUpperCase();

    if (risposta === 'CONFERMA') {
      try {
        await pubblicaNotaTaccuino(stato.data, env);
        await cancellaNotaState(chatId, env);
        await sendTelegramMessage(chatId,
          '✅ Nota pubblicata. Il sito si aggiornerà a breve (build automatica).', env);
      } catch (e) {
        console.error('Errore pubblicazione nota:', e);
        await sendTelegramMessage(chatId,
          '⚠️ Errore nel salvataggio: ' + e.message +
          '\n\nI dati inseriti non sono andati persi: scrivi di nuovo CONFERMA per riprovare, oppure ANNULLA.', env);
      }
      return;
    }

    if (risposta === 'ANNULLA') {
      await cancellaNotaState(chatId, env);
      await sendTelegramMessage(chatId, 'Annullato. Nessuna nota è stata salvata.', env);
      return;
    }

    await sendTelegramMessage(chatId, 'Scrivi CONFERMA per pubblicare, oppure ANNULLA per annullare.', env);
    return;
  }

  var indiceCorrente = CAMPI_NOTA.findIndex(function (c) { return c.chiave === stato.step; });
  var valore = text.trim();

  if ((stato.step === 'foto' || stato.step === 'video' || stato.step === 'camera') && valore === '-') {
    valore = null;
  }

  stato.data[stato.step] = valore;

  var prossimo = CAMPI_NOTA[indiceCorrente + 1];
  if (prossimo) {
    stato.step = prossimo.chiave;
    await salvaNotaState(chatId, stato, env);
    await sendTelegramMessage(chatId, prossimo.domanda, env);
  } else {
    stato.step = 'conferma';
    await salvaNotaState(chatId, stato, env);
    await sendTelegramMessage(chatId, costruisciRiepilogoNota(stato.data), env);
  }
}

// Le API GitHub Contents vogliono/restituiscono il contenuto file in
// base64. atob/btoa nativi non gestiscono bene l'UTF-8 (servono per gli
// accenti nei testi italiani), quindi passiamo dai byte espliciti.
function encodeBase64Utf8(str) {
  var bytes = new TextEncoder().encode(str);
  var binaria = '';
  for (var i = 0; i < bytes.length; i++) binaria += String.fromCharCode(bytes[i]);
  return btoa(binaria);
}

function decodeBase64Utf8(b64) {
  var binaria = atob(b64.replace(/\n/g, ''));
  var bytes = new Uint8Array(binaria.length);
  for (var i = 0; i < binaria.length; i++) bytes[i] = binaria.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function pubblicaNotaTaccuino(dati, env) {
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';
  var path = 'json/taccuino.json';

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
    throw new Error('Impossibile leggere taccuino.json da GitHub: HTTP ' + getResp.status);
  }
  var fileInfo = await getResp.json();
  var contenutoAttuale = JSON.parse(decodeBase64Utf8(fileInfo.content));

  var idMassimo = contenutoAttuale.reduce(function (max, nota) {
    return (typeof nota.id === 'number' && nota.id > max) ? nota.id : max;
  }, 0);

  var nuovaNota = {
    id: idMassimo + 1,
    testo: { it: dati.testo_it, en: dati.testo_en },
    data: dati.data,
    foto: dati.foto || null,
    video: dati.video || null,
    camera: dati.camera || null
  };

  contenutoAttuale.push(nuovaNota);

  var putResp = await fetch('https://api.github.com/repos/' + repo + '/contents/' + path, {
    method: 'PUT',
    headers: Object.assign({}, headersBase, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message: 'Nuova nota taccuino: ' + dati.testo_it.substring(0, 60),
      content: encodeBase64Utf8(JSON.stringify(contenutoAttuale, null, 2)),
      sha: fileInfo.sha,
      branch: branch
    })
  });

  if (!putResp.ok) {
    var corpoErrore = await putResp.text();
    throw new Error('GitHub ha rifiutato il salvataggio: HTTP ' + putResp.status + ' — ' + corpoErrore.substring(0, 200));
  }
}

/* ══════════════════════════════════════════════
   TACCUINO — bozze rapide (/nota, /bozze, /modifica, /pubblica, /elimina, /stato)

   Cattura veloce di frammenti grezzi, alternativa leggera al flusso
   conversazionale completo di /nuovanota. Le bozze vivono SOLO su KV
   (PUSH_SUBS, prefisso "bozza:") finché non vengono pubblicate: a
   differenza di /nuovanota, salvare, modificare o eliminare una bozza
   NON genera commit né deploy — solo /pubblica scrive su GitHub,
   esattamente come pubblicaNotaTaccuino già fa per /nuovanota.

   Una bozza pubblicata da qui viene tradotta automaticamente in inglese
   (vedi traduciTesto). Se la traduzione fallisce, js/libro.js (funzione
   t()) fa comunque fallback su .it quando .en è vuoto, quindi non rompe
   la versione inglese del sito.
   ══════════════════════════════════════════════ */

function chiaveBozza(id) {
  return 'bozza:' + id;
}

async function aggiungiBozza(testo, env) {
  var id = Date.now().toString(36);
  var bozza = {
    id: id,
    testo: testo,
    data: dataOggiRoma(),
    creato: Date.now()
  };
  // Nessuna scadenza (a differenza dello stato di /nuovanota): una bozza
  // resta finché non viene pubblicata o eliminata esplicitamente.
  await env.PUSH_SUBS.put(chiaveBozza(id), JSON.stringify(bozza));
  return id;
}

async function elencaBozze(env) {
  var elenco = await env.PUSH_SUBS.list({ prefix: 'bozza:' });
  var bozze = await Promise.all(
    elenco.keys.map(function (voce) {
      return env.PUSH_SUBS.get(voce.name, 'json');
    })
  );
  bozze = bozze.filter(function (b) { return b; });
  bozze.sort(function (a, b) { return a.creato - b.creato; });
  return bozze;
}

async function ottieniBozza(id, env) {
  return await env.PUSH_SUBS.get(chiaveBozza(id), 'json');
}

async function rimuoviBozza(id, env) {
  await env.PUSH_SUBS.delete(chiaveBozza(id));
}

function costruisciElencoBozze(bozze) {
  if (bozze.length === 0) return 'Nessuna bozza in sospeso.';
  return bozze.map(function (b) {
    var anteprima = b.testo.length > 60 ? b.testo.substring(0, 60) + '…' : b.testo;
    return '<code>' + b.id + '</code> (' + b.data + ')\n' + anteprima;
  }).join('\n\n');
}

// Traduzione automatica IT → EN per /pubblica, con lo stesso modello e
// registro editoriale già usato per le caption Instagram (generateCaption):
// sobrio, letterario, mai promozionale. Se fallisce restituisce null — la
// nota resta pubblicabile comunque, solo senza EN (t() in js/libro.js fa
// fallback su .it in quel caso).
async function traduciTesto(testoIt, env) {
  var prompt =
    'Traduci il seguente testo dall\'italiano all\'inglese, per il taccuino di un libro ' +
    'fotografico digitale sul tema del tempo (tracce, memoria, trasformazione, assenza, percezione).\n\n' +
    'Regole:\n' +
    '- Non è una traduzione letterale parola per parola, ma una riscrittura naturale nello ' +
    'stesso registro: sobrio, letterario, mai promozionale\n' +
    '- Mantieni invariati eventuali tag HTML presenti nel testo (es. <br>), nella stessa posizione\n' +
    '- Rispondi SOLO con il testo tradotto, senza virgolette, senza markdown, senza commenti prima o dopo\n\n' +
    'Testo originale:\n' + testoIt;

  try {
    var response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Traduttore editoriale italiano-inglese per un libro fotografico digitale. Voce sobria, letteraria, mai da social media manager. Rispondi sempre e solo col testo tradotto, nient\'altro.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.5
    });

    var tradotto = (response.response || '').trim();
    // Il modello a volte avvolge la risposta tra virgolette: le tolgo.
    tradotto = tradotto.replace(/^["“]|["”]$/g, '').trim();
    return tradotto || null;
  } catch (e) {
    console.error('Errore traduzione AI:', e);
    return null;
  }
}

// Legge l'ultima nota pubblicata direttamente dagli asset statici (stesso
// approccio già usato in getProjectsCache), senza bisogno di chiamare
// GitHub: /stato non ha bisogno del sha del file, solo di leggerlo.
async function ultimaNotaTaccuino(env) {
  var resp = await env.ASSETS.fetch(new Request('https://francescomartolini.art/json/taccuino.json'));
  if (!resp.ok) {
    throw new Error('Impossibile leggere json/taccuino.json dagli asset: HTTP ' + resp.status);
  }
  var note = await resp.json();
  if (note.length === 0) return null;
  return note.reduce(function (piuRecente, nota) {
    return (!piuRecente || nota.id > piuRecente.id) ? nota : piuRecente;
  }, null);
}

export async function handleTelegramUpdate(update, env) {
  var message = update.message;
  if (!message || !message.text) return;

  if (env.TELEGRAM_ALLOWED_CHAT_ID &&
      message.from.id.toString() !== env.TELEGRAM_ALLOWED_CHAT_ID) {
    await sendTelegramMessage(message.chat.id, '⛔ Accesso non autorizzato.', env);
    return;
  }

  var text = message.text.trim();
  var chatId = message.chat.id;

  // Se c'è un flusso /nuovanota in corso per questa chat, il testo che
  // arriva è la risposta al campo attuale, non un comando — a meno che
  // non sia /annulla.
  var statoNota = await getNotaState(chatId, env);
  if (statoNota) {
    if (text === '/annulla') {
      await cancellaNotaState(chatId, env);
      await sendTelegramMessage(chatId, 'Annullato. Nessuna nota è stata salvata.', env);
      return;
    }
    await gestisciPassoNuovaNota(chatId, text, statoNota, env);
    return;
  }

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      '👋 Ciao! Sono il bot di francescomartolini.art\n\n' +
      'Comandi disponibili:\n' +
      '/lista — Vedi tutti i progetti\n' +
      '/post <ID> — Genera caption Instagram IT+EN con AI\n' +
      '/rigenera <ID> — Rigenera caption per un progetto\n' +
      '/nuovanota — Scrivi una nuova nota completa (bilingue, con foto/video/camera)\n\n' +
      'Bozze rapide (solo testo italiano, per scrivere di getto):\n' +
      '/nota <testo> — Salva una bozza\n' +
      '/bozze — Elenco bozze in sospeso\n' +
      '/modifica <id> <testo> — Corregge il testo di una bozza\n' +
      '/pubblica <id> — Pubblica una bozza nel taccuino (EN tradotto automaticamente)\n' +
      '/elimina <id> — Elimina una bozza\n' +
      '/stato — Ultima nota pubblicata', env);
    return;
  }

  if (text === '/nuovanota') {
    var nuovoStato = { step: CAMPI_NOTA[0].chiave, data: { data: dataOggiRoma() } };
    await salvaNotaState(chatId, nuovoStato, env);
    await sendTelegramMessage(chatId,
      'Creiamo una nuova nota per il taccuino (data: ' + nuovoStato.data.data + '). Scrivi /annulla in qualsiasi momento per interrompere.\n\n' +
      CAMPI_NOTA[0].domanda, env);
    return;
  }

  if (text === '/lista') {
    try {
      var projects = await getProjectsCache(env);
      var lines = projects.map(function (p) { return '• <code>' + p.id + '</code> — ' + testoCampo(p.titolo, 'it'); });
      await sendTelegramMessage(chatId,
        '<b>Progetti disponibili:</b>\n\n' + lines.join('\n'), env);
    } catch (e) {
      console.error('Errore /lista:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nel leggere i progetti: ' + e.message, env);
    }
    return;
  }

  if (text.indexOf('/post ') === 0) {
    var postId = text.replace('/post ', '').trim();
    try {
      var postProjects = await getProjectsCache(env);
      var postProject = postProjects.find(function (p) { return p.id === postId; });

      if (!postProject) {
        await sendTelegramMessage(chatId,
          '❌ Progetto "' + postId + '" non trovato.\nUsa /lista per vedere gli ID.', env);
        return;
      }

      await sendTelegramMessage(chatId, '⏳ Sto generando la caption con AI...', env);
      await inviaCaptionProgetto(chatId, postProject, env);
    } catch (e) {
      console.error('Errore /post:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nella generazione: ' + e.message, env);
    }
    return;
  }

  if (text.indexOf('/rigenera ') === 0) {
    var regenId = text.replace('/rigenera ', '').trim();
    try {
      var regenProjects = await getProjectsCache(env);
      var regenProject = regenProjects.find(function (p) { return p.id === regenId; });

      if (!regenProject) {
        await sendTelegramMessage(chatId, '❌ Progetto "' + regenId + '" non trovato.', env);
        return;
      }

      await sendTelegramMessage(chatId, '🔄 Rigenerazione caption in corso...', env);
      await inviaCaptionProgetto(chatId, regenProject, env);
    } catch (e) {
      console.error('Errore /rigenera:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nella rigenerazione: ' + e.message, env);
    }
    return;
  }

  if (text.indexOf('/nota ') === 0) {
    var testoBozza = text.replace('/nota ', '').trim();
    if (!testoBozza) {
      await sendTelegramMessage(chatId, 'Uso: /nota <testo>', env);
      return;
    }
    try {
      var idBozza = await aggiungiBozza(testoBozza, env);
      await sendTelegramMessage(chatId,
        '📝 Bozza salvata: <code>' + idBozza + '</code>\n\n' +
        'Usa /pubblica ' + idBozza + ' per pubblicarla nel taccuino, o /bozze per vederle tutte.', env);
    } catch (e) {
      console.error('Errore /nota:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nel salvare la bozza: ' + e.message, env);
    }
    return;
  }

  if (text === '/nota') {
    await sendTelegramMessage(chatId,
      'Uso: /nota <testo>\n\n' +
      'Per una nota completa (bilingue, con foto/video/camera) usa /nuovanota.', env);
    return;
  }

  if (text === '/bozze') {
    try {
      var elencoBozze = await elencaBozze(env);
      await sendTelegramMessage(chatId, '<b>Bozze in sospeso</b>\n\n' + costruisciElencoBozze(elencoBozze), env);
    } catch (e) {
      console.error('Errore /bozze:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nel leggere le bozze: ' + e.message, env);
    }
    return;
  }

  if (text.indexOf('/pubblica ') === 0) {
    var idPubblica = text.replace('/pubblica ', '').trim();
    try {
      var bozzaDaPubblicare = await ottieniBozza(idPubblica, env);
      if (!bozzaDaPubblicare) {
        await sendTelegramMessage(chatId,
          '❌ Nessuna bozza con id ' + idPubblica + '. Usa /bozze per vedere quelle disponibili.', env);
        return;
      }
      await sendTelegramMessage(chatId, '⏳ Traduzione in corso...', env);
      var testoEnTradotto = await traduciTesto(bozzaDaPubblicare.testo, env);

      await pubblicaNotaTaccuino({
        testo_it: bozzaDaPubblicare.testo,
        testo_en: testoEnTradotto,
        foto: null,
        video: null,
        camera: null,
        data: bozzaDaPubblicare.data
      }, env);
      await rimuoviBozza(idPubblica, env);

      if (testoEnTradotto) {
        await sendTelegramMessage(chatId,
          '✅ Bozza pubblicata nel taccuino (tradotta automaticamente). Il sito si aggiornerà a breve.\n\n' +
          '<b>EN</b>\n' + testoEnTradotto, env);
      } else {
        await sendTelegramMessage(chatId,
          '✅ Bozza pubblicata, ma la traduzione automatica non è riuscita: è stato pubblicato solo il testo italiano.\n' +
          'Puoi aggiungere l\'inglese a mano su GitHub.', env);
      }
    } catch (e) {
      console.error('Errore /pubblica:', e);
      await sendTelegramMessage(chatId,
        '⚠️ Errore nella pubblicazione: ' + e.message +
        '\n\nLa bozza non è andata persa: riprova con /pubblica ' + idPubblica, env);
    }
    return;
  }

  if (text === '/pubblica') {
    await sendTelegramMessage(chatId, 'Uso: /pubblica <id>\n\nUsa /bozze per vedere gli id disponibili.', env);
    return;
  }

  if (text.indexOf('/elimina ') === 0) {
    var idElimina = text.replace('/elimina ', '').trim();
    var bozzaDaEliminare = await ottieniBozza(idElimina, env);
    if (!bozzaDaEliminare) {
      await sendTelegramMessage(chatId, '❌ Nessuna bozza con id ' + idElimina + '.', env);
      return;
    }
    await rimuoviBozza(idElimina, env);
    await sendTelegramMessage(chatId, '🗑️ Bozza ' + idElimina + ' eliminata.', env);
    return;
  }

  if (text === '/elimina') {
    await sendTelegramMessage(chatId, 'Uso: /elimina <id>\n\nUsa /bozze per vedere gli id disponibili.', env);
    return;
  }

  if (text.indexOf('/modifica ') === 0) {
    var restoModifica = text.replace('/modifica ', '').trim();
    var spazioIdx = restoModifica.indexOf(' ');
    if (spazioIdx === -1) {
      await sendTelegramMessage(chatId, 'Uso: /modifica <id> <nuovo testo>', env);
      return;
    }
    var idModifica = restoModifica.substring(0, spazioIdx).trim();
    var nuovoTesto = restoModifica.substring(spazioIdx + 1).trim();
    if (!nuovoTesto) {
      await sendTelegramMessage(chatId, 'Uso: /modifica <id> <nuovo testo>', env);
      return;
    }
    var bozzaDaModificare = await ottieniBozza(idModifica, env);
    if (!bozzaDaModificare) {
      await sendTelegramMessage(chatId,
        '❌ Nessuna bozza con id ' + idModifica + '. Usa /bozze per vedere quelle disponibili.', env);
      return;
    }
    // id, data e creato restano quelli originali: /modifica cambia solo il
    // testo, non "quando" è nata l'idea.
    bozzaDaModificare.testo = nuovoTesto;
    bozzaDaModificare.modificato = Date.now();
    await env.PUSH_SUBS.put(chiaveBozza(idModifica), JSON.stringify(bozzaDaModificare));
    await sendTelegramMessage(chatId, '✏️ Bozza ' + idModifica + ' aggiornata.', env);
    return;
  }

  if (text === '/modifica') {
    await sendTelegramMessage(chatId,
      'Uso: /modifica <id> <nuovo testo>\n\nUsa /bozze per vedere gli id disponibili.', env);
    return;
  }

  if (text === '/stato') {
    try {
      var ultima = await ultimaNotaTaccuino(env);
      if (!ultima) {
        await sendTelegramMessage(chatId, 'Nessuna nota pubblicata ancora.', env);
        return;
      }
      var testoUltima = testoCampo(ultima.testo, 'it');
      var anteprimaUltima = testoUltima.length > 150 ? testoUltima.substring(0, 150) + '…' : testoUltima;
      await sendTelegramMessage(chatId,
        '<b>Ultima nota pubblicata</b>\n\n' +
        '<code>#' + ultima.id + '</code> — ' + ultima.data + '\n' + anteprimaUltima, env);
    } catch (e) {
      console.error('Errore /stato:', e);
      await sendTelegramMessage(chatId, '⚠️ Errore nel leggere lo stato: ' + e.message, env);
    }
    return;
  }

  await sendTelegramMessage(chatId,
    '❓ Comando non riconosciuto.\nUsa /start per vedere la lista comandi.', env);
}
