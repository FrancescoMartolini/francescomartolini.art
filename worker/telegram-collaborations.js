/* ══════════════════════════════════════════════
   worker/telegram-collaborations.js — Flusso /nuovacollaborazione
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  aggiungiBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato,
  pubblicaSuGithub,
  isValidCloudinaryUrl,
  parseMultipleUrls,
  decodeBase64Utf8
} from './telegram-core.js';

const STEP_COLLABORAZIONE = [
  { 
    chiave: 'collaboratore', 
    domanda: '👥 Hai una nuova collaborazione.\nCon chi è stata fatta?\nScrivi il nome della persona, studio, associazione o istituzione.', 
    obbligatorio: true
  },
  { 
    chiave: 'foto', 
    domanda: '🖼️ Hai delle foto della collaborazione?\nSe sì, incolla uno o più link Cloudinary separati da spazio.\n\n(O premi /salta)', 
    obbligatorio: false,
    validatore: 'cloudinary_multi'
  },
  { 
    chiave: 'anno', 
    domanda: '📅 In che anno è stata fatta la collaborazione?\n(es. 2026)', 
    obbligatorio: true,
    validatore: 'anno'
  }
];

export async function handleNuovaCollaborazione(chatId, env) {
  var id = await aggiungiBozza('collaboration', {}, env);
  
  await salvaStato(chatId, {
    action: 'nuova_collaborazione',
    idBozza: id,
    stepCorrente: 0
  }, env);
  
  await sendTelegramMessage(chatId,
    '🤝 <b>Nuova collaborazione</b>\n\n' +
    STEP_COLLABORAZIONE[0].domanda + '\n\n<i>Premi /annulla per uscire in qualsiasi momento.</i>', env);
}

export async function gestisciRispostaCollaborazione(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId,
      '❌ Flusso annullato. La bozza <code>' + stato.idBozza + '</code> è stata salvata con i dati inseriti finora.\n\n' +
      'Usa /bozza per vederla, /modifica ' + stato.idBozza + ' per modificarla, o /elimina ' + stato.idBozza + ' per cancellarla.', env);
    return;
  }
  
  var step = STEP_COLLABORAZIONE[stato.stepCorrente];
  
  if (text === '/salta' && !step.obbligatorio) {
    await avanzaStepCollaborazione(chatId, stato, env, null);
    return;
  }
  
  var valore = text.trim();
  
  if (step.validatore === 'anno') {
    if (!/^\d{4}$/.test(valore)) {
      await sendTelegramMessage(chatId, '⚠️ L\'anno deve essere un numero di 4 cifre (es. 2026).\n\n' + step.domanda, env);
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
  
  await avanzaStepCollaborazione(chatId, stato, env, valore);
}

async function avanzaStepCollaborazione(chatId, stato, env, valore) {
  var step = STEP_COLLABORAZIONE[stato.stepCorrente];
  
  var update = {};
  update[step.chiave] = valore;
  await aggiornaBozza(stato.idBozza, update, env);
  
  var prossimoStep = stato.stepCorrente + 1;
  
  if (prossimoStep >= STEP_COLLABORAZIONE.length) {
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
    await sendTelegramMessage(chatId, STEP_COLLABORAZIONE[prossimoStep].domanda, env);
  }
}

// Inserisce la trasformazione standard del sito (larghezza, qualità e formato auto)
// dopo /image/upload/. Se l'URL ha già una trasformazione, resta com'è.
function cloudinaryConLarghezza(url, larghezza) {
  var marker = '/image/upload/';
  var i = url.indexOf(marker);
  if (i === -1) return url;
  var resto = url.slice(i + marker.length);
  if (!/^v\d+\//.test(resto)) return url;
  return url.slice(0, i + marker.length) + 'w_' + larghezza + ',q_auto,f_auto/' + resto;
}

export async function pubblicaCollaborazione(bozza, env) {
  var data = bozza.data;
  
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';
  var path = 'json/collaborazioni.json';
  
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
    throw new Error('Impossibile leggere collaborazioni.json da GitHub: HTTP ' + getResp.status);
  }
  
  var fileInfo = await getResp.json();
  var contenutoAttuale = JSON.parse(decodeBase64Utf8(fileInfo.content));
  
  // Stesso schema delle voci scritte a mano: id "ClienteN", titolo, descrizione,
  // anno, foto (copertina, stringa singola) e galleria (le altre foto).
  var numeroMassimo = contenutoAttuale.reduce(function (max, item) {
    var m = String(item.id).match(/(\d+)$/);
    var n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  
  var fotoBozza = Array.isArray(data.foto) ? data.foto : [];
  
  var nuovaCollaborazione = {
    id: 'Cliente' + (numeroMassimo + 1),
    titolo: data.collaboratore,
    descrizione: '',
    anno: data.anno,
    foto: fotoBozza.length > 0 ? cloudinaryConLarghezza(fotoBozza[0], 600) : '',
    galleria: fotoBozza.slice(1).map(function (u) { return cloudinaryConLarghezza(u, 1400); })
  };
  
  contenutoAttuale.push(nuovaCollaborazione);
  
  await pubblicaSuGithub(path, contenutoAttuale, 'Nuova collaborazione: ' + data.collaboratore, env);
  
  return 'Collaborazione ' + nuovaCollaborazione.id + ' aggiunta con ' + data.collaboratore + '.';
}