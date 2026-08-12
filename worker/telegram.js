/* ══════════════════════════════════════════════
   worker/telegram.js — bot Telegram completo

   Questo file è il punto di ingresso per tutte le funzionalità del bot.
   Gestisce il routing dei comandi e delega la logica ai moduli specifici.
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  getStato,
  cancellaStato,
  testoCampo
} from './telegram-core.js';

import { handleNuovaNota, gestisciRispostaNota } from './telegram-notes.js';
import { handleNuovoProgetto, gestisciRispostaProgetto, handleLayoutSelection } from './telegram-projects.js';
import { handleNuovoIntervallo, gestisciRispostaIntervallo, handleGeneratedAction } from './telegram-intervals.js';
import { handleNuovaPubblicazione, gestisciRispostaPubblicazione } from './telegram-publications.js';
import { handleNuovaCollaborazione, gestisciRispostaCollaborazione } from './telegram-collaborations.js';
import { 
  handleBozza, 
  handlePubblica, 
  handleElimina, 
  handleEliminaConferma,
  handleModifica, 
  handleModificaCampo,
  gestisciRispostaModificaCampo 
} from './telegram-drafts.js';

async function getProjectsCache(env) {
  var CACHE_KEY = 'telegram_projects_cache';
  var cached = await env.PUSH_SUBS.get(CACHE_KEY, 'json');
  if (cached) return cached;

  var resp = await env.ASSETS.fetch(new Request('https://francescomartolini.art/json/progetti.json'));
  if (!resp.ok) {
    throw new Error('Impossibile leggere json/progetti.json dagli asset: HTTP ' + resp.status);
  }
  var projects = await resp.json();
  await env.PUSH_SUBS.put(CACHE_KEY, JSON.stringify(projects), { expirationTtl: 3600 });
  return projects;
}

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

async function handleCallbackQuery(callbackQuery, env) {
  var chatId = callbackQuery.message.chat.id;
  var data = callbackQuery.data;
  
  if (data.startsWith('pubblica_')) {
    var idBozza = data.replace('pubblica_', '');
    await handlePubblica(chatId, idBozza, env);
    return;
  }
  
  if (data.startsWith('salva_bozza_')) {
    var idBozza = data.replace('salva_bozza_', '');
    await sendTelegramMessage(chatId,
      '📁 Bozza <code>' + idBozza + '</code> salvata.\n\nUsa /bozza per vederla, /modifica ' + idBozza + ' per modificarla, o /pubblica ' + idBozza + ' quando sei pronto.', env);
    return;
  }
  
  if (data.startsWith('elimina_conferma_')) {
    var idBozza = data.replace('elimina_conferma_', '');
    await handleEliminaConferma(chatId, idBozza, env);
    return;
  }
  
  if (data === 'annulla') {
    await sendTelegramMessage(chatId, '❌ Operazione annullata.', env);
    return;
  }
  
  if (data.startsWith('layout_')) {
    var layoutName = data.replace('layout_', '');
    var stato = await getStato(chatId, env);
    if (stato && stato.action === 'nuovo_progetto') {
      await handleLayoutSelection(chatId, layoutName, stato, env);
    }
    return;
  }
  
  if (data.startsWith('use_generated_') || data.startsWith('regenerate_') || data.startsWith('write_manual_')) {
    var action = data.split('_')[0] + '_' + data.split('_')[1];
    var stato = await getStato(chatId, env);
    if (stato && stato.action === 'nuovo_intervallo') {
      await handleGeneratedAction(chatId, action, stato, env);
    }
    return;
  }
  
  if (data.startsWith('modifica_campo_')) {
    var parts = data.replace('modifica_campo_', '').split('_');
    var idBozza = parts[0];
    var campo = parts[1];
    await handleModificaCampo(chatId, idBozza, campo, env);
    return;
  }
}

export async function handleTelegramUpdate(update, env) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
    return;
  }
  
  var message = update.message;
  if (!message || !message.text) return;

  if (env.TELEGRAM_ALLOWED_CHAT_ID &&
      message.from.id.toString() !== env.TELEGRAM_ALLOWED_CHAT_ID) {
    await sendTelegramMessage(message.chat.id, '⛔ Accesso non autorizzato.', env);
    return;
  }

  var text = message.text.trim();
  var chatId = message.chat.id;

  var stato = await getStato(chatId, env);
  
  if (stato) {
    if (text === '/annulla') {
      await cancellaStato(chatId, env);
      await sendTelegramMessage(chatId, '❌ Operazione annullata.', env);
      return;
    }
    
    switch (stato.action) {
      case 'nuova_nota':
        await gestisciRispostaNota(chatId, text, stato, env);
        return;
      
      case 'nuovo_progetto':
        await gestisciRispostaProgetto(chatId, text, stato, env);
        return;
      
      case 'nuovo_intervallo':
        await gestisciRispostaIntervallo(chatId, text, stato, env);
        return;
      
      case 'nuova_pubblicazione':
        await gestisciRispostaPubblicazione(chatId, text, stato, env);
        return;
      
      case 'nuova_collaborazione':
        await gestisciRispostaCollaborazione(chatId, text, stato, env);
        return;
      
      case 'modifica_campo':
        await gestisciRispostaModificaCampo(chatId, text, stato, env);
        return;
    }
  }

if (text === '/start') {
  await sendTelegramMessage(chatId,
    '👋 Ciao! Sono il bot di francescomartolini.art\n\n' +
    '<b>Creazione contenuti:</b>\n' +
    '/nuovanota — Nuova nota del taccuino\n' +
    '/nuovoprogetto — Nuovo progetto fotografico\n' +
    '/nuovointervallo — Nuovo intervallo\n' +
    '/nuovapubblicazione — Nuova pubblicazione\n' +
    '/nuovacollaborazione — Nuova collaborazione\n\n' +
    '<b>Gestione bozze:</b>\n' +
    '/bozza — Elenco tutte le bozze\n' +
    '/modifica &lt;id&gt; — Modifica una bozza\n' +
    '/pubblica &lt;id&gt; — Pubblica una bozza\n' +
    '/elimina &lt;id&gt; — Elimina una bozza\n\n' +
    '<b>Progetti esistenti:</b>\n' +
    '/lista — Vedi tutti i progetti\n' +
    '/post &lt;id&gt; — Genera caption Instagram IT+EN\n' +
    '/rigenera &lt;id&gt; — Rigenera caption\n\n' +
    '<b>Comandi generali:</b>\n' +
    '/annulla — Annulla operazione in corso', env);
  return;
}

  if (text === '/nuovanota') {
    await handleNuovaNota(chatId, env);
    return;
  }

  if (text === '/nuovoprogetto') {
    await handleNuovoProgetto(chatId, env);
    return;
  }

  if (text === '/nuovointervallo') {
    await handleNuovoIntervallo(chatId, env);
    return;
  }

  if (text === '/nuovapubblicazione') {
    await handleNuovaPubblicazione(chatId, env);
    return;
  }

  if (text === '/nuovacollaborazione') {
    await handleNuovaCollaborazione(chatId, env);
    return;
  }

  if (text === '/bozza' || text === '/bozze') {
    await handleBozza(chatId, env);
    return;
  }

  if (text.indexOf('/pubblica ') === 0) {
    var idPubblica = text.replace('/pubblica ', '').trim();
    await handlePubblica(chatId, idPubblica, env);
    return;
  }

  if (text.indexOf('/elimina ') === 0) {
    var idElimina = text.replace('/elimina ', '').trim();
    await handleElimina(chatId, idElimina, env);
    return;
  }

  if (text.indexOf('/modifica ') === 0) {
    var idModifica = text.replace('/modifica ', '').trim();
    await handleModifica(chatId, idModifica, env);
    return;
  }

  if (text === '/lista') {
    try {
      var projects = await getProjectsCache(env);
      var lines = projects.map(function (p) { 
        return '• <code>' + p.id + '</code> — ' + testoCampo(p.titolo, 'it'); 
      });
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

  await sendTelegramMessage(chatId,
    '❓ Comando non riconosciuto.\nUsa /start per vedere la lista comandi.', env);
}