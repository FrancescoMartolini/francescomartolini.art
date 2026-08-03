/* ============================================
   LIBRO ENGINE v5 — Francesco Martolini .art
   Desktop: scroll editoriale
   Mobile: libro a pagine
   + cursore adattivo, slider progetti, overlay pagine
   + orologio sticky, favicon dinamica, Google Sheets
   ============================================ */

'use strict';

const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1174325309&single=true&output=csv';
const SHEETS_URL_EN = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?gid=1079818483&single=true&output=csv';

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
  return {
    id: ID_CARD_PLAYLIST,
    titolo: hero.titolo || 'PLAYLIST',
    anno: hero.kicker || { it: 'Collana', en: 'Series' },
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

// ── Favicon dinamica ──
function aggiorneFavicon(lettera) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a" rx="6"/><text x="16" y="24" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#fafaf8" text-anchor="middle">${lettera}</text></svg>`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = crea('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
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

  try {
    //const r = await fetch(SHEETS_URL);
    const r = await fetch(localStorage.getItem('lang') === 'en' ? SHEETS_URL_EN : SHEETS_URL);
    if (!r.ok) throw new Error();
    stato.taccuino = parseCsv(await r.text()).sort((a, b) => new Date(b.data) - new Date(a.data));
    _cacheTaccuino = null;
  } catch {
    try {
      stato.taccuino = (await fetch('json/taccuino.json').then(r => r.json()))
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    } catch { stato.taccuino = []; }
    _cacheTaccuino = null;
  }
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

// ── Orologio sticky desktop ──
function avviaOrologioSticky() {
  if (isMobile()) return;
  const wrap = crea('div'); wrap.id = 'orologio-sticky';
  wrap.innerHTML = `<div class="data-live"></div><div class="ora-live"></div><span class="ora-label-small">ora corrente</span>`;
  document.body.appendChild(wrap);
  const hero = document.querySelector('.desktop-hero');
  if (!hero) return;
  const obs = new IntersectionObserver(entries => {
    wrap.style.opacity = entries[0].isIntersecting ? '0' : '1';
  }, { threshold: 0.3 });
  obs.observe(hero);
}

// ── Immagine protetta ──
function creaImg(src, alt, eager) {
  const wrap = crea('div');
  wrap.className = 'img-wrap';
  if (src) {
    const img = crea('img');
    img.src = src; img.alt = alt || ''; img.draggable = false;
    img.loading = eager ? 'eager' : 'lazy';
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

// ── Header data/ora mobile (riutilizzato ovunque) ──
function creaHeader() {
  const ph = crea('div'); ph.className = 'pagina-header';
  ph.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>
    <button class="tema-toggle-btn tema-toggle-mobile" aria-label="${tu('nav.temaChiaroScuro') || 'Tema chiaro/scuro'}" data-i18n-attr="aria-label:nav.temaChiaroScuro">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>`;
  return ph;
}

// ── Pagina mobile generica con header ──
function creaPaginaMobile(favicon, titolo) {
  const p = crea('div'); p.className = 'page pagina-progetto-mobile';
  p.dataset.favicon = favicon; p.dataset.titolo = titolo;
  return p;
}

// ── Wrapper mobile-page-content con header ──
function creaMobilePageContent() {
  const mpc = crea('div'); mpc.className = 'mobile-page-content';
  mpc.appendChild(creaHeader());
  const pc = crea('div'); pc.className = 'pagina-corpo';
  mpc.appendChild(pc);
  return { mpc, pc };
}

// ── Media (foto o video) di una voce taccuino ──
// Se la voce ha un video, ha priorità sulla foto (che può comunque
// diventarne il poster). Nessun autoplay: coerente col ritmo lento
// e silenzioso del libro — parte solo se il visitatore lo avvia.
function creaMediaTaccuino(v, wrapClass) {
  if (v.video) {
    const fw = crea('div'); fw.className = wrapClass;
    const video = crea('video');
    video.src = v.video;
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (v.foto) video.poster = v.foto;
    fw.appendChild(video);
    return fw;
  }
  if (v.foto) {
    const fw = crea('div'); fw.className = wrapClass;
    const img = crea('img'); img.src = v.foto; img.alt = ''; img.draggable = false;
    fw.appendChild(img);
    return fw;
  }
  return null;
}

// ── Voce taccuino mobile ──
function creaPaginaTaccuinoMobile(v) {
  const pt = creaPaginaMobile('T', 'Taccuino');
  const { mpc, pc } = creaMobilePageContent();
  const tw = crea('div'); tw.className = 'taccuino-wrap';
    tw.style.overflowY = 'auto';
    tw.style.maxHeight = '80vh'; 
  const media = creaMediaTaccuino(v, 'taccuino-foto');
  if (media) tw.appendChild(media);
  tw.innerHTML += `<p class="taccuino-frase">${t(v.testo)}</p>${v.camera ? `<p class="taccuino-voce-camera"> ${v.camera}</p><p class="taccuino-data">${formatData(v.data)}</p>` : ''}`;
  pc.appendChild(tw); pt.appendChild(mpc);
  return pt;
}

// ── Inserisci voce taccuino intercalata ──
function inserisciTaccuinoSeDisponibile(container, tIdx) {
  if (stato.taccuino[tIdx]) {
    container.appendChild(creaPaginaTaccuinoMobile(stato.taccuino[tIdx]));
    return tIdx + 1;
  }
  return tIdx;
}

// ════════════════════════════════
// CURSORE ADATTIVO
// ════════════════════════════════
function avviaCursore() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const c = crea('div'); c.id = 'cursore';
  const r = crea('div'); r.id = 'cursore-ring';
  document.body.appendChild(c); document.body.appendChild(r);
  let rx = 0, ry = 0, mx = 0, my = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    c.style.left = mx + 'px'; c.style.top = my + 'px';
    if (!avviaCursore._t) {
      avviaCursore._t = setTimeout(() => {
        avviaCursore._t = null;
        c.style.visibility = 'hidden'; r.style.visibility = 'hidden';
        const elSotto = document.elementFromPoint(mx, my);
        c.style.visibility = ''; r.style.visibility = '';
        if (elSotto) document.body.classList.toggle('cursore-invertito', isColorDark(trovaBgReale(elSotto)));
      }, 100);
    }
  });

  function animaRing() {
    rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
    r.style.left = rx + 'px'; r.style.top = ry + 'px';
    requestAnimationFrame(animaRing);
  }
  animaRing();
}

function trovaBgReale(el) {
  let current = el;
  while (current && current !== document.documentElement) {
    const bg = window.getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    current = current.parentElement;
  }
  return window.getComputedStyle(document.body).backgroundColor;
}

function isColorDark(colorStr) {
  if (!colorStr) return false;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)/);
  if (!match) return false;
  const [, r, g, b, a] = match;
  if (parseFloat(a) === 0) return false;
  return (0.299 * +r + 0.587 * +g + 0.114 * +b) / 255 < 0.4;
}

// ════════════════════════════════
// DESKTOP — Popola sezioni
// ════════════════════════════════
function popolaDesktop() {
  // Hero image
  const heroImg = $('hero-img');
  const primoProgetto = progettiPrincipali()[0];
  if (heroImg && primoProgetto) {
    heroImg.appendChild(creaImg(primoProgetto.immagine_copertina, t(primoProgetto.titolo), true));
  }

  popolaSliderProgetti();

  // Taccuino colonne
  const colonne = $('taccuino-colonne-desktop');
  if (colonne) {
    stato.taccuino.slice(0, 3).forEach(v => {
      const col = crea('div'); col.className = 'taccuino-col-voce';
      col.innerHTML = `
        <p class="taccuino-col-data">${formatData(v.data)}</p>
        <p class="taccuino-col-frase">${t(v.testo)}</p>
        <button class="taccuino-col-expand" onclick="apriTaccuino()">+</button>
      `;
      colonne.appendChild(col);
    });
  }

  // Studi griglia
  const studiGriglia = $('studi-griglia-desktop');
  if (studiGriglia) {
    stato.intervalli.flatMap(iv => iv.immagini).slice(0, 5).forEach((src, i) => {
      const cell = crea('div'); cell.className = 'studio-img';
      cell.appendChild(creaImg(src, `Studio ${i + 1}`));
      studiGriglia.appendChild(cell);
    });
  }

  // Pubblicazioni desktop
  const pubWrap = $('pub-desktop-wrap');
  const pubLista = $('pub-desktop-lista');
  if (pubWrap && pubLista && stato.pubblicazioni.length > 0) {
    pubWrap.style.display = '';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-desktop-item';
      item.innerHTML = `
        ${pub.immagine ? '<div class="pub-desktop-img"></div>' : ''}
        <div class="pub-desktop-info">
          <p class="pub-desktop-titolo">${pub.titolo}</p>
          <p class="pub-desktop-anno">${pub.anno}</p>
          ${pub.link ? `<a class="pub-desktop-link" href="${pub.link}" target="_blank" rel="noopener">Vedi →</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-desktop-img').appendChild(creaImg(pub.immagine, pub.titolo));
      pubLista.appendChild(item);
    });
  }

  const annoEl = $('footer-anno');
  if (annoEl) annoEl.textContent = new Date().getFullYear();
}

// ── Slider progetti ──
function popolaSliderProgetti() {
  const griglia = $('progetti-griglia-desktop');
  if (!griglia) return;

  const elenco = progettiVisualizzati();
  elenco.forEach((pr, i) => {
    const inLavorazione = pr.pubblicato === false;

    const card = crea('div');
    card.className = 'progetto-card' + (inLavorazione ? ' in-lavorazione' : '');

    card.innerHTML = `
      <div class="progetto-card-img"></div>
      <p class="progetto-card-num">${formatNum(i + 1)}</p>
      <p class="progetto-card-titolo">${t(pr.titolo).toUpperCase()}</p>
      <p class="progetto-card-anno">${t(pr.anno)}</p>
    `;

    card.querySelector('.progetto-card-img').appendChild(
      creaImg(pr.immagine_copertina, t(pr.titolo))
    );

    if (pr.id === ID_CARD_PLAYLIST) {
      card.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
    } else if (progettoPubblicato(pr)) {
      card.addEventListener('click', () => apriProgetto(pr.id));
    }

    griglia.appendChild(card);
  });

  const sx = $('proj-sx'), dx = $('proj-dx');
  if (!sx || !dx) return;
  const visibili = 4, tot = elenco.length;
  if (tot <= visibili) { sx.hidden = true; dx.hidden = true; return; }
  sx.hidden = true;

  function aggiorna() {
    const larghezzaCard = griglia.querySelector('.progetto-card')?.offsetWidth || 0;
    griglia.style.transform = `translateX(-${stato.sliderIdx * (larghezzaCard + 24)}px)`;
    sx.hidden = stato.sliderIdx === 0;
    dx.hidden = stato.sliderIdx >= tot - visibili;
  }
  sx.addEventListener('click', () => { stato.sliderIdx = Math.max(0, stato.sliderIdx - 1); aggiorna(); });
  dx.addEventListener('click', () => { stato.sliderIdx = Math.min(tot - visibili, stato.sliderIdx + 1); aggiorna(); });
}

