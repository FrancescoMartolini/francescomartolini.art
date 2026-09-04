/* ============================================
   LIBRO ENGINE — nucleo
Stato globale, helper puri, caricamento e parsing dati (JSON/CSV), formattazione,
orologio. Nessuna dipendenza da altri file libro-*.js: deve essere caricato per primo.
   ============================================ */

'use strict';



// Attualmente non utilizzate: il taccuino legge solo json/taccuino.json
// (vedi caricaDati() e README, sezione TACCUINO). Tenute qui pronte per
// una eventuale riattivazione della lettura live dal foglio Google.
//const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1174325309&single=true&output=csv';
//const SHEETS_URL_EN = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1079818483&single=true&output=csv';

// ── Segnalibro: ricorda a che pagina il lettore era arrivato ──
const SEGNALIBRO_KEY = 'libro-pagina';

const stato = {
  lang: localStorage.getItem('lang') || 'it',
  paginaCorrente: 0,
  totPagine: 0,
  inTransizione: false,
  progetti: [],
  intervalli: [],
  taccuino: [],
  collaborazioni: [],
  intro: {},
  playlist: {},
  sliderIdx: 0
};

// ── i18n: legge un campo bilingue { it, en } con fallback su IT ──
// Funziona anche su semplici stringhe (retrocompatibile con dati non ancora tradotti).
function t(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const lang = (typeof getCurrentLang === 'function' && getCurrentLang()) || localStorage.getItem('lang') || 'it';
  return field[lang] || field.it || '';
}
// Stringhe di interfaccia (menu, bottoni...) — definite in i18n.js
function tu(key) {
  return (typeof t_ui === 'function' && t_ui(key)) || '';
}

const FRASE_FIN = {
  it: 'Alcune tracce richiedono anni per diventare visibili.',
  en: 'Some traces take years to become visible.'
};

const EPILOGHI = [
  'Il tempo lascia tracce.',
  'Questo archivio rimane aperto.',
  'Ogni immagine conserva una domanda.',
  'Alcune tracce richiedono anni per diventare visibili.',
  'Nessuna fotografia ferma il tempo.',
  'Le immagini continuano a cambiare dopo essere state scattate.',
  'Ogni progetto è un intervallo.',
  'La memoria modifica ciò che conserva.',
  'Ogni archivio è una forma di attesa.',
  'Ciò che resta racconta più di ciò che accade.',
  'Le tracce sopravvivono agli eventi.',
];

