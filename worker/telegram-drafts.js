/* ══════════════════════════════════════════════
   worker/telegram-drafts.js — Gestione generica bozze
   ══════════════════════════════════════════════ */

import {
  sendTelegramMessage,
  sendKeyboard,
  elencaBozze,
  ottieniBozza,
  rimuoviBozza,
  aggiornaBozza,
  salvaStato,
  cancellaStato
} from './telegram-core.js';

import { pubblicaNota } from './telegram-notes.js';
import { pubblicaProgetto } from './telegram-projects.js';
import { pubblicaIntervallo } from './telegram-intervals.js';
import { pubblicaPubblicazione } from './telegram-publications.js';
import { pubblicaCollaborazione } from './telegram-collaborations.js';

const CAMPI_OBBLIGATORI = {
  note: ['testo_it'],
  project: ['titolo_it', 'anno', 'descrizione'],
  interval: ['testo'],
  publication: ['link'],
  collaboration: ['collaboratore', 'anno']
};

const NOMI_COMANDI = {
  note: '/nuovanota',
  project: '/nuovoprogetto',
  interval: '/nuovointervallo',
  publication: '/nuovapubblicazione',
  collaboration: '/nuovacollaborazione'
};

const NOMI_TIPI = {
  note: 'Note',
  project: 'Progetti',
  interval: 'Intervalli',
  publication: 'Pubblicazioni',
  collaboration: 'Collaborazioni'
};

function ottieniCampiMancanti(bozza) {
  var tipo = bozza.type;
  var obbligatori = CAMPI_OBBLIGATORI[tipo] || [];
  var mancanti = [];
  
  for (var campo of obbligatori) {
    var valore = bozza.data[campo];
    if (valore === undefined || valore === null || valore === '') {
      mancanti.push(campo);
    }
  }
  
  return mancanti;
}

function costruisciElencoBozzeRaggruppato(bozze) {
  if (bozze.length === 0) return 'Nessuna bozza in sospeso.';
  
  var gruppi = {};
  for (var tipo of ['project', 'note', 'interval', 'publication', 'collaboration']) {
    gruppi[tipo] = [];
  }
  
  for (var bozza of bozze) {
    var tipo = bozza.type;
    if (!gruppi[tipo]) gruppi[tipo] = [];
    gruppi[tipo].push(bozza);
  }
  
  var output = [];
  
  for (var tipo of ['project', 'note', 'interval', 'publication', 'collaboration']) {
    var lista = gruppi[tipo];
    if (lista.length === 0) continue;
    
    output.push('\n<b>' + NOMI_TIPI[tipo] + '</b>');
    
    for (var bozza of lista) {
      var anteprima = getAnteprimaBozza(bozza);
      var comando = NOMI_COMANDI[tipo];
      output.push(
        '<code>' + comando + '</code> <code>' + bozza.id + '</code> — ' + anteprima
      );
    }
  }
  
  return output.join('\n');
}

function getAnteprimaBozza(bozza) {
  var tipo = bozza.type;
  var data = bozza.data;
  
  switch (tipo) {
    case 'note':
      var testo = data.testo_it || '';
      return testo.length > 50 ? testo.substring(0, 50) + '…' : testo;
    
    case 'project':
      return data.titolo_it || 'Senza titolo';
    
    case 'interval':
      var testo = data.testo || '';
      return testo.length > 50 ? testo.substring(0, 50) + '…' : testo;
    
    case 'publication':
      return data.nome || data.link || 'Pubblicazione';
    
    case 'collaboration':
      return data.collaboratore || 'Collaborazione';
    
    default:
      return 'Bozza';
  }
}

export async function handleBozza(chatId, env) {
  try {
    var bozze = await elencaBozze(env);
    var elenco = costruisciElencoBozzeRaggruppato(bozze);
    await sendTelegramMessage(chatId, '<b>📁 Le tue bozze:</b>' + elenco, env);
  } catch (e) {
    console.error('Errore /bozza:', e);
    await sendTelegramMessage(chatId, '⚠️ Errore nel leggere le bozze: ' + e.message, env);
  }
}