// ════════════════════════════════
// OVERLAY PAGINE
// ════════════════════════════════
function apriPagina(tipo) {
  const overlay = $('overlay-pagina');
  const contenuto = $('overlay-contenuto');
  contenuto.innerHTML = '';

  const infoSezione = SEZIONI_URL[tipo];
  if (infoSezione) document.title = `${infoSezione.titolo} — francescomartolini.art`;

  switch (tipo) {

    case 'tutti-progetti':
      contenuto.innerHTML = `<h1 class="overlay-titolo">${tu('overlay.tuttiProgetti')}</h1><div class="tutti-progetti-griglia" id="tutti-proj-grid"></div>`;
      progettiVisualizzati().forEach((pr, i) => {
        const inLavorazione = pr.pubblicato === false;
        const card = crea('div'); card.className = 'tutti-card' + (inLavorazione ? ' in-lavorazione' : '');
        card.innerHTML = `
          <div class="tutti-card-img"></div>
          <p class="tutti-card-num">0${i + 1}</p>
          <h2 class="tutti-card-titolo">${t(pr.titolo)}</h2>
          <p class="tutti-card-anno">${t(pr.anno)}</p>
          <p class="tutti-card-desc">${t(pr.descrizione)}</p>
          ${inLavorazione ? `<p class="tutti-card-wip">${tu('overlay.inLavorazione')}</p>` : ''}
        `;
        card.querySelector('.tutti-card-img').appendChild(creaImg(pr.immagine_copertina, t(pr.titolo)));
        if (pr.id === ID_CARD_PLAYLIST) {
          card.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
        } else if (!inLavorazione) {
          card.addEventListener('click', () => apriProgetto(pr.id));
        }
        $('tutti-proj-grid').appendChild(card);
      });
      break;

    case 'tutti-studi':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('menu.intervalli')}</h1>
        <p class="overlay-sottotitolo">${tu('intervalli.descrizione')}</p>
        <div class="tutti-studi-griglia" id="tutti-studi-grid"></div>
      `;
      // Apri subito l'overlay, poi inserisci le immagini a blocchi
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      (function inserisciABlocchi() {
        const immagini = stato.intervalli.flatMap(iv => iv.immagini);
        const grid = $('tutti-studi-grid');
        let i = 0;
        const BLOCCO = 6; // quante immagini per frame
        function step() {
          const fine = Math.min(i + BLOCCO, immagini.length);
          for (; i < fine; i++) {
            const cell = crea('div'); cell.className = 'tutti-studio-img';
            cell.appendChild(creaImg(immagini[i], `Studio ${i + 1}`));
            grid.appendChild(cell);
          }
          if (i < immagini.length) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      })();
      return; // già aperto sopra, salta il codice finale
      break;

    case 'come-funziona':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo overlay-titolo-nota">${tu('overlay.note.titolo')}</h1>
        <div class="nota-testo">
          <p>${tu('overlay.note.p1')}</p>
          <p>${tu('overlay.note.p2')}</p>
          <p>${tu('overlay.note.p3')}</p>
        </div>
      `;
      break;

    case 'chi-sono-pagina': {
      const SVG_MAIL = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`;
      const SVG_IG = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>`;
      const SVG_TEL = `<svg viewBox="0 0 24 24" class="contatto-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>`;
      const SVG_WA = `<svg viewBox="0 0 24 24" class="contatto-icon"><circle cx="12" cy="12" r="10"/><path d="M8.5 7.5c.3-.3.8-.3 1.1 0l1.2 1.2c.3.3.3.8 0 1.1l-.6.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.6c.3-.3.8-.3 1.1 0l1.2 1.2c.3.3.3.8 0 1.1-.8.8-2 .9-3 .4-3-1.4-5.4-3.8-6.8-6.8-.5-1-.4-2.2.4-3z"fill="white"/></svg>`;
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('chiSono.titolo')}</h1>
        <div class="chi-sono-esteso">
          <div class="chi-sono-esteso-testo">
            <!-- <h2>Francesco Martolini</h2> -->
            <h2>${tu('chiSono.doveNasce')}</h2>
              <p class="introduzione-testo">${t(stato.intro.testo).replace(/\n/g, '<br>')}</p>
            <h2>${tu('chiSono.biografia')}</h2>
            <p>${tu('chiSono.overlayP1')}</p>
            <p>${tu('chiSono.overlayP2')}</p>
            <p>${tu('chiSono.overlayP3')}</p>
            <div class="chi-sono-contatti-esteso">
              <p class="contatti-label" style="margin-bottom:4px;">${tu('chiSono.contattiLabel')}</p>
              <p class="overlay-nota-contatti">${tu('chiSono.contattiNota')}</p>
              <a class="contatto-btn" href="mailto:info@francescomartolini.art">${SVG_MAIL}info@francescomartolini.art</a>
              <a class="contatto-btn" href="https://instagram.com/francesco_martolini_ph" target="_blank" rel="noopener">${SVG_IG}francesco_martolini_ph</a>
              <a class="contatto-btn" href="tel:+393930336642">${SVG_TEL}+39 393 033 6642</a>
              <a class="contatto-btn" href="https://wa.me/393930336642?text=Ciao%2C%20vorrei%20collaborare%20con%20te%0AQuesta%20%C3%A8%20la%20mia%20idea%20cosa%20ne%20pensi%3F" aria-label="Chat with us on WhatsApp" target="_blank" rel="noopener noreferrer">${SVG_WA} ${tu('chiSono.chatWhatsapp')}</a>
            </div>
          </div>
          <div class="chi-sono-esteso-img" id="chi-sono-overlay-img"></div>
        </div>
      `;
      const imgWrap = $('chi-sono-overlay-img');
      if (imgWrap && stato.progetti[0]) {
        imgWrap.appendChild(creaImg("./images/chi-sono-img.jpg", 'Francesco Martolini'));
      }
      break;
    }

    case 'collaborazioni-pagina':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('collab.titolo')}</h1>
        <p class="collab-intro">${tu('collab.intro')}</p>
        <div class="collab-griglia" id="collab-grid"></div>
        <div class="collab-footer">
          <p class="overlay-sottotitolo">${tu('collab.perCollaborazioni')}</p>
          <a href="mailto:info@francescomartolini.art" class="section-link">info@francescomartolini.art →</a>
        </div>
        ${stato.pubblicazioni.length > 0 ? `
        <!-- div class="pubblicazioni-sezione">
          <h2 class="pubblicazioni-titolo">Publications</h2>
          <div class="pubblicazioni-griglia" id="pubblicazioni-grid"></div>
        </div -->` : ''}
      `;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      (function inserisciCollabABlocchi() {
        const voci = stato.collaborazioni;
        const grid = $('collab-grid');
        let i = 0;
        const BLOCCO = 4;
        function step() {
          const fine = Math.min(i + BLOCCO, voci.length);
          for (; i < fine; i++) {
            const v = voci[i];
            const item = crea('div'); item.className = 'collab-item';
            item.innerHTML = `
              <div class="collab-img"></div>
              <p class="collab-cliente">${v.titolo}</p>
              <p class="collab-anno">${v.anno}</p>
            `;
            item.querySelector('.collab-img').appendChild(creaImg(v.foto, v.titolo));
            grid.appendChild(item);

            // Foto della collaborazione: la sezione si apre solo se la galleria è popolata
            const fotoCollab = Array.isArray(v.galleria) ? v.galleria : [];

            if (fotoCollab.length > 0) {
              const nomeBtn = item.querySelector('.collab-cliente');
              nomeBtn.setAttribute('tabindex', '0');
              nomeBtn.setAttribute('role', 'button');
              nomeBtn.setAttribute('aria-expanded', 'false');
              const pannello = crea('div'); pannello.className = 'collab-espansione';
              const inner = crea('div'); inner.className = 'collab-espansione-inner';
              const striscia = crea('div'); striscia.className = 'collab-espansione-striscia';
              fotoCollab.forEach(src => {
                const cell = crea('div'); cell.className = 'collab-espansione-cella';
                cell.appendChild(creaImg(src, v.titolo));
                striscia.appendChild(cell);
              });
              inner.appendChild(striscia);
              pannello.appendChild(inner);
              // Esce dalla card e occupa tutta la larghezza della griglia;
              // grid-auto-flow:dense su .collab-griglia ricompatta le card successive.
              item.insertAdjacentElement('afterend', pannello);

              const toggle = () => {
                const apri = !pannello.classList.contains('aperta');
                // Chiude eventuali altri pannelli aperti nella griglia (un solo pannello alla volta)
                grid.querySelectorAll('.collab-espansione.aperta').forEach(p => {
                  if (p !== pannello) p.classList.remove('aperta');
                });
                grid.querySelectorAll('.collab-cliente[aria-expanded="true"]').forEach(b => {
                  if (b !== nomeBtn) b.setAttribute('aria-expanded', 'false');
                });
                pannello.classList.toggle('aperta', apri);
                nomeBtn.setAttribute('aria-expanded', String(apri));
              };

              nomeBtn.addEventListener('click', toggle);
              nomeBtn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
              });
            }
          }
          if (i < voci.length) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      })();

      // Pubblicazioni
      const pubGrid = $('pubblicazioni-grid');
      if (pubGrid) {
        stato.pubblicazioni.forEach(pub => {
          const item = crea('div'); item.className = 'pub-item';
          item.innerHTML = `
            <div class="pub-img"></div>
            <div class="pub-info">
              <p class="pub-titolo">${pub.titolo}</p>
              <p class="pub-anno">${pub.anno}</p>
              ${pub.link ? `<a class="pub-link" href="${pub.link}" target="_blank" rel="noopener">${tu('common.vedi')}</a>` : ''}
            </div>
          `;
          if (pub.immagine) item.querySelector('.pub-img').appendChild(creaImg(pub.immagine, pub.titolo));
          pubGrid.appendChild(item);
        });
      }
      return;
      break;
  }

  overlay.classList.add('aperta');
  overlay.scrollTop = 0;
}

