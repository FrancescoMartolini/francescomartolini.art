/* ══════════════════════════════════════════════
   worker/telegram-intervals.js — Flusso /nuovointervallo
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  aggiungiBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato,
  pubblicaSuGithub,
  parseMultipleUrls,
  isValidCloudinaryUrl,
  decodeBase64Utf8
} from './telegram-core.js';

const STEP_INTERVALLO = [
  { 
    chiave: 'testo', 
    domanda: '📝 Hai già un testo da inserire?\n\n• Se sì, scrivilo ora\n• Se no, scrivi "genera" e creerò una frase con AI', 
    obbligatorio: true,
    tipo: 'text_or_generate'
  },
  { 
    chiave: 'immagini', 
    domanda: '🖼️ Hai già delle immagini?\n\n• Se sì, incolla i link Cloudinary separati da spazio\n• Se no, verranno salvate nelle bozze\n\n(O premi /salta)', 
    obbligatorio: false,
    validatore: 'cloudinary_multi'
  }
];

async function generaFraseAI(env) {
  var prompt = 
    'Genera una singola frase breve (1-2 righe) per un libro fotografico digitale sul tema del tempo ' +
    '(tracce, memoria, trasformazione, assenza, percezione).\n\n' +
    'Regole:\n' +
    '- Registro sobrio, letterario, mai promozionale\n' +
    '- Deve sembrare una frase scritta a mano su un taccuino\n' +
    '- Nessuna emoji\n' +
    '- Rispondi SOLO con la frase, senza virgolette\n\n';

  try {
    var response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Scrittore editoriale. Voce sobria, letteraria.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    var frase = (response.response || '').trim();
    frase = frase.replace(/^["\u201C\u201D]|["\u201C\u201D]$/g, '').trim();
    return frase || null;
  } catch (e) {
    console.error('Errore generazione frase AI:', e);
    return null;
  }
}

export async function handleNuovoIntervallo(chatId, env) {
  var id = await aggiungiBozza('interval', {}, env);
  
  await salvaStato(chatId, {
    action: 'nuovo_intervallo',
    idBozza: id,
    stepCorrente: 0
  }, env);
  
  await sendTelegramMessage(chatId,
    '📝 <b>Nuovo intervallo</b>\n\n' +
    STEP_INTERVALLO[0].domanda + '\n\n<i>Premi /annulla per uscire in qualsiasi momento.</i>', env);
}

export async function gestisciRispostaIntervallo(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId,
      '❌ Flusso annullato. La bozza <code>' + stato.idBozza + '</code> è stata salvata con i dati inseriti finora.\n\n' +
      'Usa /bozza per vederla, /modifica ' + stato.idBozza + ' per modificarla, o /elimina ' + stato.idBozza + ' per cancellarla.', env);
    return;
  }
  
  var step = STEP_INTERVALLO[stato.stepCorrente];
  
  if (text === '/salta' && !step.obbligatorio) {
    await avanzaStepIntervallo(chatId, stato, env, null);
    return;
  }
  
  var valore = text.trim();
  
  if (step.tipo === 'text_or_generate' && valore.toLowerCase() === 'genera') {
    await sendTelegramMessage(chatId, '⏳ Sto generando una frase con AI...', env);
    var fraseGenerata = await generaFraseAI(env);
    
    if (fraseGenerata) {
      await sendKeyboard(chatId,
        'Ho generato questa frase:\n\n<i>"' + fraseGenerata + '"</i>\n\nVuoi usarla?',
        [
          [
            { text: '✅ Sì, usala', callback_data: 'use_generated_' + stato.idBozza },
            { text: '🔁 Rigenera', callback_data: 'regenerate_' + stato.idBozza },
            { text: '✏️ Scrivi io', callback_data: 'write_manual_' + stato.idBozza }
          ]
        ],
        env
      );
      
      stato.fraseGenerata = fraseGenerata;
      await salvaStato(chatId, stato, env);
      return;
    } else {
      await sendTelegramMessage(chatId, '⚠️ Non sono riuscito a generare una frase. Scrivi tu il testo.\n\n' + step.domanda, env);
      return;
    }
  }
  
  if (step.validatore === 'cloudinary_multi') {
    if (valore === '-' || valore === '') {
      valore = null;
    } else {
      var urls = parseMultipleUrls(valore);
      for (var url of urls) {
        if (!isValidCloudinaryUrl(url)) {
          await sendTelegramMessage(chatId, '⚠️ Uno dei link non sembra valido: ' + url + '\n\n' + step.domanda, env);
          return;
        }
      }
      valore = urls;
    }
  }
  
  if (valore === '-') valore = null;
  
  await avanzaStepIntervallo(chatId, stato, env, valore);
}

export async function handleGeneratedAction(chatId, action, stato, env) {
  if (action === 'use_generated') {
    await avanzaStepIntervallo(chatId, stato, env, stato.fraseGenerata);
  } else if (action === 'regenerate') {
    await sendTelegramMessage(chatId, '🔄 Sto rigenerando la frase...', env);
    var nuovaFrase = await generaFraseAI(env);
    
    if (nuovaFrase) {
      stato.fraseGenerata = nuovaFrase;
      await salvaStato(chatId, stato, env);
      
      await sendKeyboard(chatId,
        'Ho generato questa frase:\n\n<i>"' + nuovaFrase + '"</i>\n\nVuoi usarla?',
        [
          [
            { text: '✅ Sì, usala', callback_data: 'use_generated_' + stato.idBozza },
            { text: '🔁 Rigenera', callback_data: 'regenerate_' + stato.idBozza },
            { text: '✏️ Scrivi io', callback_data: 'write_manual_' + stato.idBozza }
          ]
        ],
        env
      );
    } else {
      await sendTelegramMessage(chatId, '⚠️ Non sono riuscito a rigenerare. Scrivi tu il testo.\n\n' + STEP_INTERVALLO[0].domanda, env);
    }
  } else if (action === 'write_manual') {
    await sendTelegramMessage(chatId, '✏️ Scrivi tu il testo dell\'intervallo:', env);
  }
}

async function avanzaStepIntervallo(chatId, stato, env, valore) {
  var step = STEP_INTERVALLO[stato.stepCorrente];
  
  var update = {};
  update[step.chiave] = valore;
  await aggiornaBozza(stato.idBozza, update, env);
  
  var prossimoStep = stato.stepCorrente + 1;
  
  if (prossimoStep >= STEP_INTERVALLO.length) {
    await cancellaStato(chatId, env);
    await sendKeyboard(chatId,
      '✅ <b>Bozza completata!</b>\n\nID: <code>' + stato.idBozza + '</code>\n\nCosa vuoi fare?',
      [
        [
          { text: '🌐 Pubblica', callback_data: 'pubblica_' + stato.idBozza },
          { text: '📁 Salva in bozza', callback_data: 'salva_bozza_' + stato.idBozza }
        ]
      ],
      env
    );
  } else {
    stato.stepCorrente = prossimoStep;
    await salvaStato(chatId, stato, env);
    await sendTelegramMessage(chatId, STEP_INTERVALLO[prossimoStep].domanda, env);
  }
}

export async function pubblicaIntervallo(bozza, env) {
  var data = bozza.data;
  
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';
  var path = 'json/intervalli.json';
  
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
    throw new Error('Impossibile leggere intervalli.json da GitHub: HTTP ' + getResp.status);
  }
  
  var fileInfo = await getResp.json();
  var contenutoAttuale = JSON.parse(decodeBase64Utf8(fileInfo.content));
  
  var idMassimo = contenutoAttuale.reduce(function (max, item) {
    var id = typeof item.id === 'string' ? parseInt(item.id) : item.id;
    return (id > max) ? id : max;
  }, 0);
  
  var nuovoIntervallo = {
    id: String(idMassimo + 1),
    testo: data.testo,
    immagini: data.immagini || [],
    creato: new Date().toISOString()
  };
  
  contenutoAttuale.push(nuovoIntervallo);
  
  await pubblicaSuGithub(path, contenutoAttuale, 'Nuovo intervallo: ' + (data.testo ? data.testo.substring(0, 40) : 'senza testo'), env);
  
  return 'Intervallo #' + nuovoIntervallo.id + ' aggiunto.';
}