export async function handlePubblica(chatId, idBozza, env) {
  try {
    var bozza = await ottieniBozza(idBozza, env);
    if (!bozza) {
      await sendTelegramMessage(chatId,
        '❌ Nessuna bozza con id <code>' + idBozza + '</code>.\nUsa /bozza per vedere quelle disponibili.', env);
      return;
    }
    
    var campiMancanti = ottieniCampiMancanti(bozza);
    if (campiMancanti.length > 0) {
      await sendTelegramMessage(chatId,
        '⚠️ La bozza <code>' + idBozza + '</code> non può essere pubblicata.\n\n' +
        '<b>Campi mancanti:</b>\n' + campiMancanti.map(function(c) { return '• ' + c; }).join('\n') + '\n\n' +
        'Usa /modifica ' + idBozza + ' per completarla.', env);
      return;
    }
    
    await sendTelegramMessage(chatId, '⏳ Pubblicazione in corso...', env);
    
    var risultato;
    switch (bozza.type) {
      case 'note':
        risultato = await pubblicaNota(bozza, env);
        break;
      case 'project':
        risultato = await pubblicaProgetto(bozza, env);
        break;
      case 'interval':
        risultato = await pubblicaIntervallo(bozza, env);
        break;
      case 'publication':
        risultato = await pubblicaPubblicazione(bozza, env);
        break;
      case 'collaboration':
        risultato = await pubblicaCollaborazione(bozza, env);
        break;
      default:
        throw new Error('Tipo bozza non valido: ' + bozza.type);
    }
    
    await rimuoviBozza(idBozza, env);
    await sendTelegramMessage(chatId,
      '✅ Bozza pubblicata! Il sito si aggiornerà a breve.\n\n' + (risultato || ''), env);
      
  } catch (e) {
    console.error('Errore /pubblica:', e);
    await sendTelegramMessage(chatId,
      '⚠️ Errore nella pubblicazione: ' + e.message +
      '\n\nLa bozza non è andata persa: riprova con /pubblica ' + idBozza, env);
  }
}

export async function handleElimina(chatId, idBozza, env) {
  var bozza = await ottieniBozza(idBozza, env);
  if (!bozza) {
    await sendTelegramMessage(chatId, '❌ Nessuna bozza con id <code>' + idBozza + '</code>.', env);
    return;
  }
  
  var anteprima = getAnteprimaBozza(bozza);
  var tipo = NOMI_TIPI[bozza.type] || bozza.type;
  
  await sendKeyboard(chatId,
    '🗑️ Eliminare la bozza <code>' + idBozza + '</code>?\n\n' +
    '<b>Tipo:</b> ' + tipo + '\n' +
    '<b>Anteprima:</b> ' + anteprima,
    [
      [
        { text: '✅ Elimina', callback_data: 'elimina_conferma_' + idBozza },
        { text: '❌ Annulla', callback_data: 'annulla' }
      ]
    ],
    env
  );
}

export async function handleEliminaConferma(chatId, idBozza, env) {
  await rimuoviBozza(idBozza, env);
  await sendTelegramMessage(chatId, '🗑️ Bozza <code>' + idBozza + '</code> eliminata.', env);
}

export async function handleModifica(chatId, idBozza, env) {
  var bozza = await ottieniBozza(idBozza, env);
  if (!bozza) {
    await sendTelegramMessage(chatId,
      '❌ Nessuna bozza con id <code>' + idBozza + '</code>.\nUsa /bozza per vedere quelle disponibili.', env);
    return;
  }
  
  var tipo = bozza.type;
  var campiMancanti = ottieniCampiMancanti(bozza);
  
  var messaggio = '<b>✏️ Modifica bozza <code>' + idBozza + '</code></b>\n\n';
  messaggio += '<b>Tipo:</b> ' + (NOMI_TIPI[tipo] || tipo) + '\n\n';
  
  messaggio += '<b>Stato attuale:</b>\n';
  messaggio += costruisciRiepilogoBozza(bozza);
  
  if (campiMancanti.length > 0) {
    messaggio += '\n\n<b>⚠️ Campi mancanti:</b>\n';
    messaggio += campiMancanti.map(function(c) { return '• ' + c; }).join('\n');
  }
  
  messaggio += '\n\n<b>Cosa vuoi modificare?</b>';
  
  var bottoni = [];
  var campi = getCampiModificabili(tipo);
  
  for (var i = 0; i < campi.length; i += 2) {
    var riga = [];
    for (var j = i; j < Math.min(i + 2, campi.length); j++) {
      var campo = campi[j];
      riga.push({
        text: campo.label,
        callback_data: 'modifica_campo_' + idBozza + '_' + campo.chiave
      });
    }
    bottoni.push(riga);
  }
  
  await sendKeyboard(chatId, messaggio, bottoni, env);
}