function chiudiPagina() {
  $('overlay-pagina').classList.remove('aperta');
  document.title = TITOLO_DEFAULT;
}

// ── Progetto dettaglio ──
const _cacheProgetti = {};

// ── Routing "silenzioso": link diretti funzionanti, URL sempre nascosto ──
// L'utente non vede MAI un URL diverso dal dominio base mentre naviga:
// aprire/chiudere un progetto o una sezione non tocca la barra degli
// indirizzi (a differenza di una webapp normale). Serve solo per poter
// condividere un link diretto a una pagina precisa (es. via messaggio):
// all'avvio, se l'URL con cui si è arrivati corrisponde a una pagina
// nota, quella pagina si apre subito — poi l'URL viene silenziosamente
// riportato alla radice (vedi fondo di init()), così anche durante la
// visualizzazione di quel contenuto la barra resta pulita.
//
// Escluse volutamente: 'tutti-progetti' (indice, ridondante con la home)
// e 'come-funziona' (nota di supporto, non una pagina a sé).
//
// BASE_PATH gestisce automaticamente i due scenari di hosting:
// - github.io (Project Page): il sito vive sotto /nome-repo/ (es.
//   francescomartolini.github.io/francescomartolini.art/) → il primo
//   segmento del path è il prefisso da mantenere in ogni URL.
// - dominio personalizzato (es. francescomartolini.art): il sito vive
//   alla radice → nessun prefisso.
// Se in futuro si collega il dominio personalizzato, questo codice si
// adatta da solo, senza bisogno di modifiche.
const BASE_PATH = (() => {
  if (!location.hostname.endsWith('github.io') || !location.pathname.startsWith('francescomartolini.art') || !location.pathname.startsWith('localhost:8000')) return '';
  const primoSegmento = location.pathname.split('/').filter(Boolean)[0];
  return primoSegmento ? `/${primoSegmento}` : '';
})();

const TITOLO_DEFAULT = document.title;

// tipo passato ad apriPagina() → { slug URL, titolo pagina }
const SEZIONI_URL = {
  'chi-sono-pagina':       { slug: 'chi-sono',               titolo: 'Chi sono' },
  'collaborazioni-pagina': { slug: 'fotografie-commerciali', titolo: 'Fotografie Commerciali' },
  'tutti-studi':           { slug: 'intervalli',             titolo: 'Intervalli' },
  'playlist-pagina':       { slug: 'playlist',                titolo: 'Playlist' },
};

