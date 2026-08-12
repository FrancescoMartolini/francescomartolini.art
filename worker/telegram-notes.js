/* ══════════════════════════════════════════════
   worker/telegram-notes.js — Flusso /nuovanota
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  dataOggiRoma,
  aggiungiBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato,
  traduciTesto,
  pubblicaSuGithub,
  isValidCloudinaryUrl,
  decodeBase64Utf8
} from './telegram-core.js';

const STEP_NOTA = [
  { chiave: 'testo_it', domanda: '📝 Scrivi la nota.\nLa tradurrò automaticamente in inglese.', obbligatorio: true },
  { chiave: 'camera', domanda: '📷 Con che macchina fotografica hai scattato?\n(O premi /salta)', obbligatorio: false },
  { chiave: 'foto_url', domanda: '🖼️ Vuoi allegare una foto?\nIncolla il link generato da Cloudinary.\n(O premi /salta)', obbligatorio: false, validatore: 'cloudinary' },
  { chiave: 'video_url', domanda: '🎥 Vuoi allegare un video?\nIncolla il link generato da Cloudinary.\n(O premi /salta)', obbligatorio: false, validatore: 'cloudinary' }
];

export async function handleNuovaNota(chatId, env) {
  var id = await aggiungiBozza('note', { data: dataOggiRoma() }, env);
  
  await salvaStato(chatId, {
    action: 'nuova_nota',
    idBozza: id,
    stepCorrente: 0
  }, env);
  
  await sendTelegramMessage(chatId,
    '📝 <b>Nuova nota</b> (data: ' + dataOggiRoma() + ')\n\n' +
    STEP_NOTA[0].domanda + '\n\n<i>Premi /annulla per uscire in qualsiasi momento.</i>', env);
}

export async function gestisciRispostaNota(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId,
      '❌ Flusso annullato. La bozza <code>' + stato.idBozza + '</code> è stata salvata con i dati inseriti finora.\n\n' +
      'Usa /bozza per vederla, /modifica ' + stato.idBozza + ' per modificarla, o /elimina ' + stato.idBozza + ' per cancellarla.', env);
    return;
  }
  
  if (text === '/salta') {
    await avanzaStepNota(chatId, stato, env, null);
    return;
  }
  
  var step = STEP_NOTA[stato.stepCorrente];
  var valore = text.trim();
  
  if (step.validatore === 'cloudinary' && valore !== '-' && !isValidCloudinaryUrl(valore)) {
    await sendTelegramMessage(chatId,
      '⚠️ Il link non sembra valido.\n\n' + step.domanda, env);
    return;
  }
  
  if (valore === '-') valore = null;
  
  await avanzaStepNota(chatId, stato, env, valore);
}

async function avanzaStepNota(chatId, stato, env, valore) {
  var step = STEP_NOTA[stato.stepCorrente];
  
  var update = {};
  update[step.chiave] = valore;
  await aggiornaBozza(stato.idBozza, update, env);
  
  var prossimoStep = stato.stepCorrente + 1;
  
  if (prossimoStep >= STEP_NOTA.length) {
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
    await sendTelegramMessage(chatId, STEP_NOTA[prossimoStep].domanda, env);
  }
}

export async function pubblicaNota(bozza, env) {
  var data = bozza.data;
  
  var testoEn = null;
  if (data.testo_it) {
    testoEn = await traduciTesto(data.testo_it, env);
  }
  
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
    testo: { it: data.testo_it, en: testoEn },
    data: data.data || dataOggiRoma(),
    foto: data.foto_url || null,
    video: data.video_url || null,
    camera: data.camera || null
  };
  
  contenutoAttuale.push(nuovaNota);
  
  await pubblicaSuGithub(path, contenutoAttuale, 'Nuova nota taccuino: ' + data.testo_it.substring(0, 60), env);
  
  return 'Nota #' + nuovaNota.id + ' aggiunta al taccuino.' + (testoEn ? '\n\n<b>EN</b>\n' + testoEn : '');
}