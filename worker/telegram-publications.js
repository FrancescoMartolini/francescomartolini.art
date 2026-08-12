/* ══════════════════════════════════════════════
   worker/telegram-publications.js — Flusso /nuovapubblicazione
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  aggiungiBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato,
  pubblicaSuGithub,
  decodeBase64Utf8
} from './telegram-core.js';

const STEP_PUBBLICAZIONE = [
  { 
    chiave: 'link', 
    domanda: '🔗 Hai pubblicato qualcosa o sei stato pubblicato?\nIncolla il link della pubblicazione.', 
    obbligatorio: true,
    validatore: 'url'
  },
  { 
    chiave: 'nome', 
    domanda: '📛 Vuoi dare un nome a questa pubblicazione?\n(es. nome della rivista, mostra, progetto editoriale)\n\n(O premi /salta)', 
    obbligatorio: false
  }
];

export async function handleNuovaPubblicazione(chatId, env) {
  var id = await aggiungiBozza('publication', {}, env);
  
  await salvaStato(chatId, {
    action: 'nuova_pubblicazione',
    idBozza: id,
    stepCorrente: 0
  }, env);
  
  await sendTelegramMessage(chatId,
    '📰 <b>Nuova pubblicazione</b>\n\n' +
    STEP_PUBBLICAZIONE[0].domanda + '\n\n<i>Premi /annulla per uscire in qualsiasi momento.</i>', env);
}

export async function gestisciRispostaPubblicazione(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId,
      '❌ Flusso annullato. La bozza <code>' + stato.idBozza + '</code> è stata salvata con i dati inseriti finora.\n\n' +
      'Usa /bozza per vederla, /modifica ' + stato.idBozza + ' per modificarla, o /elimina ' + stato.idBozza + ' per cancellarla.', env);
    return;
  }
  
  var step = STEP_PUBBLICAZIONE[stato.stepCorrente];
  
  if (text === '/salta' && !step.obbligatorio) {
    await avanzaStepPubblicazione(chatId, stato, env, null);
    return;
  }
  
  var valore = text.trim();
  
  if (step.validatore === 'url') {
    try {
      new URL(valore);
    } catch (e) {
      await sendTelegramMessage(chatId, '⚠️ Il link non sembra valido. Assicurati di includere http:// o https://\n\n' + step.domanda, env);
      return;
    }
  }
  
  if (valore === '-') valore = null;
  
  await avanzaStepPubblicazione(chatId, stato, env, valore);
}

async function avanzaStepPubblicazione(chatId, stato, env, valore) {
  var step = STEP_PUBBLICAZIONE[stato.stepCorrente];
  
  var update = {};
  update[step.chiave] = valore;
  await aggiornaBozza(stato.idBozza, update, env);
  
  var prossimoStep = stato.stepCorrente + 1;
  
  if (prossimoStep >= STEP_PUBBLICAZIONE.length) {
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
    await sendTelegramMessage(chatId, STEP_PUBBLICAZIONE[prossimoStep].domanda, env);
  }
}

export async function pubblicaPubblicazione(bozza, env) {
  var data = bozza.data;
  
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';
  var path = 'json/pubblicazioni.json';
  
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
    throw new Error('Impossibile leggere pubblicazioni.json da GitHub: HTTP ' + getResp.status);
  }
  
  var fileInfo = await getResp.json();
  var contenutoAttuale = JSON.parse(decodeBase64Utf8(fileInfo.content));
  
  var idMassimo = contenutoAttuale.reduce(function (max, item) {
    var id = typeof item.id === 'string' ? parseInt(item.id) : item.id;
    return (id > max) ? id : max;
  }, 0);
  
  var nuovaPubblicazione = {
    id: String(idMassimo + 1),
    link: data.link,
    nome: data.nome || null,
    creato: new Date().toISOString()
  };
  
  contenutoAttuale.push(nuovaPubblicazione);
  
  await pubblicaSuGithub(path, contenutoAttuale, 'Nuova pubblicazione: ' + (data.nome || data.link.substring(0, 40)), env);
  
  return 'Pubblicazione #' + nuovaPubblicazione.id + ' aggiunta.';
}