// Legge l'URL corrente (al netto di BASE_PATH) e dice a quale pagina
// corrisponde, se corrisponde a qualcosa. Unica fonte di verità usata
// sia all'avvio sia dal tasto indietro/avanti del browser.
function leggiRoute() {
  const base = BASE_PATH.replace(/\/$/, '');
  let path = location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  path = path.replace(/\/+$/, '') || '/';

  if (path === '/taccuino') return { tipo: 'taccuino' };

  const mProgetto = path.match(/^\/progetti\/([^/?#]+)$/);
  if (mProgetto) return { tipo: 'progetto', id: decodeURIComponent(mProgetto[1]) };

  for (const [pagina, info] of Object.entries(SEZIONI_URL)) {
    if (path === `/${info.slug}`) return { tipo: 'sezione', pagina };
  }

  return null; // home
}

// Blocco "Acquista il volume" + navigazione tra i volumi della collana PLAYLIST
function generaBloccoVolumePlaylist(pr) {
  const volumi = volumiPlaylist();
  const idx = volumi.findIndex(v => v.id === pr.id);
  const prec = idx > 0 ? volumi[idx - 1] : null;
  const succ = idx > -1 && idx < volumi.length - 1 ? volumi[idx + 1] : null;

  const shopUrl = pr.shop_url || '';
  const shopLabel = t(pr.shop_label) || tu('playlist.acquista');

  return `
    <div class="pl-acquista">
      <p class="pl-eyebrow">${tu('playlist.acquistaEyebrow')}</p>
      <div class="pl-acquista-riga">
        <div class="pl-acquista-mockup">
          <img src="${pr.immagine_copertina}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
        </div>
        <div class="pl-acquista-info">
          <p class="pl-acquista-titolo"> ${t(pr.titolo)}</p>
          ${shopUrl
            ? `<a class="pl-acquista-btn" href="${shopUrl}" target="_blank" rel="noopener">${shopLabel}</a>`
            : `<p class="pl-acquista-presto">${tu('playlist.prossimamente')}</p>`}
        </div>
      </div>
    </div>

    <div class="pl-volume-nav">
      ${prec
        ? `<button class="pl-volume-nav-link" onclick="apriProgetto('${prec.id}')"><span>${tu('playlist.volumePrecedente')}</span><strong>PLAYLIST.${numeroVolume(prec.id)}</strong></button>`
        : `<span class="pl-volume-nav-link pl-volume-nav-link--vuoto" aria-hidden="true"></span>`}
      <button class="pl-volume-nav-indice" onclick="apriProgetto('${ID_CARD_PLAYLIST}')">${tu('playlist.indice')}</button>
      ${succ
        ? `<button class="pl-volume-nav-link pl-volume-nav-link--dx" onclick="apriProgetto('${succ.id}')"><span>${tu('playlist.volumeSuccessivo')}</span><strong>PLAYLIST.${numeroVolume(succ.id)}</strong></button>`
        : `<span class="pl-volume-nav-link pl-volume-nav-link--vuoto" aria-hidden="true"></span>`}
    </div>`;
}

// Contenuto della pagina archivio PLAYLIST: Hero, Manifesto, Come funziona,
// Filosofia, La serie. Si apre dentro #pagina-progetto, esattamente come un
// progetto qualunque — non è più un'area a parte.
function generaHTMLArchivioPlaylist() {
  const pl = stato.playlist || {};
  const hero = pl.hero || {};
  const manifesto = pl.manifesto || {};
  const processo = pl.processo || {};
  const filosofia = pl.filosofia || {};

  const manifestoParagrafi = t(manifesto.testo)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const filosofiaParagrafi = (t(filosofia.paragrafi) || [])
    .map(par => `<p>${par}</p>`)
    .join('');

  const fasi = processo.fasi || [];
  const stepsHTML = fasi.map((f, i) => `
    <li class="pl-step">
      <span class="pl-step-num">${formatNum(i + 1)}</span>
      <span class="pl-step-label">${t(f)}</span>
    </li>${i < fasi.length - 1 ? '<li class="pl-step-arrow" aria-hidden="true">&#8595;</li>' : ''}
  `).join('');

  return `
    <div class="pl-hero">
      <p class="pl-eyebrow">${t(hero.kicker)}</p>
      <h1 class="pl-hero-titolo">${hero.titolo || 'PLAYLIST'}</h1>
      <p class="pl-hero-sottotitolo">${t(hero.sottotitolo).replace(/\n/g, '<br>')}</p>
    </div>

    <div class="pl-sezione pl-serie">
      <p class="pl-eyebrow">${tu('playlist.laSerie')}</p>
      <div class="pl-volumi" id="pl-volumi-grid"></div>
    </div>

    <div class="pl-arrow">↓</div>

    <div class="pl-sezione pl-manifesto">
      <p class="pl-eyebrow">${t(manifesto.eyebrow)}</p>
      <div class="pl-manifesto-testo">${manifestoParagrafi}</div>
    </div>

    <div class="pl-sezione pl-processo">
      <p class="pl-eyebrow">${t(processo.eyebrow)}</p>
      <h2 class="pl-processo-titolo">${t(processo.titolo)}</h2>
      <ol class="pl-processo-steps">${stepsHTML}</ol>
    </div>

    <div class="pl-sezione pl-filosofia">
      <p class="pl-eyebrow">${t(filosofia.eyebrow)}</p>
      <blockquote class="pl-filosofia-citazione">${t(filosofia.citazione)}</blockquote>
      <div class="pl-filosofia-testo">${filosofiaParagrafi}</div>
    </div>
  `;
}

function popolaGrigliaVolumiPlaylist(root) {
  const grid = root.querySelector('#pl-volumi-grid');
  if (!grid) return;
  volumiPlaylist().forEach(pr => {
    const inLavorazione = pr.pubblicato === false;
    const card = crea('div'); card.className = 'pl-volume' + (inLavorazione ? ' in-lavorazione' : '');
    card.innerHTML = `
      <div class="pl-volume-cover"></div>
      <p class="pl-volume-num">PLAYLIST.${numeroVolume(pr.id)}</p>
      <p class="pl-volume-titolo">${t(pr.sottotitolo) || t(pr.titolo)}</p>
      ${inLavorazione ? `<p class="pl-volume-wip">${tu('overlay.inLavorazione')}</p>` : ''}
    `;
    card.querySelector('.pl-volume-cover').appendChild(creaImg(pr.immagine_copertina, t(pr.titolo)));
    if (!inLavorazione) card.addEventListener('click', () => apriProgetto(pr.id));
    grid.appendChild(card);
  });
}

function apriArchivioPlaylist() {
  document.title = `PLAYLIST — francescomartolini.art`;
  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');

  if (!_cacheProgetti[ID_CARD_PLAYLIST]) {
    _cacheProgetti[ID_CARD_PLAYLIST] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">${tu('common.torna')}</button>
      <div class="layout-editorial">
        <div class="progetto-body">
          ${generaHTMLArchivioPlaylist()}
        </div>
      </div>`;
  }

  interno.innerHTML = _cacheProgetti[ID_CARD_PLAYLIST];
  el.classList.add('aperta');
  el.scrollTop = 0;

  popolaGrigliaVolumiPlaylist(el);
  rivelaAlloScroll(el, '.pl-sezione, .pl-step');
}

function apriProgetto(id) {
  if (id === ID_CARD_PLAYLIST) { apriArchivioPlaylist(); return; }
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr || pr.pubblicato === false) return;

  document.title = `${t(pr.titolo)} — francescomartolini.art`;
  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  // Applica tema colori solo se definito nel JSON (solo desktop)
  const th = pr.theme;
  if (!isMobile() && th) {
    el.style.setProperty('--pr-bg',     th.background || '');
    el.style.setProperty('--pr-text',   th.text       || '');
    el.style.setProperty('--pr-accent', th.accent     || '');
  }

  if (!_cacheProgetti[id]) {
    const layout = pr.layoutType || 'base';
    const hasNamedLayout = ['editorial','magazine','column','archivio','panoramico'].includes(layout);

    // Cover a due colonne solo per i layout con identità visiva definita
    // Per layout base: header semplice come l'originale
    const coverHTML = (hasNamedLayout && pr.immagine_copertina) ? `
      <div class="progetto-cover">
        <div class="progetto-cover-img">
          <img src="${pr.immagine_copertina}" alt="${t(pr.titolo)}" draggable="false" loading="eager">
        </div>
        <div class="progetto-cover-testo">
          <h1 class="progetto-cover-titolo">${t(pr.titolo)}</h1>
          <p class="progetto-cover-anno">${t(pr.anno)}</p>
          <p class="progetto-cover-desc">${t(pr.descrizione)}</p>
          ${pr.link_esterno
            ? `<p style="margin-top:32px;"><a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">${t(pr.label_link) || tu('common.vediOnline')}</a></p>`
            : ''}
        </div>
      </div>` : `
      <div class="progetto-interno-header">
        <div>
          <h1 class="progetto-interno-titolo">${t(pr.titolo)}</h1>
          <p class="progetto-interno-anno">${t(pr.anno)}</p>
        </div>
        ${pr.link_esterno ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">${t(pr.label_link) || tu('common.vediOnline')}</a>` : ''}
      </div>`;

    _cacheProgetti[id] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">${tu('common.torna')}</button>
      ${coverHTML}
      <div class="layout-${layout}">
        <div class="progetto-body">
          ${generaContenutoProgetto(pr)}
        </div>
      </div>
      ${isVolumePlaylist(pr) ? generaBloccoVolumePlaylist(pr) : ''}`;
  }

  interno.innerHTML = _cacheProgetti[id];
  el.classList.add('aperta');
  el.scrollTop = 0;

  // Scroll reveal
  avviaReveal(el);
  if (isVolumePlaylist(pr)) rivelaAlloScroll(el, '.pl-acquista, .pl-volume-nav');

  // Immagine sticky per layout archivio
  if ((pr.layoutType || '') === 'archivio') {
    avviaScrollArchivio(el, pr);
  }

  // Sezioni Spotify: embed + carosello foto legato al brano in play
  avviaSpotifySections(el);
}

// ── Spotify: embed playlist/brano + carosello foto sincronizzato col play ──
let _spotifyAPI = null;
let _spotifyAPIPromise = null;

function caricaSpotifyIframeAPI() {
  if (_spotifyAPIPromise) return _spotifyAPIPromise;
  _spotifyAPIPromise = new Promise(resolve => {
    if (_spotifyAPI) { resolve(_spotifyAPI); return; }
    window.onSpotifyIframeApiReady = IFrameAPI => {
      _spotifyAPI = IFrameAPI;
      resolve(IFrameAPI);
    };
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);
  });
  return _spotifyAPIPromise;
}

function avviaSpotifySections(overlayEl) {
  const holders = overlayEl.querySelectorAll('.spotify-embed-holder');
  if (!holders.length) return;

  caricaSpotifyIframeAPI().then(IFrameAPI => {
    holders.forEach(holder => {
      if (holder.dataset.spotifyInit === '1') return; // già inizializzato
      holder.dataset.spotifyInit = '1';

      const playlistId = holder.dataset.spotifyPlaylist;
      const wrap = holder.closest('.section-spotify');
      const carosello = wrap.querySelector('.spotify-carosello');
      const img = wrap.querySelector('.spotify-carosello-img');

      let tracce = [];
      try { tracce = JSON.parse(wrap.dataset.tracks || '[]'); } catch (e) { tracce = []; }
      const mappaFoto = {};
      tracce.forEach(tr => { if (tr && tr.uri) mappaFoto[tr.uri] = tr.image; });

      const options = { uri: `spotify:playlist:${playlistId}`, width: '100%', height: 352 };

      IFrameAPI.createController(holder, options, controller => {
        let uriCorrente = null;

        controller.addListener('playback_update', e => {
          const { isPaused, playingURI } = e.data || {};
          if (!playingURI || isPaused) return; // niente foto finché non parte un play

          if (playingURI === uriCorrente) return; // stesso brano, nessun cambio
          uriCorrente = playingURI;

          const src = mappaFoto[playingURI];
          if (!src) { carosello.hidden = true; return; }

          img.classList.remove('visibile');
          setTimeout(() => {
            img.src = src;
            carosello.hidden = false;
            requestAnimationFrame(() => img.classList.add('visibile'));
          }, 180);
        });
      });
    });
  });
}

// Scroll-reveal per le sezioni
function avviaReveal(overlayEl) {
  const els = overlayEl.querySelectorAll(
    '.section-text, .section-image, .section-imagetext, .section-quote, .section-gallery, .section-map'
  );
  els.forEach(e => e.classList.add('reveal'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
  }, { root: overlayEl, threshold: 0.06 });
  els.forEach(e => obs.observe(e));
}

// Scroll-reveal generico riutilizzabile (es. sezioni pagina PLAYLIST)
function rivelaAlloScroll(overlayEl, selector) {
  const els = overlayEl.querySelectorAll(selector);
  els.forEach(e => e.classList.add('reveal'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
  }, { root: overlayEl, threshold: 0.12 });
  els.forEach(e => obs.observe(e));
}

// Aggiorna l'immagine sticky nel layout archivio mentre si scorre
function avviaScrollArchivio(overlayEl, pr) {
  const stickyImg = overlayEl.querySelector('#archivio-sticky-img');
  if (!stickyImg) return;
  const markers = overlayEl.querySelectorAll('[data-archivio-img]');
  if (!markers.length) return;
  if (overlayEl._scrollHandler) overlayEl.removeEventListener('scroll', overlayEl._scrollHandler);
  overlayEl._scrollHandler = () => {
    let corrente = null;
    markers.forEach(m => {
      if (m.offsetTop <= overlayEl.scrollTop + overlayEl.clientHeight * 0.55) corrente = m.dataset.archivioImg;
    });
    if (corrente && stickyImg.getAttribute('src') !== corrente) {
      stickyImg.style.opacity = '0';
      setTimeout(() => { stickyImg.src = corrente; stickyImg.style.opacity = '1'; }, 240);
    }
  };
  overlayEl.addEventListener('scroll', overlayEl._scrollHandler, { passive: true });
}

function generaImgHTML(src, titolo) {
  return `<div class="progetto-galleria-img"><img src="${src}" alt="${titolo}" draggable="false" loading="lazy"></div>`;
}

function generaContenutoProgetto(pr) {
  // Supporta sia il vecchio schema (contenuto[]) sia il nuovo (sections[])
  const usaSections = Array.isArray(pr.sections) && pr.sections.length > 0;

  if (usaSections) {
    // ── Schema nuovo: sections[] ──
    return pr.sections.map(s => {
      switch (s.type) {
        case 'text':
          return `<div class="section-text">${
            (s.content || '').split('\n\n').map(p =>
              p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : ''
            ).join('')
          }</div>`;
        case 'image':
          return `<div class="section-image${s.fullscreen ? ' fullscreen' : ''}" ${pr.layoutType === 'archivio' ? `data-archivio-img="${s.src}"` : ''}>
            <img src="${t(s.src)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`;
        case 'imageText':
          return `<div class="section-imagetext ${s.position === 'right' ? 'position-right' : 'position-left'}">
            <img src="${t(s.image)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
            <div class="section-imagetext-content">${(s.content || '').replace(/\n/g, '<br>')}</div>
          </div>`;
        case 'gallery':
          return `<div class="section-gallery">${
            (s.images || []).map(src =>
              `<div class="gallery-img"><img src="${t(src)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy"></div>`
            ).join('')
          }</div>`;
        case 'quote':
          return `<blockquote class="section-quote">${t(s.content) || ''}</blockquote>`;
        case 'embed':
          return generaEmbedHTML(s);
        case 'map': {
          const msrc = s.url || (s.lat && s.lng ? `https://maps.google.com/maps?q=${s.lat},${s.lng}&z=${s.zoom || 13}&output=embed` : '');
          if (!msrc) return '';
          return `<div class="section-map">
            ${s.label ? `<p class="section-map-label">${t(s.label)}</p>` : ''}
            <iframe src="${t(msrc)}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>`;
        }
        default: return '';
      }
    }).join('');
  }

  // ── Schema vecchio: contenuto[] ──
  const layout = pr.layoutType || 'base';

  // Per layout archivio: prima immagine va nella colonna sticky, le altre come marker
  if (layout === 'archivio') {
    const immagini = [pr.immagine_copertina, ...(pr.galleria || [])].filter(Boolean);
    const primaImg = immagini[0] || '';
    let html = '';

    if (!pr.contenuto) {
      html += `<div class="archivio-colonna-testo">
        <div class="section-text"><p>${(t(pr.testo_lungo) || '').replace(/\n/g, '<br>')}</p></div>
        ${generaMappaHTML(pr)}
        ${(pr.galleria || []).slice(1).map(src =>
          `<div class="section-image" data-archivio-img="${src}">
            <img src="${src}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`).join('')}
      </div>
      <div class="archivio-colonna-img">
        <img id="archivio-sticky-img" class="archivio-img-principale" src="${primaImg}" alt="${t(pr.titolo)}" draggable="false">
      </div>
      <div class="archivio-footer-tipografico">
        <span>francescomartolini.art</span>
        <span>${t(pr.titolo).toUpperCase()}</span>
        <span>${t(pr.anno)}</span>
      </div>`;
      return html;
    }

    // Ha contenuto[]
    let colonnaHTML = '';
    pr.contenuto.forEach(b => {
      switch (b.tipo) {
        case 'titolo':
          colonnaHTML += `<h3 class="section-titolo-interno">${t(b.valore)}</h3>`; break;
        case 'testo':
          colonnaHTML += `<div class="section-text">${
            t(b.valore).split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
          }</div>`; break;
        case 'immagine':
          colonnaHTML += `<div class="section-image" data-archivio-img="${b.valore}">
            <img src="${b.valore}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`; break;
        case 'mappa':
          colonnaHTML += generaMappaHTML(pr); break;
        case 'spotify':
          colonnaHTML += generaSpotifyHTML(b.valore); break;
        case 'embed':
          colonnaHTML += generaEmbedHTML(b.valore); break;
        case 'separatore':
          colonnaHTML += `<hr class="progetto-separatore">`; break;
      }
    });
    if (pr.galleria?.length) {
      pr.galleria.forEach(src => {
        colonnaHTML += `<div class="section-image" data-archivio-img="${src}">
          <img src="${src}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
        </div>`;
      });
    }

    return `<div class="archivio-colonna-testo">${colonnaHTML}</div>
      <div class="archivio-colonna-img">
        <img id="archivio-sticky-img" class="archivio-img-principale" src="${primaImg}" alt="${t(pr.titolo)}" draggable="false">
      </div>
      <div class="archivio-footer-tipografico">
        <span>francescomartolini.art</span>
        <span>${t(pr.titolo).toUpperCase()}</span>
        <span>${t(pr.anno)}</span>
      </div>`;
  }

  // Per tutti gli altri layout: mappa blocchi al sistema section-*
  if (!pr.contenuto) {
    const galleria = (pr.galleria || []).map(src =>
      `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`
    ).join('');
    return `
      <div class="section-text"><p>${(t(pr.testo_lungo) || '').replace(/\n/g, '<br>')}</p></div>
      ${generaMappaHTML(pr)}
      ${galleria ? `<div class="section-gallery">${galleria}</div>` : ''}`;
  }

  const blocchi = pr.contenuto.map(b => {
    switch (b.tipo) {
      case 'titolo':
        return `<h3 class="section-titolo-interno">${t(b.valore)}</h3>`;
      case 'testo':
        return `<div class="section-text">${
          t(b.valore).split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
        }</div>`;
      case 'immagine':
        return `<div class="section-image"><img src="${b.valore}" alt="${t(pr.titolo)}" draggable="false" loading="lazy"></div>`;
      case 'galleria': {
        const imgs = (Array.isArray(b.valore) ? b.valore : [b.valore])
          .map(src => `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`).join('');
        return `<div class="section-gallery">${imgs}</div>`;
      }
      case 'mappa': return generaMappaHTML(pr);
      case 'spotify': return generaSpotifyHTML(b.valore);
      case 'embed': return generaEmbedHTML(b.valore);
      case 'separatore': return `<hr class="progetto-separatore">`;
      default: return '';
    }
  }).join('');

  const galleriaExtra = pr.galleria?.length
    ? `<div class="section-gallery">${pr.galleria.map(src => `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`).join('')}</div>`
    : '';

  return blocchi + galleriaExtra;
}

function generaMappaHTML(pr) {
  if (!pr.mappa) return '';
  const label = t(pr.mappa.label) || tu('common.luogo');
  let src = pr.mappa.url || '';
  if (!src && pr.mappa.lat && pr.mappa.lng)
    src = `https://maps.google.com/maps?q=${pr.mappa.lat},${pr.mappa.lng}&z=${pr.mappa.zoom || 13}&output=embed`;
  if (!src) return '';
  return `<div class="section-map">
    <p class="section-map-label">${label}</p>
    <iframe src="${src}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>`;
}

function generaEmbedHTML(v) {
  // Blocco iframe generico: YouTube, Vimeo, SoundCloud, o qualsiasi embed esterno.
  // Schema: { url, label?, ratio? } — ratio tipo "16:9", "4:3", "1:1" (default )
  if (!v || !v.url) return '';
  const src = t(v.url);
  const label = t(v.label) || '';
  const ratio = (v.ratio || '').replace(':', '/');
  return `<div class="section-embed">
    ${label ? `<p class="section-embed-label">${label}</p>` : ''}
    <div class="section-embed-frame" style="aspect-ratio:${ratio};">
      <iframe src="${src}" title="${label || 'Contenuto incorporato'}" loading="lazy" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>`;
}

function generaSpotifyHTML(v) {
  if (!v || !v.playlistId) return '';
  const tracksJSON = JSON.stringify(v.tracks || []).replace(/"/g, '&quot;');
  const embedId = 'spotify-embed-' + Math.random().toString(36).slice(2, 9);
  return `<div class="section-spotify" data-tracks="${tracksJSON}">
    <div class="spotify-carosello" hidden>
      <img class="spotify-carosello-img" alt="">
    </div>
    <div class="spotify-embed-holder" id="${embedId}" data-spotify-playlist="${t(v.playlistId)}"></div>
  </div>`;
}

function chiudiProgetto() {
  const el = $('pagina-progetto');
  el.classList.remove('aperta');
  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');
  if (el._scrollHandler) {
    el.removeEventListener('scroll', el._scrollHandler);
    el._scrollHandler = null;
  }
  document.title = TITOLO_DEFAULT;
}

// ── Taccuino archivio ──
let _cacheTaccuino = null;

function apriTaccuino() {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  document.title = `${tu('menu.taccuino')} — francescomartolini.art`;

  if (!_cacheTaccuino) {
    const voci = stato.taccuino.map(v => {
      const posterAttr = v.foto ? ` poster="${v.foto}"` : '';
      const media = v.video
        ? `<div class="taccuino-voce-foto"><video src="${v.video}" controls playsinline preload="metadata"${posterAttr}></video></div>`
        : (v.foto ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="" draggable="false" loading="lazy"></div>` : '');
      const cam = v.camera ? `<p class="taccuino-voce-camera"> ${v.camera}</p>` : '';
      return `<div class="taccuino-voce" data-testo="${t(v.testo).toLowerCase()}">${media}<p class="taccuino-voce-frase">${t(v.testo)}</p>${cam}<p class="taccuino-voce-data">${formatData(v.data)}</p></div>`;
    }).join('');
    _cacheTaccuino = `
      <button class="taccuino-torna" onclick="chiudiTaccuino()">${tu('overlay.chiudi')}</button>
      <h1>${tu('menu.taccuino')}</h1>
      <div class="taccuino-cerca-wrap">
        <input type="search" id="taccuino-cerca" class="taccuino-cerca"
          placeholder="${tu('taccuino_extra.cercaPlaceholder')}" autocomplete="off" spellcheck="false">
        <span id="taccuino-risultati" class="taccuino-risultati"></span>
      </div>
      <div id="taccuino-lista">${voci}</div>
    `;
  }

  interno.innerHTML = _cacheTaccuino;
  const input = $('taccuino-cerca'), lista = $('taccuino-lista'), risultati = $('taccuino-risultati');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim(); let vis = 0;
    lista.querySelectorAll('.taccuino-voce').forEach(v => {
      const match = !q || v.dataset.testo.includes(q);
      v.style.display = match ? '' : 'none';
      if (match) vis++;
    });
    risultati.textContent = q ? `${vis} ${vis === 1 ? tu('taccuino_extra.risultatoSing') : tu('taccuino_extra.risultatiPlur')}` : '';
  });
  setTimeout(() => input.focus(), 300);
  el.classList.add('aperta'); el.scrollTop = 0;
}

function chiudiTaccuino() {
  $('pagina-taccuino-archivio').classList.remove('aperta');
  document.title = TITOLO_DEFAULT;
}

// ════════════════════════════════
// MOBILE — Pagina indice
// ════════════════════════════════
function costruisciIndice() {
  const indice = $('indice-mobile');
  const lista = $('indice-lista');
  if (!indice || !lista) return;

  // Voci statiche + progetti dinamici
  const voci = [
    { num: '—',  label: tu('capitoli.introduzione'),  sub: null,               azione: () => { const p = $('intro-mobile'); if (p) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(p)); } },
  ];

  // Progetti pubblicati (include la card PLAYLIST, che apre l'archivio della collana)
  progettiVisualizzati().forEach((pr, i) => {
    if (pr.pubblicato === false) return;
    voci.push({
      num: formatNum(i + 1),
      label: t(pr.titolo),
      sub: t(pr.anno),
      azione: () => {
        if (pr.id === ID_CARD_PLAYLIST) { apriProgetto(ID_CARD_PLAYLIST); return; }
        // Naviga alla pagina capitolo Progetti e poi apre il progetto
        const progettiSection = $('progetti');
        if (progettiSection) {
          const pagine = [...document.querySelectorAll('.page, .pagina-progetto-mobile')];
          navigaA(pagine.indexOf(progettiSection));
        }
        setTimeout(() => apriProgetto(pr.id), 300);
      }
    });
  });

  // Voci fisse finali
  voci.push(
    { num: '—', label: tu('menu.intervalli'), sub: tu('intervalli.descrizione'), azione: () => { const el = $('intervalli'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: tu('chiSono.titolo'),   sub: tu('indice.chiSonoSub'), azione: () => { const el = $('chi-sono-capitolo') || $('chi-sono'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: tu('menu.taccuino'),   sub: tu('indice.taccuinoSub'), azione: () => { apriTaccuino(); } },
    { num: '—', label: tu('chiSono.pubblicazioniLabel'), sub: '', azione: () => { const el = document.querySelector('#mobile-pubblicazioni-container .page'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); }}
  )

  lista.innerHTML = `<p class="indice-titolo">${tu('indice.titolo')}</p>`;

  voci.forEach((v, i) => {
    const riga = crea('div');
    riga.className = 'indice-voce';
    riga.innerHTML = `
      <span class="indice-voce-num">${v.num}</span>
      <div class="indice-voce-destra">
        <span class="indice-voce-label">${v.label}</span>
        ${v.sub ? `<p class="indice-voce-sub">${v.sub}</p>` : ''}
      </div>
    `;
    riga.addEventListener('click', v.azione);
    lista.appendChild(riga);
  });

  // Posizionamento: dopo l'intro (se esiste), altrimenti dopo #home
  const pIntro = $('intro-mobile');
  const homeSection = $('home');
  const riferimento = pIntro || homeSection;
  if (riferimento) {
    riferimento.after(indice);
  }
}

// ════════════════════════════════
// MOBILE — Costruisci pagine
// ════════════════════════════════
function costruisciMobile() {

  // Pagina introduzione
  if (stato.intro?.testo) {
    const pTitoloIntro = crea('div');
    pTitoloIntro.className = 'page mobile-only';
    pTitoloIntro.dataset.favicon = '∙'; pTitoloIntro.dataset.titolo = tu('capitoli.introduzione');
    const { mpc: mpcT, pc: pcT } = creaMobilePageContent();
    pcT.innerHTML = `<div><p class="capitolo-label">${tu('capitolo')} 0</p><h2 class="capitolo-titolo">${tu('capitoli.introduzione')}</h2></div>`;
    pTitoloIntro.appendChild(mpcT);

    const pIntro = crea('div');
    pIntro.className = 'page mobile-only'; pIntro.id = 'intro-mobile';
    pIntro.dataset.favicon = '∙'; pIntro.dataset.titolo = t(stato.intro.titolo) || tu('capitoli.introduzione');
    const { mpc: mpcIntro, pc: pcIntro } = creaMobilePageContent();
    pcIntro.innerHTML = `
      <p class="introduzione-testo">${t(stato.intro.testo).replace(/\n/g, '<br>')}</p>
      <p class="introduzione-firma">${stato.intro.firma}<br><span>${stato.intro.anno}</span></p>
    `;
    pIntro.appendChild(mpcIntro);

    const homeSection = document.querySelector('#main-content #home');
    if (homeSection) { homeSection.after(pIntro); homeSection.after(pTitoloIntro); }
  }

  // Pagina indice (mobile) — inserita dopo intro (ora già nel DOM)
  costruisciIndice();

  // Taccuino prima frase
  const taccuinoFrase = $('taccuino-mobile-frase');
  if (taccuinoFrase && stato.taccuino[0]) {
    taccuinoFrase.innerHTML = `<p class="taccuino-frase">${t(stato.taccuino[0].testo)}</p><p class="taccuino-data">${formatData(stato.taccuino[0].data)}</p>`;
  }

  let tIdx = 0;
  const containerProgetti = $('mobile-progetti-container');

  progettiVisualizzati().forEach(pr => {
    const inLavorazione = pr.pubblicato === false;
    const isPlaylist = pr.id === ID_CARD_PLAYLIST;
    const p = creaPaginaMobile(t(pr.titolo).charAt(0).toUpperCase(), t(pr.titolo));
    p.appendChild(creaHeader());

    const wrap = crea('div'); wrap.className = 'progetto-mobile-wrap';
    const imgDiv = crea('div');
    imgDiv.className = 'progetto-mobile-img' + (inLavorazione ? ' in-lavorazione' : '');
    imgDiv.appendChild(creaImg(pr.immagine_copertina, t(pr.titolo)));

    const testo = crea('div'); testo.className = 'progetto-mobile-testo';
    const linkEsterno = pr.link_esterno
      ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener" style="pointer-events:all;">${t(pr.label_link) || tu('common.vediOnline')}</a>` : '';
    const bottoneEntrata = isPlaylist
      ? `<button class="link-progetto" style="pointer-events:all;">Entra nell'Archivio</button>`
      : inLavorazione
        ? `<p class="progetto-in-lavorazione">${tu('overlay.inLavorazione')}</p>`
        : `<button class="link-progetto" data-id="${pr.id}" style="pointer-events:all;">${tu('progetti_extra.entraNelProgetto')}</button>`;
    testo.innerHTML = `
      <p class="progetto-anno">${t(pr.anno)}</p>
      <h2 class="progetto-titolo">${t(pr.titolo)}</h2>
      <p class="progetto-anno">${t(pr.descrizione)}</p>
      ${bottoneEntrata}
      <!-- ${linkEsterno} -->
    `;
    if (isPlaylist) {
      testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
      imgDiv.style.cursor = 'pointer';
      imgDiv.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
    } else if (!inLavorazione) {
      testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(pr.id));
      imgDiv.style.cursor = 'pointer';
      imgDiv.addEventListener('click', () => apriProgetto(pr.id));
    }

    wrap.appendChild(imgDiv); wrap.appendChild(testo); p.appendChild(wrap);
    containerProgetti.appendChild(p);
    tIdx = inserisciTaccuinoSeDisponibile(containerProgetti, tIdx);
  });

  const containerIntervalli = $('mobile-intervalli-container');
  stato.intervalli.forEach(iv => {
    const p = creaPaginaMobile('I', t(iv.titolo));
    const { mpc, pc } = creaMobilePageContent();
    const wrap = crea('div'); wrap.className = 'intervallo-mobile-wrap';
    wrap.innerHTML = `<p class="capitolo-label">${tu('menu.intervalli')}</p><h2 class="capitolo-titolo">${t(iv.titolo)}</h2><p class="capitolo-descrizione">${t(iv.descrizione)}</p>`;
    const gr = crea('div'); gr.className = 'intervallo-mobile-griglia';
    iv.immagini.forEach((src, i) => {
      const cell = crea('div'); cell.className = 'intervallo-mobile-cella';
      cell.appendChild(creaImg(src, `${t(iv.titolo)} ${i + 1}`));
      gr.appendChild(cell);
    });
    wrap.appendChild(gr); pc.appendChild(wrap); p.appendChild(mpc);
    containerIntervalli.appendChild(p);
    tIdx = inserisciTaccuinoSeDisponibile(containerIntervalli, tIdx);
  });

  // Collaborazioni commerciali
  const containerCollab = $('mobile-collaborazioni-container');
  if (containerCollab && stato.collaborazioni.length > 0) {
    const p = crea('div'); p.className = 'page';
    p.dataset.favicon = 'F'; p.dataset.titolo = 'commercial';
    p.appendChild(creaHeader());

    const corpo = crea('div'); corpo.className = 'collab-mobile-corpo';
    const label = crea('p'); label.className = 'capitolo-label collab-mobile-label';
    label.textContent = 'Commercial';
    corpo.appendChild(label);

    // Collaborazioni commerciali
    const containerCollab = $('mobile-collaborazioni-container');
    if (containerCollab && stato.collaborazioni.length > 0) {

      // ← PAGINA TITOLO CAPITOLO (mancante)
      const pTitolo = crea('div');
      pTitolo.className = 'page';
      pTitolo.dataset.favicon = 'F';
      pTitolo.dataset.titolo = 'Commercial';
      const { mpc: mpcT, pc: pcT } = creaMobilePageContent();
      pcT.innerHTML = `<div>
        <p class="capitolo-label">${tu('capitolo')} 04</p>
        <h2 class="capitolo-titolo">Commercial</h2>
      </div>`;
      pTitolo.appendChild(mpcT);
      containerCollab.appendChild(pTitolo);  // ← aggiunta prima delle foto

      const p = crea('div'); p.className = 'page';
    }

    stato.collaborazioni.forEach(cl => {
      const item = crea('div'); item.className = 'collab-mobile-item';
      const img = crea('div'); img.className = 'collab-mobile-img';
      const coverImg = creaImg(cl.foto, cl.titolo);
      img.appendChild(coverImg);

      // Se ha una galleria extra, inserisci le immagini nascoste nel DOM
      // così raccogliGalleria() del lightbox le trova nel gruppo collab-mobile-item
      const haGalleria = Array.isArray(cl.galleria) && cl.galleria.length > 0;
      if (haGalleria) {
        const galleriaHidden = crea('div');
        galleriaHidden.className = 'collab-mobile-galleria-hidden';
        galleriaHidden.style.cssText = 'display:none;position:absolute;pointer-events:none;';
        cl.galleria.forEach(url => {
          const gi = crea('img'); gi.src = url; gi.alt = cl.titolo;
          galleriaHidden.appendChild(gi);
        });
        item.appendChild(galleriaHidden);
        img.style.cursor = 'pointer';
        img.addEventListener('click', e => {
          e.stopPropagation();
          galleriaHidden.style.display = '';
          lightbox.apri(coverImg);
          galleriaHidden.style.display = 'none';
        });
      }

      const titolo = crea('h2'); titolo.className = 'collab-mobile-titolo'; titolo.textContent = cl.titolo;
      const anno = crea('p'); anno.className = 'collab-mobile-anno'; anno.textContent = cl.anno;
      item.appendChild(img); item.appendChild(titolo); item.appendChild(anno);
      corpo.appendChild(item);

      // Tap sul nome: apre sotto una striscia con le foto della collaborazione
      // (solo se la galleria è effettivamente popolata)
      const fotoCollab = haGalleria ? cl.galleria : [];
      if (fotoCollab.length > 0) {
        titolo.setAttribute('tabindex', '0');
        titolo.setAttribute('role', 'button');
        titolo.setAttribute('aria-expanded', 'false');

        const pannello = crea('div'); pannello.className = 'collab-mobile-espansione';
        const inner = crea('div'); inner.className = 'collab-mobile-espansione-inner';
        const wrapStriscia = crea('div'); wrapStriscia.className = 'collab-mobile-espansione-wrap';
        const striscia = crea('div'); striscia.className = 'collab-mobile-espansione-striscia';
        fotoCollab.forEach(src => {
          const cell = crea('div'); cell.className = 'collab-mobile-espansione-cella';
          cell.appendChild(creaImg(src, cl.titolo));
          striscia.appendChild(cell);
        });
        wrapStriscia.appendChild(striscia);

        // Freccette per scorrere la striscia (solo se c'è più di una foto)
        if (fotoCollab.length > 1) {
          const SVG_FRECCIA = dir => `<svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg" style="${dir === 'prev' ? 'transform:scaleX(-1)' : ''}"><path d="M1 1L7.5 7.5L1 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          const btnPrev = crea('button'); btnPrev.type = 'button'; btnPrev.className = 'collab-mobile-freccia collab-mobile-freccia--prev';
          btnPrev.innerHTML = SVG_FRECCIA('prev'); btnPrev.setAttribute('aria-label', 'Foto precedente');
          const btnNext = crea('button'); btnNext.type = 'button'; btnNext.className = 'collab-mobile-freccia collab-mobile-freccia--next';
          btnNext.innerHTML = SVG_FRECCIA('next'); btnNext.setAttribute('aria-label', 'Foto successiva');

          const scorri = passo => {
            const cella = striscia.querySelector('.collab-mobile-espansione-cella');
            const salto = cella ? cella.getBoundingClientRect().width + 10 : striscia.clientWidth * 0.8;
            striscia.scrollBy({ left: passo * salto, behavior: 'smooth' });
          };
          btnPrev.addEventListener('click', e => { e.stopPropagation(); scorri(-1); });
          btnNext.addEventListener('click', e => { e.stopPropagation(); scorri(1); });

          const aggiornaFrecce = () => {
            const max = striscia.scrollWidth - striscia.clientWidth - 2;
            btnPrev.classList.toggle('collab-mobile-freccia--nascosta', striscia.scrollLeft <= 2);
            btnNext.classList.toggle('collab-mobile-freccia--nascosta', striscia.scrollLeft >= max);
          };
          striscia.addEventListener('scroll', aggiornaFrecce, { passive: true });
          // Stato iniziale (dopo che il pannello è visibile e la striscia ha una larghezza reale)
          requestAnimationFrame(aggiornaFrecce);

          wrapStriscia.appendChild(btnPrev);
          wrapStriscia.appendChild(btnNext);
        }

        inner.appendChild(wrapStriscia);
        pannello.appendChild(inner);
        item.appendChild(pannello);

        const toggle = e => {
          e.stopPropagation();
          const apri = !pannello.classList.contains('aperta');
          // un solo pannello aperto alla volta in tutta la sezione
          corpo.querySelectorAll('.collab-mobile-espansione.aperta').forEach(p => {
            if (p !== pannello) p.classList.remove('aperta');
          });
          corpo.querySelectorAll('.collab-mobile-titolo[aria-expanded="true"]').forEach(t => {
            if (t !== titolo) t.setAttribute('aria-expanded', 'false');
          });
          pannello.classList.toggle('aperta', apri);
          titolo.setAttribute('aria-expanded', String(apri));
        };

        titolo.addEventListener('click', toggle);
        titolo.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
        });
      }
    });

    p.appendChild(corpo);
    containerCollab.appendChild(p);
  }

  // Pubblicazioni mobile
  const containerPub = $('mobile-pubblicazioni-container');
  if (containerPub && stato.pubblicazioni.length > 0) {
    // Pagina titolo capitolo
    const pTitoloPub = crea('div');
    pTitoloPub.className = 'page mobile-only';
    pTitoloPub.dataset.favicon = 'P'; pTitoloPub.dataset.titolo = tu('chiSono.pubblicazioniLabel');
    const { mpc: mpcPub, pc: pcPub } = creaMobilePageContent();
    pcPub.innerHTML = `<div>
      <p class="capitolo-label">${tu('capitolo')} 04</p>
      <h2 class="capitolo-titolo">${tu('chiSono.pubblicazioniLabel')}</h2>
      <p class="capitolo-descrizione">${tu('pubblicazioni.descrizione')}</p>
    </div>`;
    pTitoloPub.appendChild(mpcPub);
    containerPub.appendChild(pTitoloPub);

    // Pagina elenco pubblicazioni
    const pListaPub = crea('div');
    pListaPub.className = 'page mobile-only';
    pListaPub.dataset.favicon = 'P'; pListaPub.dataset.titolo = tu('chiSono.pubblicazioniLabel');
    const { mpc: mpcLista, pc: pcLista } = creaMobilePageContent();
    const listaWrap = crea('div'); listaWrap.className = 'pub-mobile-lista';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-mobile-item';
      item.innerHTML = `
        ${pub.immagine ? `<div class="pub-mobile-img"></div>` : ''}
        <div class="pub-mobile-info">
          <p class="pub-mobile-titolo">${pub.titolo}</p>
          <p class="pub-mobile-anno">${pub.anno}</p>
          ${pub.link ? `<a class="pub-mobile-link" href="${pub.link}" target="_blank" rel="noopener" style="pointer-events:all;">${tu('common.vedi')}</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-mobile-img').appendChild(creaImg(pub.immagine, pub.titolo));
      listaWrap.appendChild(item);
    });
    pcLista.appendChild(listaWrap);
    pListaPub.appendChild(mpcLista);
    containerPub.appendChild(pListaPub);
  }

  raccogliPagine();
}

function raccogliPagine() {
  const tutte = document.querySelectorAll('.page, .pagina-progetto-mobile');
  stato.totPagine = tutte.length;
  costruisciIndicatore(tutte.length);
}

function costruisciIndicatore(tot) {
  const ind = $('indicatore'); if (!ind) return;
  ind.innerHTML = '';
  for (let i = 0; i < tot; i++) {
    const dot = crea('div');
    dot.className = 'indicatore-dot' + (i === 0 ? ' attivo' : '');
    dot.addEventListener('click', () => navigaA(i));
    ind.appendChild(dot);
  }

  // ── Scrub: scorri su/giù sull'indicatore per navigare velocemente ──
  let scrubbing = false;
  let startY = 0;

  function paginaDaY(clientY) {
    const rect = ind.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(t * (stato.totPagine - 1));
  }

  function scrubA(idx) {
    if (idx < 0 || idx >= stato.totPagine || idx === stato.paginaCorrente) return;
    const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
    pagine[stato.paginaCorrente]?.classList.remove('attiva');
    stato.paginaCorrente = idx;
    pagine[idx]?.classList.add('attiva');
    aggiornaUI();
  }

  ind.addEventListener('touchstart', e => {
    e.stopPropagation();
    e.preventDefault();
    startY = e.touches[0].clientY;
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: false });

  ind.addEventListener('touchmove', e => {
    e.stopPropagation();
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (!scrubbing && dy > 6) {
      scrubbing = true;
      ind.classList.add('scrub-attivo');
    }
    if (scrubbing) {
      e.preventDefault();
      scrubA(paginaDaY(e.touches[0].clientY));
    }
  }, { passive: false });

  ind.addEventListener('touchend', e => {
    e.stopPropagation();
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: true });

  ind.addEventListener('touchcancel', e => {
    e.stopPropagation();
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: true });
}

// ── Nav mobile ──
function navigaA(idx) {
  if (!isMobile()) return;
  if (stato.inTransizione || idx < 0 || idx >= stato.totPagine || idx === stato.paginaCorrente) return;
  stato.inTransizione = true;
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  pagine[stato.paginaCorrente].classList.remove('attiva');
  pagine[stato.paginaCorrente].classList.add('uscita-sinistra');
  setTimeout(() => pagine[stato.paginaCorrente]?.classList.remove('uscita-sinistra'), 450);
  stato.paginaCorrente = idx;
  pagine[idx].classList.add('attiva');
  aggiornaUI();
  setTimeout(() => { stato.inTransizione = false; }, 450);
}

function paginaSuccessiva() { navigaA(stato.paginaCorrente + 1); }
function paginaPrecedente() { navigaA(stato.paginaCorrente - 1); }

function aggiornaUI() {
  if (!isMobile()) return;
  // Segnalibro: salva la pagina corrente ad ogni spostamento reale nel libro
  // (navigaA e lo scrub sull'indicatore passano entrambi da qui).
  try { localStorage.setItem(SEGNALIBRO_KEY, String(stato.paginaCorrente)); } catch (e) {}
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  const pCorrente = pagine[stato.paginaCorrente];
  document.querySelectorAll('.indicatore-dot').forEach((d, i) => d.classList.toggle('attivo', i === stato.paginaCorrente));
  const elNum = $('numero-nav');
  if (elNum) elNum.textContent = `${formatNum(stato.paginaCorrente + 1)} / ${formatNum(stato.totPagine)}`;
  const nota = $('nota-nav');
  if (nota) nota.style.display = stato.paginaCorrente === 0 ? '' : 'none';
  const sx = $('freccia-sx'), dx = $('freccia-dx');
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (sx) sx.toggleAttribute('disabled', stato.paginaCorrente === 0);
  if (dx) { dx.style.display = isUltima ? 'none' : ''; dx.toggleAttribute('disabled', isUltima); }
  let tornaBtn = $('torna-inizio-nav');
  if (isUltima) {
    if (!tornaBtn) {
      tornaBtn = crea('button'); tornaBtn.id = 'torna-inizio-nav';
      tornaBtn.textContent = tu('nav_extra.inizio');
      tornaBtn.addEventListener('click', () => navigaA(0));
      $('mobile-nav').appendChild(tornaBtn);
    }
    tornaBtn.style.display = '';
  } else {
    if (tornaBtn) tornaBtn.style.display = 'none';
  }
  if (isUltima) {
    const epilogo = document.getElementById('fin-epilogo');
    const footer = document.querySelector('.fin-footer');
    if (epilogo && !epilogo.classList.contains('visibile')) {
      epilogo.style.display = 'block';
      epilogo.style.opacity = '0';
      epilogo.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        epilogo.style.opacity = '';
        epilogo.style.transform = '';
        epilogo.classList.add('visibile');
        if (footer) {
          footer.style.display = 'flex';
          footer.style.opacity = '0';
          setTimeout(() => { footer.style.opacity = ''; footer.classList.add('visibile'); }, 400);
        }
      }));
    }
  }
  if (pCorrente) {
    aggiorneFavicon(pCorrente.dataset.favicon || 'f');
    document.title = `${pCorrente.dataset.titolo || 'Francesco Martolini .art'} — Francesco Martolini .art`;
  }
}

// ── Segnalibro: piccola tab in stile nastro di libro, sul frontespizio.
// Non forza mai il salto di pagina: propone soltanto di riprendere la
// lettura, così il frontespizio resta comunque la pagina di apertura
// predefinita se il lettore ignora la proposta o la chiude.
function mostraSegnalibro(idx) {
  if (!isMobile() || !idx || idx <= 0 || idx >= stato.totPagine) return;
  const home = $('home');
  if (!home || document.getElementById('segnalibro-tab')) return;

  const tab = crea('button');
  tab.id = 'segnalibro-tab';
  tab.className = 'segnalibro-tab';
  tab.innerHTML = `
    <span class="segnalibro-testo">${tu('segnalibro.messaggio')}</span>
    <span class="segnalibro-pagina">${tu('segnalibro.pagina')} ${formatNum(idx + 1)}</span>
  `;
  tab.addEventListener('click', () => {
    tab.remove();
    navigaA(idx);
  });

  const chiudi = crea('button');
  chiudi.className = 'segnalibro-chiudi';
  chiudi.setAttribute('aria-label', tu('segnalibro.ricomincia'));
  chiudi.textContent = '×';
  chiudi.addEventListener('click', (e) => {
    e.stopPropagation();
    tab.remove();
    try { localStorage.setItem(SEGNALIBRO_KEY, '0'); } catch (err) {}
  });
  tab.appendChild(chiudi);

  home.appendChild(tab);
}

// ── Tema ──
function avviaTema() {
  if (localStorage.getItem('tema') === 'scuro') document.body.classList.add('tema-scuro');
  // Delegation: copre sia il bottone desktop (#tema-toggle) sia tutte le
  // istanze mobile (.tema-toggle-mobile), incluse quelle generate dinamicamente
  // da creaHeader() dopo l'avvio (progetti, taccuino, intervalli...).
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tema-toggle-btn')) return;
    document.body.classList.toggle('tema-scuro');
    localStorage.setItem('tema', document.body.classList.contains('tema-scuro') ? 'scuro' : 'chiaro');
  });
}

// ── Cookie ──
function avviaCookie() {
  if (localStorage.getItem('cookie-consenso')) return;
  const banner = $('cookie-banner');
  setTimeout(() => banner?.classList.add('visibile'), 1400);
  $('cookie-accetta')?.addEventListener('click', () => { localStorage.setItem('cookie-consenso', '1'); banner.classList.remove('visibile'); });
  $('cookie-rifiuta')?.addEventListener('click', () => { localStorage.setItem('cookie-consenso', '0'); banner.classList.remove('visibile'); });
}

// ── Protezione ──
function protezioneImmagini() {
  document.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'p'].includes(e.key)) e.preventDefault(); });
}

// ── Input ──
function gestisciTastiera(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) { if (e.key === 'Escape') chiudiProgetto(); return; }
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) { if (e.key === 'Escape') chiudiTaccuino(); return; }
  if ($('overlay-pagina').classList.contains('aperta')) { if (e.key === 'Escape') chiudiPagina(); return; }
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') paginaSuccessiva();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (isUltima) navigaA(0); else paginaPrecedente(); }
}

let tx = 0, ty = 0;
function gestisciTouchStart(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
function gestisciTouchEnd(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;

  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;

  // Se il gesto è prevalentemente verticale, non fare nulla — lascia scrollare
  if (Math.abs(dy) > Math.abs(dx)) return;

  // Controlla se il touch è partito da dentro un elemento scrollabile
  const target = e.target;
  const scrollabile = target.closest('.pagina-corpo, .chi-sono-wrap, .taccuino-wrap');
  if (scrollabile && scrollabile.scrollHeight > scrollabile.clientHeight) return;

  if (Math.abs(dx) > 40) {
    const isUltima = stato.paginaCorrente === stato.totPagine - 1;
    if (dx < 0) paginaSuccessiva();
    else if (isUltima) navigaA(0);
    else paginaPrecedente();
  }
}

function gestisciTap(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  if (e.target.closest('button, a, input')) return;
  const x = e.clientX, w = window.innerWidth;
  if (x > w * 0.65) paginaSuccessiva();
  else if (x < w * 0.35) paginaPrecedente();
}

// ── Scroll desktop ──
function inizializzaScrollDesktop() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      if (isMobile()) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ════════════════════════════════
// LIGHTBOX
// ════════════════════════════════
const lightbox = (() => {
  let galleria = [];  // array di src corrente
  let idx = 0;

  const el       = () => $('lightbox');
  const imgEl    = () => $('lightbox-img');
  const counter  = () => $('lightbox-counter');
  const prev     = () => $('lightbox-prev');
  const next     = () => $('lightbox-next');

  // Selettori da cui raccogliere le immagini del gruppo
  const SELETTORI_GRUPPO = [
    '.progetto-galleria',
    '.progetto-galleria-gruppo',
    '.studi-griglia',
    '.tutti-studi-griglia',
    '.intervallo-mobile-griglia',
    '.collab-griglia',
    '.collab-mobile-corpo',
    '.progetto-mobile-img',   // singola immagine copertina mobile
  ];

  function raccogliGalleria(imgCliccata) {
    // Cerca il contenitore gruppo più vicino
    const contenitore = SELETTORI_GRUPPO
      .map(s => imgCliccata.closest(s))
      .find(Boolean);

    if (contenitore) {
      // Tutte le img nel gruppo (anche dentro .img-wrap)
      return Array.from(contenitore.querySelectorAll('img'))
        .filter(i => !i.classList.contains('img-overlay') && i.src)
        .map(i => ({ src: i.src, alt: i.alt || '' }));
    }

    // Fallback: solo l'immagine cliccata
    return [{ src: imgCliccata.src, alt: imgCliccata.alt || '' }];
  }

  function mostraImg(i) {
    if (!galleria[i]) return;
    idx = i;
    const lb = el(), image = imgEl();

    image.classList.add('caricando');
    const nuova = new Image();
    nuova.onload = () => {
      image.src = nuova.src;
      image.alt = galleria[i].alt;
      image.classList.remove('caricando');
    };
    nuova.src = galleria[i].src;

    // Counter
    if (galleria.length > 1) {
      counter().textContent = `${i + 1} / ${galleria.length}`;
      counter().style.display = '';
    } else {
      counter().style.display = 'none';
    }

    // Frecce
    prev().hidden = i === 0;
    next().hidden = i === galleria.length - 1;
  }

  function apri(imgEl) {
    galleria = raccogliGalleria(imgEl);
    const srcCliccata = imgEl.src;
    idx = galleria.findIndex(g => g.src === srcCliccata);
    if (idx < 0) idx = 0;

    el().classList.add('aperto');
    document.body.style.overflow = 'hidden';
    mostraImg(idx);
  }

  function chiudi() {
    el().classList.remove('aperto');
    document.body.style.overflow = '';
    galleria = [];
  }

  function precedente() { if (idx > 0) mostraImg(idx - 1); }
  function successiva()  { if (idx < galleria.length - 1) mostraImg(idx + 1); }

  // ── Swipe su mobile ──
  let _tx = 0;

  function init() {
    const lb = el();
    if (!lb) return;

    // Chiudi cliccando fuori dall'immagine
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target === $('lightbox-stage')) chiudi();
    });
    $('lightbox-chiudi').addEventListener('click', chiudi);
    prev().addEventListener('click', precedente);
    next().addEventListener('click', successiva);

    // Swipe
    lb.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _tx;
      if (Math.abs(dx) > 40) { dx < 0 ? successiva() : precedente(); }
    }, { passive: true });

    // Tastiera
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('aperto')) return;
      if (e.key === 'Escape') chiudi();
      if (e.key === 'ArrowRight') successiva();
      if (e.key === 'ArrowLeft') precedente();
    });

    // ── Event delegation: intercetta click su qualsiasi immagine ──
    document.addEventListener('click', e => {
      // Cerca un img dentro un contenitore cliccabile
      // Su mobile escludi .progetto-mobile-img (è la copertina, il tap serve per navigare)
      const selettori = isMobile()
        ? '.img-wrap, .progetto-galleria-img, ' +
          '.intervallo-mobile-cella, ' +
          '.taccuino-voce-foto, .collab-mobile-img'
        : '.img-wrap, .progetto-galleria-img, ' +
          '.tutti-studio-img, .studio-img, ' +
          '.taccuino-voce-foto, .collab-img, ' +
          '.chi-sono-esteso-img, .chi-sono-desktop-img';

      const img = e.target.closest(selettori)?.querySelector('img');

      if (!img || !img.src || img.src.endsWith('favicon.svg')) return;

      // Le card progetto (slider desktop e griglia "tutti i progetti") aprono il progetto, non il lightbox
      if (e.target.closest('.progetto-card, .tutti-card')) return;

      // Non aprire se si sta navigando tra pagine mobile
      if (stato.inTransizione) return;

      e.stopPropagation();
      apri(img);
    });
  }

  return { init, chiudi, apri };
})();

// Esponi globale se necessario
window.chiudiLightbox = lightbox.chiudi;

// ── Esponi globali ──
window.navigaA = navigaA;
window.chiudiProgetto = chiudiProgetto;
window.chiudiTaccuino = chiudiTaccuino;
window.apriTaccuino = apriTaccuino;
window.apriPagina = apriPagina;
window.chiudiPagina = chiudiPagina;

// ── Init ──
async function init() {
  // Aspetta che i18n.js abbia finito di caricare json/ui.json, così le
  // stringhe di interfaccia (tu()) sono pronte prima di costruire indice,
  // pagine progetto ecc. Se i18n.js non è presente per qualche motivo,
  // non blocca comunque il resto del sito.
  if (window.i18nReady) await window.i18nReady;

  await caricaDati();

  // Segnalibro: leggiamo il valore salvato PRIMA che aggiornaUI() lo
  // sovrascriva con la pagina 0 (il frontespizio resta comunque la pagina
  // di apertura predefinita: proponiamo solo di riprendere da lì).
  let paginaSalvata = -1;
  try {
    const v = parseInt(localStorage.getItem(SEGNALIBRO_KEY), 10);
    if (!Number.isNaN(v)) paginaSalvata = v;
  } catch (e) {}

  if (isMobile()) {
    costruisciMobile();
    document.querySelector('.page')?.classList.add('attiva');
    aggiornaUI();
    if (paginaSalvata > 0 && !leggiRoute()) mostraSegnalibro(paginaSalvata);
    document.addEventListener('keydown', gestisciTastiera);
    document.addEventListener('touchstart', gestisciTouchStart, { passive: true });
    document.addEventListener('touchend', gestisciTouchEnd, { passive: true });
    document.addEventListener('click', gestisciTap);
    $('freccia-sx')?.addEventListener('click', paginaPrecedente);
    $('freccia-dx')?.addEventListener('click', paginaSuccessiva);
    $('freccia-sx')?.setAttribute('disabled', '');
  } else {
    popolaDesktop();
    inizializzaScrollDesktop();
    avviaOrologioSticky();
  }

  avviaOrologio();
  avviaTema();
  avviaCookie();
  avviaCursore();
  lightbox.init();
  inizializzaFin();

  // Link diretto a una pagina precisa (es. condivisa via messaggio): apri
  // subito quella. replaceState (non pushState) così il tasto "indietro"
  // torna alla home.
  // Link diretto a una pagina precisa (es. condivisa via messaggio): apri
  // subito quella. Poi nascondi il percorso: la barra degli indirizzi non
  // deve mostrare nulla dopo il dominio, né ora né durante la navigazione.
  const route = leggiRoute();
  if (route?.tipo === 'progetto') {
    const pr = stato.progetti.find(p => p.id === route.id && p.pubblicato !== false);
    if (pr) apriProgetto(route.id);
  } else if (route?.tipo === 'taccuino') {
    apriTaccuino();
  } else if (route?.tipo === 'sezione' && route.pagina === 'playlist-pagina') {
    apriProgetto(ID_CARD_PLAYLIST);
  } else if (route?.tipo === 'sezione') {
    apriPagina(route.pagina);
  }
  if (route) history.replaceState(null, '', `${BASE_PATH}/`);
}

document.addEventListener('DOMContentLoaded', init);
