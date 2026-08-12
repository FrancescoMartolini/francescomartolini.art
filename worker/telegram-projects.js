/* ══════════════════════════════════════════════
   worker/telegram-projects.js — Flusso /nuovoprogetto
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  aggiungiBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato,
  traduciTesto,
  pubblicaSuGithub,
  isValidCloudinaryUrl,
  parseMultipleUrls,
  decodeBase64Utf8
} from './telegram-core.js';

const STEP_PROGETTO = [
  { chiave: 'titolo_it', domanda: '📋 Inserisci il titolo del progetto in italiano.\nLo tradurrò automaticamente in inglese.', obbligatorio: true },
  { chiave: 'anno', domanda: '📅 In che anno è stato realizzato il progetto?\n(es. 2026)', obbligatorio: true, validatore: 'anno' },
  { chiave: 'descrizione', domanda: '📄 Scrivi una descrizione breve del progetto.', obbligatorio: true },
  { chiave: 'copertina', domanda: '🖼️ Inserisci il link dell\'immagine di copertina generato da Cloudinary.\n(O premi /salta)', obbligatorio: false, validatore: 'cloudinary' },
  { chiave: 'about', domanda: '📖 Di cosa parla questo nuovo progetto?', obbligatorio: false },
  { chiave: 'ispirazione', domanda: '💡 Hai preso ispirazione da qualcosa?\n(O premi /salta)', obbligatorio: false },
  { chiave: 'edizione_cartacea', domanda: '📚 Avrà un\'edizione cartacea?\nRispondi "sì" o "no".', obbligatorio: false, tipo: 'boolean' },
  { chiave: 'foto', domanda: '🖼️ Hai già delle foto da pubblicare?\nSe sì, incolla uno o più link Cloudinary separati da spazio o virgola.\n(O premi /salta)', obbligatorio: false, validatore: 'cloudinary_multi' },
  { chiave: 'layout', domanda: '🎨 Che tipo di aspetto vuoi che il sito web mostri?\n\n1. <b>Minimal</b> — Layout molto pulito, tanto spazio bianco\n2. <b>Grid</b> — Immagini organizzate in griglia\n3. <b>Editorial</b> — Impaginazione tipo rivista\n4. <b>Carousel</b> — Sequenza orizzontale di immagini\n5. <b>Fullscreen</b> — Immagini a schermo intero\n6. <b>Mixed</b> — Combinazione libera\n\nRispondi con il numero o il nome.', obbligatorio: false, tipo: 'layout' },
  { chiave: 'embed', domanda: '🔗 All\'interno della pagina ci sono iframe, mappe o Spotify da aggiungere?\nSe sì, inviami i link separati da spazio.\n(O premi /salta)', obbligatorio: false, validatore: 'multi' }
];

const LAYOUTS = [
  { nome: 'minimal', descrizione: 'Layout molto pulito, tanto spazio bianco, immagini grandi e tipografia essenziale.' },
  { nome: 'grid', descrizione: 'Immagini organizzate in griglia, ottimo per progetti con molte foto.' },
  { nome: 'editorial', descrizione: 'Impaginazione tipo rivista, con testi alternati alle immagini.' },
  { nome: 'carousel', descrizione: 'Sequenza orizzontale di immagini, più narrativa e visiva.' },
  { nome: 'fullscreen', descrizione: 'Immagini a schermo intero, forte impatto visivo.' },
  { nome: 'mixed', descrizione: 'Combinazione libera di testo, immagini, video e blocchi embedded.' }
];

export async function handleNuovoProgetto(chatId, env) {
  var id = await aggiungiBozza('project', {}, env);
  
  await salvaStato(chatId, {
    action: 'nuovo_progetto',
    idBozza: id,
    stepCorrente: 0
  }, env);
  
  await sendTelegramMessage(chatId,
    '📋 <b>Nuovo progetto</b>\n\n' +
    STEP_PROGETTO[0].domanda + '\n\n<i>Premi /annulla per uscire in qualsiasi momento.</i>', env);
}

export async function gestisciRispostaProgetto(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId,
      '❌ Flusso annullato. La bozza <code>' + stato.idBozza + '</code> è stata salvata con i dati inseriti finora.\n\n' +
      'Usa /bozza per vederla, /modifica ' + stato.idBozza + ' per modificarla, o /elimina ' + stato.idBozza + ' per cancellarla.', env);
    return;
  }
  
  var step = STEP_PROGETTO[stato.stepCorrente];
  
  if (text === '/salta' && !step.obbligatorio) {
    await avanzaStepProgetto(chatId, stato, env, null);
    return;
  }
  
  var valore = text.trim();
  
  if (step.validatore === 'anno') {
    if (!/^\d{4}$/.test(valore)) {
      await sendTelegramMessage(chatId, '⚠️ L\'anno deve essere un numero di 4 cifre (es. 2026).\n\n' + step.domanda, env);
      return;
    }
  }
  
  if (step.validatore === 'cloudinary' && !isValidCloudinaryUrl(valore)) {
    await sendTelegramMessage(chatId, '⚠️ Il link non sembra valido.\n\n' + step.domanda, env);
    return;
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
  
  if (step.tipo === 'boolean') {
    var lower = valore.toLowerCase();
    if (lower === 'si' || lower === 'sì' || lower === 'yes' || lower === 'y') {
      valore = true;
    } else if (lower === 'no' || lower === 'n') {
      valore = false;
    } else {
      await sendTelegramMessage(chatId, '⚠️ Rispondi "sì" o "no".\n\n' + step.domanda, env);
      return;
    }
  }
  
  if (step.tipo === 'layout') {
    var layoutInput = valore.toLowerCase().trim();
    var layoutValido = LAYOUTS.find(function(l, i) { 
      return l.nome === layoutInput || String(i + 1) === layoutInput;
    });
    
    if (!layoutValido) {
      await sendTelegramMessage(chatId, '⚠️ Layout non valido. Scegli tra:\n\n' + STEP_PROGETTO[8].domanda, env);
      return;
    }
    
    valore = layoutValido.nome;
  }
  
  if (step.validatore === 'multi' && valore !== '-') {
    var urls = parseMultipleUrls(valore);
    valore = urls.length > 0 ? urls : null;
  }
  
  if (valore === '-') valore = null;
  
  await avanzaStepProgetto(chatId, stato, env, valore);
}

export async function handleLayoutSelection(chatId, layoutName, stato, env) {
  await avanzaStepProgetto(chatId, stato, env, layoutName);
}

async function avanzaStepProgetto(chatId, stato, env, valore) {
  var step = STEP_PROGETTO[stato.stepCorrente];
  
  if (step.chiave === 'titolo_it' && valore) {
    var titoloEn = await traduciTesto(valore, env);
    await aggiornaBozza(stato.idBozza, { titolo_it: valore, titolo_en: titoloEn }, env);
    
    if (titoloEn) {
      await sendTelegramMessage(chatId, '📋 Titolo inglese generato: <b>' + titoloEn + '</b>', env);
    }
  } else {
    var update = {};
    update[step.chiave] = valore;
    await aggiornaBozza(stato.idBozza, update, env);
  }
  
  var prossimoStep = stato.stepCorrente + 1;
  
  if (prossimoStep >= STEP_PROGETTO.length) {
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
    await sendTelegramMessage(chatId, STEP_PROGETTO[prossimoStep].domanda, env);
  }
}

export async function pubblicaProgetto(bozza, env) {
  var data = bozza.data;
  
  var repo = env.GITHUB_REPO || 'FrancescoMartolini/francescomartolini.art';
  var branch = env.GITHUB_BRANCH || 'main';
  var path = 'json/progetti.json';
  
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
    throw new Error('Impossibile leggere progetti.json da GitHub: HTTP ' + getResp.status);
  }
  
  var fileInfo = await getResp.json();
  var contenutoAttuale = JSON.parse(decodeBase64Utf8(fileInfo.content));
  
  var idMassimo = contenutoAttuale.reduce(function (max, p) {
    var id = typeof p.id === 'string' ? parseInt(p.id) : p.id;
    return (id > max) ? id : max;
  }, 0);
  
  var nuovoProgetto = {
    id: String(idMassimo + 1),
    titolo: { it: data.titolo_it, en: data.titolo_en },
    anno: data.anno,
    descrizione: data.descrizione,
    copertina: data.copertina || null,
    about: data.about || null,
    ispirazione: data.ispirazione || null,
    edizione_cartacea: data.edizione_cartacea || false,
    foto: data.foto || [],
    layout: data.layout || 'grid',
    embed: data.embed || [],
    creato: new Date().toISOString()
  };
  
  contenutoAttuale.push(nuovoProgetto);
  
  await pubblicaSuGithub(path, contenutoAttuale, 'Nuovo progetto: ' + data.titolo_it, env);
  
  return 'Progetto #' + nuovoProgetto.id + ' aggiunto. Layout: ' + (data.layout || 'grid');
}