function costruisciRiepilogoBozza(bozza) {
  var tipo = bozza.type;
  var data = bozza.data;
  var linee = [];
  
  switch (tipo) {
    case 'note':
      linee.push('📝 Testo IT: ' + (data.testo_it ? '✅' : '❌ mancante'));
      linee.push('📝 Testo EN: ' + (data.testo_en ? '✅' : '❌ (generato alla pubblicazione)'));
      linee.push('📷 Camera: ' + (data.camera || '❌ mancante'));
      linee.push('🖼️ Foto: ' + (data.foto_url ? '✅' : '❌ mancante'));
      linee.push('🎥 Video: ' + (data.video_url ? '✅' : '❌ mancante'));
      break;
    
    case 'project':
      linee.push('📋 Titolo IT: ' + (data.titolo_it || '❌ mancante'));
      linee.push('📅 Anno: ' + (data.anno || '❌ mancante'));
      linee.push('📄 Descrizione: ' + (data.descrizione ? '✅' : '❌ mancante'));
      linee.push('🖼️ Copertina: ' + (data.copertina ? '✅' : '❌ mancante'));
      linee.push('📖 About: ' + (data.about ? '✅' : '❌ mancante'));
      linee.push('💡 Ispirazione: ' + (data.ispirazione || '❌ mancante'));
      linee.push('📚 Ed. cartacea: ' + (data.edizione_cartacea !== undefined ? (data.edizione_cartacea ? 'Sì' : 'No') : '❌ mancante'));
      linee.push('🖼️ Foto: ' + (data.foto && data.foto.length > 0 ? data.foto.length + ' foto' : '❌ mancante'));
      linee.push('🎨 Layout: ' + (data.layout || '❌ mancante'));
      linee.push('🔗 Embed: ' + (data.embed && data.embed.length > 0 ? data.embed.length + ' embed' : '❌ mancante'));
      break;
    
    case 'interval':
      linee.push('📝 Testo: ' + (data.testo ? '✅' : '❌ mancante'));
      linee.push('🖼️ Immagini: ' + (data.immagini && data.immagini.length > 0 ? data.immagini.length + ' immagini' : '❌ mancante'));
      break;
    
    case 'publication':
      linee.push('🔗 Link: ' + (data.link ? '✅' : '❌ mancante'));
      linee.push('📛 Nome: ' + (data.nome || '❌ mancante'));
      break;
    
    case 'collaboration':
      linee.push('👥 Collaboratore: ' + (data.collaboratore || '❌ mancante'));
      linee.push('📅 Anno: ' + (data.anno || '❌ mancante'));
      linee.push('🖼️ Foto: ' + (data.foto && data.foto.length > 0 ? data.foto.length + ' foto' : '❌ mancante'));
      break;
  }
  
  return linee.join('\n');
}

function getCampiModificabili(tipo) {
  switch (tipo) {
    case 'note':
      return [
        { chiave: 'testo_it', label: '📝 Testo' },
        { chiave: 'camera', label: '📷 Camera' },
        { chiave: 'foto_url', label: '🖼️ Foto' },
        { chiave: 'video_url', label: '🎥 Video' }
      ];
    
    case 'project':
      return [
        { chiave: 'titolo_it', label: '📋 Titolo' },
        { chiave: 'anno', label: '📅 Anno' },
        { chiave: 'descrizione', label: '📄 Descrizione' },
        { chiave: 'copertina', label: '🖼️ Copertina' },
        { chiave: 'about', label: '📖 About' },
        { chiave: 'ispirazione', label: '💡 Ispirazione' },
        { chiave: 'edizione_cartacea', label: '📚 Ed. cartacea' },
        { chiave: 'foto', label: '🖼️ Foto' },
        { chiave: 'layout', label: '🎨 Layout' },
        { chiave: 'embed', label: '🔗 Embed' }
      ];
    
    case 'interval':
      return [
        { chiave: 'testo', label: '📝 Testo' },
        { chiave: 'immagini', label: '🖼️ Immagini' }
      ];
    
    case 'publication':
      return [
        { chiave: 'link', label: '🔗 Link' },
        { chiave: 'nome', label: '📛 Nome' }
      ];
    
    case 'collaboration':
      return [
        { chiave: 'collaboratore', label: '👥 Collaboratore' },
        { chiave: 'anno', label: '📅 Anno' },
        { chiave: 'foto', label: '🖼️ Foto' }
      ];
    
    default:
      return [];
  }
}