function inizializzaFin() {
  const elenco = stato.epiloghi?.length ? stato.epiloghi : EPILOGHI;
  //const frase = elenco[Math.floor(Math.random() * elenco.length)]; // => Elenco dinamico come da variabile sopra
  const frase = t(FRASE_FIN);

  // Mobile — inietta il testo; la transizione parte in aggiornaUI quando si arriva a #fin
  const elMobile = document.getElementById('fin-epilogo');
  if (elMobile) elMobile.textContent = frase;
  const anno = document.getElementById('fin-anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // Desktop — appare subito con fade (già visibile da scroll)
  const elDesktop = document.getElementById('epilogo-desktop');
  if (elDesktop) {
    elDesktop.textContent = t(FRASE_FIN);
    requestAnimationFrame(() => elDesktop.classList.add('visibile'));
  }
}

const $ = id => document.getElementById(id);
const crea = tag => document.createElement(tag);
const isMobile = () => window.innerWidth <= 768;

function formatData(s) {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNum(n) { return String(n).padStart(2, '0'); }

function progettoPubblicato(pr) {
  return pr && pr.pubblicato !== false;
}

// ── PLAYLIST: la collana non è trattata come un progetto fotografico ──
// Qualunque voce il cui id inizi per "playlist" (compreso un eventuale
// "PLAYLIST" residuo senza numero) non va mai mostrata come progetto normale
function isEntryPlaylist(pr) {
  return !!(pr && pr.id && /^playlist/i.test(pr.id));
}

// Un volume vero e proprio della collana: deve avere un numero (PLAYLIST.00,
// PLAYLIST.01, ...). Un "PLAYLIST" residuo senza numero viene ignorato ovunque.
function isVolumePlaylist(pr) {
  return !!(pr && pr.id && /^playlist\.\d+/i.test(pr.id));
}

// Progetti "veri" (esclude qualunque voce della collana PLAYLIST)
function progettiPrincipali() {
  return stato.progetti.filter(pr => !isEntryPlaylist(pr));
}

// Volumi PLAYLIST ordinati per numero (PLAYLIST.00, PLAYLIST.01, ...)
function volumiPlaylist() {
  return stato.progetti
    .filter(isVolumePlaylist)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function numeroVolume(id) {
  const m = /(\d+)/.exec(id || '');
  return m ? formatNum(m[1]) : '';
}

// Restituisce " · N volumi" (singolare/plurale, i18n) — quanti capitoli/volumi
// compongono la collana PLAYLIST. Usato accanto al kicker "Collana editoriale"
// e nell'intestazione "La serie" dentro l'archivio.
function labelVolumiPlaylist() {
  const n = volumiPlaylist().length;
  if (!n) return '';
  const parola = n === 1 ? tu('playlist.volumeSing') : tu('playlist.volumiPlur');
  return ` · ${n} ${parola}`;
}

// Identificatore riservato della card "PLAYLIST" dentro la lista Progetti
const ID_CARD_PLAYLIST = '__playlist__';

// Card sintetica: rappresenta l'intera collana PLAYLIST come un unico
// elemento dentro "Progetti" (non è un progetto vero, apre l'archivio)
function cardPlaylist() {
  const hero = (stato.playlist && stato.playlist.hero) || {};
  const primoVolume = volumiPlaylist()[0];
  const descrizione = {
    it: (hero.sottotitolo && hero.sottotitolo.it || '').replace(/\n/g, ' '),
    en: (hero.sottotitolo && hero.sottotitolo.en || '').replace(/\n/g, ' ')
  };
  const kicker = hero.kicker || { it: 'Collana', en: 'Series' };
  const kickerIt = typeof kicker === 'string' ? kicker : (kicker.it || 'Collana');
  const kickerEn = typeof kicker === 'string' ? kicker : (kicker.en || kicker.it || 'Series');
  const conta = labelVolumiPlaylist();
  return {
    id: ID_CARD_PLAYLIST,
    titolo: hero.titolo || 'PLAYLIST',
    anno: {
      it: `${kickerIt}${conta}`,
      en: `${kickerEn}${conta}`
    },
    descrizione,
    immagine_copertina: (primoVolume && primoVolume.immagine_copertina) || '',
    pubblicato: true
  };
}

// Progetti così come vengono mostrati in griglia/indice: i veri progetti
// più, in una posizione fissa, la card PLAYLIST che apre l'archivio
function progettiVisualizzati() {
  const principali = progettiPrincipali();
  const arr = principali.slice();
  arr.splice(Math.min(2, arr.length), 0, cardPlaylist());
  return arr;
}

// ── CSV Parser ──
// ── Parser CSV robusto: legge l'intestazione delle colonne invece di
//    assumere una posizione fissa, così funziona sia col foglio vecchio
//    (senza colonna EN) sia con quello nuovo, in qualunque ordine tu le metta ──
function parseRigaCsv(riga) {
  const celle = []; let inQ = false, cell = '';
  for (let c = 0; c < riga.length; c++) {
    const ch = riga[c];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { celle.push(cell.trim()); cell = ''; continue; }
    cell += ch;
  }
  celle.push(cell.trim());
  return celle;
}

function normalizzaHeader(h) {
  return h.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // rimuove accenti
}

const ALIAS_COLONNE = {
  testo:  ['testo', 'testo it', 'nota', 'nota it'],
  testoEn:['testo en', 'en', 'english', 'nota en'],
  data:   ['data', 'date'],
  foto:   ['foto', 'photo', 'immagine'],
  video:  ['video', 'filmato', 'video url', 'url video'],
  camera: ['camera']
};

function trovaIndiceColonna(headers, chiave) {
  const alias = ALIAS_COLONNE[chiave];
  return headers.findIndex(h => alias.includes(normalizzaHeader(h)));
}

function parseCsv(csv) {
  const righe = csv.trim().split('\n');
  const headerRiga = parseRigaCsv(righe[0]).map(normalizzaHeader);

  // Trova ogni colonna per nome; se non la trova usa la posizione classica
  // (0=testo,1=data,2=foto,3=camera) come fallback per compatibilità.
  let idxTesto   = trovaIndiceColonna(headerRiga, 'testo');
  let idxTestoEn = trovaIndiceColonna(headerRiga, 'testoEn');
  let idxData    = trovaIndiceColonna(headerRiga, 'data');
  let idxFoto    = trovaIndiceColonna(headerRiga, 'foto');
  let idxVideo   = trovaIndiceColonna(headerRiga, 'video');
  let idxCamera  = trovaIndiceColonna(headerRiga, 'camera');

  if (idxTesto === -1) idxTesto = 0;
  if (idxData  === -1) idxData  = 1;
  if (idxFoto  === -1) idxFoto  = 2;
  if (idxCamera === -1) idxCamera = 3;
  // idxTestoEn e idxVideo restano -1 se le colonne non esistono ancora:
  // nessun fallback posizionale, così i fogli vecchi continuano a funzionare
  // senza EN e senza video finché non aggiungi quelle colonne.

  return righe.slice(1).map((riga, i) => {
    const celle = parseRigaCsv(riga);
    const testoIt = celle[idxTesto] || '';
    const testoEn = idxTestoEn !== -1 ? (celle[idxTestoEn] || '') : '';
    return {
      id: i + 1,
      testo: testoEn ? { it: testoIt, en: testoEn } : testoIt,
      data: celle[idxData] || '',
      foto: celle[idxFoto] || null,
      video: idxVideo !== -1 ? (celle[idxVideo] || null) : null,
      camera: celle[idxCamera] || null
    };
  }).filter(v => (typeof v.testo === 'string' ? v.testo : v.testo.it));
}

// ── Carica dati ──
async function caricaDati() {
  const [progetti, intervalli, collaborazioni, intro, pubblicazioni, epiloghi, playlist] = await Promise.all([
    fetch('json/progetti.json').then(r => r.json()),
    fetch('json/intervalli.json').then(r => r.json()),
    fetch('json/collaborazioni.json').then(r => r.json()),
    fetch('json/intro.json').then(r => r.json()).catch(() => ({ testo: '' })),
    fetch('json/pubblicazioni.json').then(r => r.json()).catch(() => []),
    fetch('json/epiloghi.json').then(r => r.json()).catch(() => []),
    fetch('json/playlist.json').then(r => r.json()).catch(() => ({}))
  ]);
  Object.assign(stato, { progetti, intervalli, collaborazioni, intro, pubblicazioni, epiloghi, playlist });

  // ── Google Sheets DISATTIVATO (vedi README, sezione TACCUINO) ──
  // Il taccuino ora si scrive solo su json/taccuino.json (a mano o via
  // bot Telegram /nuovanota). Il blocco sotto tentava prima una lettura
  // live dal foglio Google pubblicato in CSV, con fallback al JSON in
  // caso di errore; resta qui commentato, pronto da riattivare
  // rimuovendo i commenti, nel caso servisse di nuovo in futuro.
  //
  // try {
  //   const r = await fetch(localStorage.getItem('lang') === 'en' ? SHEETS_URL_EN : SHEETS_URL);
  //   if (!r.ok) throw new Error();
  //   stato.taccuino = parseCsv(await r.text()).sort((a, b) => new Date(b.data) - new Date(a.data));
  //   _cacheTaccuino = null;
  // } catch {
  //   try {
  //     stato.taccuino = (await fetch('json/taccuino.json').then(r => r.json()))
  //       .sort((a, b) => new Date(b.data) - new Date(a.data));
  //   } catch { stato.taccuino = []; }
  //   _cacheTaccuino = null;
  // }

  try {
    stato.taccuino = (await fetch('json/taccuino.json').then(r => r.json()))
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  } catch { stato.taccuino = []; }
  _cacheTaccuino = null;
}

// ── Orologio ──
function avviaOrologio() {
  function tick() {
    const o = new Date();
    const pad = n => String(n).padStart(2, '0');
    const oo = `${pad(o.getHours())}:${pad(o.getMinutes())}:${pad(o.getSeconds())}`;
    const dd = `${pad(o.getDate())}.${pad(o.getMonth() + 1)}.${o.getFullYear()}`;
    document.querySelectorAll('.ora-live').forEach(el => {
      if (el.offsetParent !== null || el.closest('#orologio-sticky')) el.textContent = oo;
    });
    document.querySelectorAll('.data-live').forEach(el => {
      if (el.offsetParent !== null || el.closest('#orologio-sticky')) el.textContent = dd;
    });
  }
  tick(); setInterval(tick, 1000);
}

// ── Cloudinary: srcset responsive a partire dall'URL già trasformato ──
// Le immagini nei JSON arrivano con una larghezza fissa incollata
// (es. ".../upload/w_1400,q_auto,f_auto/..."): un iPhone e un monitor
// esterno scaricano lo stesso peso. Qui si genera un srcset con più
// varianti di larghezza riusando la stessa trasformazione (q_auto,
// f_auto restano invariati), così il browser sceglie da solo il file
// giusto per il proprio viewport/densità.
const CLD_WIDTHS = [400, 700, 1000, 1400, 2000];
function cldSrcset(src) {
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)([^/]+)\/(.+)$/.exec(src);
  if (!m) return null; // non è un URL Cloudinary trasformato (es. asset locale) → niente srcset
  const [, base, transform, resto] = m;
  if (!/\bw_\d+\b/.test(transform)) return null;
  // c_limit evita l'upscaling oltre l'originale per le varianti più larghe
  const conLimit = /\bc_(limit|fit|scale|fill|thumb|crop)\b/.test(transform) ? transform : `c_limit,${transform}`;
  return CLD_WIDTHS
    .map(w => `${base}${conLimit.replace(/w_\d+/, `w_${w}`)}/${resto} ${w}w`)
    .join(', ');
}

// ── Immagine protetta ──
// `sizes` = quanto spazio occupa l'immagine nel layout (default: pagina intera).
// Passarlo esplicitamente nelle griglie desktop (es. "33vw" per una griglia a 3
// colonne) riduce ulteriormente il peso scaricato rispetto al default.
function creaImg(src, alt, eager, sizes) {
  const wrap = crea('div');
  wrap.className = 'img-wrap';
  if (src) {
    const img = crea('img');
    img.src = src; img.alt = alt || ''; img.draggable = false;
    img.loading = eager ? 'eager' : 'lazy';
    const srcset = cldSrcset(src);
    if (srcset) { img.srcset = srcset; img.sizes = sizes || '100vw'; }
    const overlay = crea('div'); overlay.className = 'img-overlay';
    wrap.appendChild(img); wrap.appendChild(overlay);
    img.onerror = () => {
      img.remove(); overlay.remove();
      wrap.classList.add('img-wrap--vuota');
      wrap.textContent = alt || '';
    };
  } else {
    wrap.classList.add('img-wrap--vuota');
    wrap.textContent = alt || '';
  }
  return wrap;
}

// Conta le fotografie uniche di un progetto (schema contenuto[] e sections[]),
// includendo anche la galleria di primo livello. Usato per la voce "N fotografie"
// mostrata nelle pagine progetto (mobile e desktop).
function contaFotoProgetto(pr) {
  const url = new Set();

  (pr.contenuto || []).forEach(b => {
    if (b.tipo === 'immagine' && b.valore) url.add(b.valore);
    if (b.tipo === 'galleria' && Array.isArray(b.valore)) b.valore.forEach(u => u && url.add(u));
  });
  (pr.sections || []).forEach(s => {
    if (s.type === 'image' && s.src) url.add(s.src);
    if (s.type === 'imageText' && s.image) url.add(s.image);
    if (s.type === 'gallery' && Array.isArray(s.images)) s.images.forEach(u => u && url.add(u));
  });
  (pr.galleria || []).forEach(u => u && url.add(u));

  return url.size;
}

// Restituisce " · N fotografie" (singolare/plurale, i18n) da affiancare all'anno.
// Stringa vuota se il progetto non ha ancora fotografie (es. in lavorazione).
function labelFotoProgetto(pr) {
  const n = contaFotoProgetto(pr);
  if (!n) return '';
  const parola = n === 1 ? tu('progetti_extra.fotoSing') : tu('progetti_extra.fotoPlur');
  return ` · ${n} ${parola}`;
}