export async function handleModificaCampo(chatId, idBozza, campo, env) {
  await salvaStato(chatId, {
    action: 'modifica_campo',
    idBozza: idBozza,
    campo: campo
  }, env);
  
  var bozza = await ottieniBozza(idBozza, env);
  var valoreAttuale = bozza.data[campo];
  
  var prompt = getPromptCampo(campo, valoreAttuale);
  await sendTelegramMessage(chatId, prompt, env);
}

function getPromptCampo(campo, valoreAttuale) {
  var prefisso = valoreAttuale ? 'Valore attuale: ' + (typeof valoreAttuale === 'object' ? JSON.stringify(valoreAttuale) : valoreAttuale) + '\n\n' : '';
  
  switch (campo) {
    case 'testo_it':
      return prefisso + 'Scrivi il nuovo testo della nota.';
    case 'camera':
      return prefisso + 'Inserisci la camera/fotocamera usata (o "-" per rimuovere).';
    case 'foto_url':
      return prefisso + 'Incolla il link Cloudinary della foto (o "-" per rimuovere).';
    case 'video_url':
      return prefisso + 'Incolla il link Cloudinary del video (o "-" per rimuovere).';
    case 'titolo_it':
      return prefisso + 'Inserisci il nuovo titolo del progetto.';
    case 'anno':
      return prefisso + 'Inserisci l\'anno (es. 2026).';
    case 'descrizione':
      return prefisso + 'Scrivi la nuova descrizione.';
    case 'copertina':
      return prefisso + 'Incolla il link Cloudinary della copertina (o "-" per rimuovere).';
    case 'about':
      return prefisso + 'Scrivi di cosa parla il progetto.';
    case 'ispirazione':
      return prefisso + 'Inserisci l\'ispirazione (o "-" per rimuovere).';
    case 'edizione_cartacea':
      return prefisso + 'Ci sarà un\'edizione cartacea? Rispondi "sì" o "no".';
    case 'foto':
      return prefisso + 'Incolla i link Cloudinary delle foto separati da spazio (o "-" per rimuovere tutte).';
    case 'layout':
      return prefisso + 'Scegli un layout:\n\n1. Minimal\n2. Grid\n3. Editorial\n4. Carousel\n5. Fullscreen\n6. Mixed\n\nRispondi con il numero o il nome.';
    case 'embed':
      return prefisso + 'Incolla i link da embeddare separati da spazio (o "-" per rimuovere tutti).';
    case 'testo':
      return prefisso + 'Scrivi il nuovo testo dell\'intervallo.';
    case 'immagini':
      return prefisso + 'Incolla i link Cloudinary delle immagini separati da spazio (o "-" per rimuovere tutte).';
    case 'link':
      return prefisso + 'Incolla il nuovo link della pubblicazione.';
    case 'nome':
      return prefisso + 'Inserisci il nuovo nome della pubblicazione (o "-" per rimuovere).';
    case 'collaboratore':
      return prefisso + 'Inserisci il nome del nuovo collaboratore.';
    default:
      return prefisso + 'Inserisci il nuovo valore.';
  }
}

export async function gestisciRispostaModificaCampo(chatId, text, stato, env) {
  if (text === '/annulla') {
    await cancellaStato(chatId, env);
    await sendTelegramMessage(chatId, '❌ Modifica annullata.', env);
    return;
  }
  
  var valore = text.trim();
  if (valore === '-') valore = null;
  
  await aggiornaBozza(stato.idBozza, { [stato.campo]: valore }, env);
  await cancellaStato(chatId, env);
  
  await sendTelegramMessage(chatId, '✅ Campo aggiornato.\n\nUsa /modifica ' + stato.idBozza + ' per continuare a modificare.', env);
}