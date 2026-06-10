/* ============================================
   LIBRO ENGINE v5 — Francesco Martolini .art
   Desktop: scroll editoriale
   Mobile: libro a pagine
   + cursore adattivo, slider progetti, overlay pagine
   + orologio sticky, favicon dinamica, Google Sheets
   ============================================ */

'use strict';

const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7qekYp4bYEPTBnLGVJGjgSLSQotLHODKib2CnRsn8g-S3tvM4ROywdbKqlmFc4A/pub?output=csv';

const stato = {
  paginaCorrente: 0,
  totPagine: 0,
  inTransizione: false,
  progetti: [],
  intervalli: [],
  taccuino: [],
  collaborazioni: [],
  intro: {},
  sliderIdx: 0
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
  const frase = elenco[Math.floor(Math.random() * elenco.length)];

  // Mobile — inietta il testo; la transizione parte in aggiornaUI quando si arriva a #fin
  const elMobile = document.getElementById('fin-epilogo');
  if (elMobile) elMobile.textContent = frase;
  const anno = document.getElementById('fin-anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // Desktop — appare subito con fade (già visibile da scroll)
  const elDesktop = document.getElementById('epilogo-desktop');
  if (elDesktop) {
    elDesktop.textContent = "Alcune tracce richiedono anni per diventare visibili.";
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

// ── Favicon dinamica ──
function aggiorneFavicon(lettera) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a" rx="6"/><text x="16" y="24" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#fafaf8" text-anchor="middle">${lettera}</text></svg>`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = crea('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── CSV Parser ──
function parseCsv(csv) {
  return csv.trim().split('\n').slice(1).map((riga, i) => {
    const celle = []; let inQ = false, cell = '', colIdx = 0;
    for (let c = 0; c < riga.length; c++) {
      const ch = riga[c];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ && colIdx < 2) {
        celle.push(cell.trim()); cell = ''; colIdx++; continue;
      }
      cell += ch;
    }
    celle.push(cell.trim());
    return { id: i + 1, testo: celle[0] || '', data: celle[1] || '', foto: celle[2] || null };
  }).filter(v => v.testo);
}

// ── Carica dati ──
async function caricaDati() {
  const [progetti, intervalli, collaborazioni, intro, pubblicazioni] = await Promise.all([
    fetch('json/progetti.json').then(r => r.json()),
    fetch('json/intervalli.json').then(r => r.json()),
    fetch('json/collaborazioni.json').then(r => r.json()),
    fetch('json/intro.json').then(r => r.json()).catch(() => ({ testo: '' })),
    fetch('json/pubblicazioni.json').then(r => r.json()).catch(() => []),
    fetch('json/epiloghi.json').then(r => r.json()).catch(() => [])
  ]);
  Object.assign(stato, { progetti, intervalli, collaborazioni, intro, pubblicazioni });

  try {
    const r = await fetch(SHEETS_URL);
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
  ph.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>`;
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

// ── Voce taccuino mobile ──
function creaPaginaTaccuinoMobile(v) {
  const pt = creaPaginaMobile('T', 'Taccuino');
  const { mpc, pc } = creaMobilePageContent();
  const tw = crea('div'); tw.className = 'taccuino-wrap';
  if (v.foto) {
    const fw = crea('div'); fw.className = 'taccuino-foto';
    const img = crea('img'); img.src = v.foto; img.alt = ''; img.draggable = false;
    fw.appendChild(img); tw.appendChild(fw);
  }
  tw.innerHTML += `<p class="taccuino-frase">${v.testo}</p><p class="taccuino-data">${formatData(v.data)}</p>`;
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
  if (heroImg && stato.progetti[0]) {
    heroImg.appendChild(creaImg(stato.progetti[0].immagine_copertina, stato.progetti[0].titolo, true));
  }

  popolaSliderProgetti();

  // Taccuino colonne
  const colonne = $('taccuino-colonne-desktop');
  if (colonne) {
    stato.taccuino.slice(0, 3).forEach(v => {
      const col = crea('div'); col.className = 'taccuino-col-voce';
      col.innerHTML = `
        <p class="taccuino-col-data">${formatData(v.data)}</p>
        <p class="taccuino-col-frase">${v.testo}</p>
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

  stato.progetti.forEach((pr, i) => {
    const inLavorazione = pr.pubblicato === false;

    const card = crea('div');
    card.className = 'progetto-card' + (inLavorazione ? ' in-lavorazione' : '');

    card.innerHTML = `
      <div class="progetto-card-img"></div>
      <p class="progetto-card-num">${formatNum(i + 1)}</p>
      <p class="progetto-card-titolo">${pr.titolo.toUpperCase()}</p>
      <p class="progetto-card-anno">${pr.anno}</p>
    `;

    card.querySelector('.progetto-card-img').appendChild(
      creaImg(pr.immagine_copertina, pr.titolo)
    );

    if (progettoPubblicato(pr)) {
      card.addEventListener('click', () => apriProgetto(pr.id));
    }

    griglia.appendChild(card);
  });

  const sx = $('proj-sx'), dx = $('proj-dx');
  if (!sx || !dx) return;
  const visibili = 4, tot = stato.progetti.length;
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

  switch (tipo) {

    case 'tutti-progetti':
      contenuto.innerHTML = `<h1 class="overlay-titolo">Tutti i progetti</h1><div class="tutti-progetti-griglia" id="tutti-proj-grid"></div>`;
      stato.progetti.forEach((pr, i) => {
        const inLavorazione = pr.pubblicato === false;
        const card = crea('div'); card.className = 'tutti-card' + (inLavorazione ? ' in-lavorazione' : '');
        card.innerHTML = `
          <div class="tutti-card-img"></div>
          <p class="tutti-card-num">0${i + 1}</p>
          <h2 class="tutti-card-titolo">${pr.titolo}</h2>
          <p class="tutti-card-anno">${pr.anno}</p>
          <p class="tutti-card-desc">${pr.descrizione}</p>
          ${inLavorazione ? '<p class="tutti-card-wip">In lavorazione</p>' : ''}
        `;
        card.querySelector('.tutti-card-img').appendChild(creaImg(pr.immagine_copertina, pr.titolo));
        if (!inLavorazione) card.addEventListener('click', () => apriProgetto(pr.id));
        $('tutti-proj-grid').appendChild(card);
      });
      break;

    case 'tutti-studi':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">Intervalli</h1>
        <p class="overlay-sottotitolo">Fotografie che non appartengono a un progetto, ma al mio modo di guardare.</p>
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

    case 'chi-sono-pagina': {
      const SVG_MAIL = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`;
      const SVG_IG = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>`;
      const SVG_TEL = `<svg viewBox="0 0 24 24" class="contatto-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>`;
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">Chi sono</h1>
        <div class="chi-sono-esteso">
          <div class="chi-sono-esteso-testo">
            <h2>Francesco Martolini</h2>
            <p>Fotografo italiano. Il mio lavoro esplora il rapporto tra spazio, tempo e memoria — cercando nelle immagini le tracce di ciò che resta.</p>
            <p>Sono interessato alla fotografia come strumento di indagine, non di rappresentazione. Ogni progetto nasce da una domanda che il tempo continua a restituirmi.</p>
            <p>Basato in un paesino vicino Firenze, lavoro su progetti a lungo termine alternati a commissioni commerciali selezionate.</p>
            <div class="chi-sono-contatti-esteso">
              <p class="contatti-label" style="margin-bottom:4px;">Contatti</p>
              <p class="overlay-nota-contatti">Non offro servizi di shooting su richiesta. Scrivimi se sei interessato a un'opera o vuoi costruire qualcosa insieme.</p>
              <a class="contatto-btn" href="mailto:info@francescomartolini.art">${SVG_MAIL}info@francescomartolini.art</a>
              <a class="contatto-btn" href="https://instagram.com/francesco_martolini_ph" target="_blank" rel="noopener">${SVG_IG}francesco_martolini_ph</a>
              <a class="contatto-btn" href="tel:+393930336642">${SVG_TEL}+39 393 033 6642</a>
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
        <h1 class="overlay-titolo">Collaborazioni fotografiche</h1>
        <p class="collab-intro">Lavoro su progetti commerciali ed editoriali in ambiti diversi — architettura, ritratto, still life, reportage aziendale. Ogni collaborazione è un progetto su misura.</p>
        <div class="collab-griglia" id="collab-grid"></div>
        <div class="collab-footer">
          <p class="overlay-sottotitolo">Per collaborazioni e commissioni:</p>
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
              ${pub.link ? `<a class="pub-link" href="${pub.link}" target="_blank" rel="noopener">Vedi →</a>` : ''}
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

function chiudiPagina() { $('overlay-pagina').classList.remove('aperta'); }

// ── Progetto dettaglio ──
const _cacheProgetti = {};

function apriProgetto(id) {
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr || pr.pubblicato === false) return;
  if (!pr) return;
  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  if (!_cacheProgetti[id]) {
    _cacheProgetti[id] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">Torna</button>
      <div class="progetto-interno-header">
        <div>
          <h1 class="progetto-interno-titolo">${pr.titolo}</h1>
          <p class="progetto-interno-anno">${pr.anno}</p>
        </div>
        ${pr.link_esterno ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">${pr.label_link || 'Vedi online'}</a>` : ''}
      </div>
      ${generaContenutoProgetto(pr)}
    `;
  }

  interno.innerHTML = _cacheProgetti[id];
  el.classList.add('aperta');
  el.scrollTop = 0;
}

function generaImgHTML(src, titolo) {
  return `<div class="progetto-galleria-img"><img src="${src}" alt="${titolo}" draggable="false" loading="lazy"></div>`;
}

function generaContenutoProgetto(pr) {
  if (!pr.contenuto) {
    const galleria = pr.galleria.map(src => generaImgHTML(src, pr.titolo)).join('');
    return `
      <p class="progetto-interno-testo">${pr.testo_lungo.replace(/\n/g, '<br>')}</p>
      ${generaMappaHTML(pr)}
      <div class="progetto-galleria">${galleria}</div>
    `;
  }
  const blocchi = pr.contenuto.map(blocco => {
    switch (blocco.tipo) {
      case 'testo':
        return `<p class="progetto-interno-testo">${blocco.valore.replace(/\n/g, '<br>')}</p>`;
      case 'immagine':
        return generaImgHTML(blocco.valore, pr.titolo);
      case 'galleria': {
        const imgs = (Array.isArray(blocco.valore) ? blocco.valore : [blocco.valore])
          .map(src => generaImgHTML(src, pr.titolo)).join('');
        return `<div class="progetto-galleria-gruppo">${imgs}</div>`;
      }
      case 'mappa':
        return generaMappaHTML(pr);
      case 'separatore':
        return `<div class="progetto-separatore"></div>`;
      default:
        return '';
    }
  }).join('');
  const galleriaExtra = (pr.galleria?.length > 0)
    ? `<div class="progetto-galleria">${pr.galleria.map(src => generaImgHTML(src, pr.titolo)).join('')}</div>`
    : '';
  return blocchi + galleriaExtra;
}

function generaMappaHTML(pr) {
  if (!pr.mappa) return '';
  const label = pr.mappa.label || 'Luogo';
  let iframeSrc = '';
  if (pr.mappa.url) {
    iframeSrc = pr.mappa.url;
  } else if (pr.mappa.lat && pr.mappa.lng) {
    iframeSrc = `https://maps.google.com/maps?q=${pr.mappa.lat},${pr.mappa.lng}&z=${pr.mappa.zoom || 13}&output=embed`;
  }
  if (!iframeSrc) return '';
  return `
    <div class="progetto-mappa-wrap">
      <p class="progetto-mappa-label">${label}</p>
      <iframe class="progetto-mappa" src="${iframeSrc}"
        allowfullscreen loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>`;
}

function chiudiProgetto() { $('pagina-progetto').classList.remove('aperta'); }

// ── Taccuino archivio ──
let _cacheTaccuino = null;

function apriTaccuino() {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  if (!_cacheTaccuino) {
    const voci = stato.taccuino.map(v => {
      const foto = v.foto
        ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="" draggable="false" loading="lazy"></div>` : '';
      return `<div class="taccuino-voce" data-testo="${v.testo.toLowerCase()}">${foto}<p class="taccuino-voce-frase">${v.testo}</p><p class="taccuino-voce-data">${formatData(v.data)}</p></div>`;
    }).join('');
    _cacheTaccuino = `
      <button class="progetto-torna" onclick="chiudiTaccuino()">Chiudi</button>
      <h1>Taccuino</h1>
      <div class="taccuino-cerca-wrap">
        <input type="search" id="taccuino-cerca" class="taccuino-cerca"
          placeholder="Cerca nel taccuino..." autocomplete="off" spellcheck="false">
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
    risultati.textContent = q ? `${vis} risultat${vis === 1 ? 'o' : 'i'}` : '';
  });
  setTimeout(() => input.focus(), 300);
  el.classList.add('aperta'); el.scrollTop = 0;
}

function chiudiTaccuino() { $('pagina-taccuino-archivio').classList.remove('aperta'); }

// ════════════════════════════════
// MOBILE — Pagina indice
// ════════════════════════════════
function costruisciIndice() {
  const indice = $('indice-mobile');
  const lista = $('indice-lista');
  if (!indice || !lista) return;

  // Voci statiche + progetti dinamici
  const voci = [
    { num: '—',  label: 'Introduzione',  sub: null,               azione: () => { const p = $('intro-mobile'); if (p) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(p)); } },
  ];

  // Progetti pubblicati
  stato.progetti.forEach((pr, i) => {
    if (pr.pubblicato === false) return;
    voci.push({
      num: formatNum(i + 1),
      label: pr.titolo,
      sub: pr.anno,
      azione: () => {
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
    { num: '—', label: 'Intervalli', sub: 'Fotografie che non appartengono a un progetto, ma al mio modo di guardare.', azione: () => { const el = $('intervalli'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: 'Chi sono',   sub: 'Un ritratto essenziale.', azione: () => { const el = $('chi-sono-capitolo') || $('chi-sono'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: 'Taccuino',   sub: 'Appunti', azione: () => { apriTaccuino(); } },
    { num: '—', label: 'Pubblicazioni', sub: '', azione: () => { const el = document.querySelector('#mobile-pubblicazioni-container .page'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); }}
  )

  lista.innerHTML = `<p class="indice-titolo">Indice</p>`;

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
    pTitoloIntro.dataset.favicon = '∙'; pTitoloIntro.dataset.titolo = 'Introduzione';
    const { mpc: mpcT, pc: pcT } = creaMobilePageContent();
    pcT.innerHTML = `<div><p class="capitolo-label">Capitolo 0</p><h2 class="capitolo-titolo">Introduzione</h2></div>`;
    pTitoloIntro.appendChild(mpcT);

    const pIntro = crea('div');
    pIntro.className = 'page mobile-only'; pIntro.id = 'intro-mobile';
    pIntro.dataset.favicon = '∙'; pIntro.dataset.titolo = stato.intro.titolo || 'Introduzione';
    const { mpc: mpcIntro, pc: pcIntro } = creaMobilePageContent();
    pcIntro.innerHTML = `
      <p class="introduzione-testo">${stato.intro.testo.replace(/\n/g, '<br>')}</p>
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
    taccuinoFrase.innerHTML = `<p class="taccuino-frase">${stato.taccuino[0].testo}</p><p class="taccuino-data">${formatData(stato.taccuino[0].data)}</p>`;
  }

  let tIdx = 0;
  const containerProgetti = $('mobile-progetti-container');

  stato.progetti.forEach(pr => {
    const inLavorazione = pr.pubblicato === false;
    const p = creaPaginaMobile(pr.titolo[0].toUpperCase(), pr.titolo);
    p.appendChild(creaHeader());

    const wrap = crea('div'); wrap.className = 'progetto-mobile-wrap';
    const imgDiv = crea('div');
    imgDiv.className = 'progetto-mobile-img' + (inLavorazione ? ' in-lavorazione' : '');
    imgDiv.appendChild(creaImg(pr.immagine_copertina, pr.titolo));

    const testo = crea('div'); testo.className = 'progetto-mobile-testo';
    const linkEsterno = pr.link_esterno
      ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener" style="pointer-events:all;">${pr.label_link || 'Vedi online'}</a>` : '';
    const bottoneEntrata = inLavorazione
      ? `<p class="progetto-in-lavorazione">In lavorazione</p>`
      : `<button class="link-progetto" data-id="${pr.id}" style="pointer-events:all;">Entra nel progetto</button>`;
    testo.innerHTML = `
      <p class="progetto-anno">${pr.anno}</p>
      <h2 class="progetto-titolo">${pr.titolo}</h2>
      <p class="progetto-anno">${pr.descrizione}</p>
      ${bottoneEntrata}
      <!-- ${linkEsterno} -->
    `;
    if (!inLavorazione) {
      testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(pr.id));
    }

    wrap.appendChild(imgDiv); wrap.appendChild(testo); p.appendChild(wrap);
    containerProgetti.appendChild(p);
    tIdx = inserisciTaccuinoSeDisponibile(containerProgetti, tIdx);
  });

  const containerIntervalli = $('mobile-intervalli-container');
  stato.intervalli.forEach(iv => {
    const p = creaPaginaMobile('I', iv.titolo);
    const { mpc, pc } = creaMobilePageContent();
    const wrap = crea('div'); wrap.className = 'intervallo-mobile-wrap';
    wrap.innerHTML = `<p class="capitolo-label">Intervalli</p><h2 class="capitolo-titolo">${iv.titolo}</h2><p class="capitolo-descrizione">${iv.descrizione}</p>`;
    const gr = crea('div'); gr.className = 'intervallo-mobile-griglia';
    iv.immagini.forEach((src, i) => {
      const cell = crea('div'); cell.className = 'intervallo-mobile-cella';
      cell.appendChild(creaImg(src, `${iv.titolo} ${i + 1}`));
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
        <p class="capitolo-label">Capitolo 04</p>
        <h2 class="capitolo-titolo">Commercial</h2>
      </div>`;
      pTitolo.appendChild(mpcT);
      containerCollab.appendChild(pTitolo);  // ← aggiunta prima delle foto

      const p = crea('div'); p.className = 'page';
    }

    stato.collaborazioni.forEach(cl => {
      const item = crea('div'); item.className = 'collab-mobile-item';
      const img = crea('div'); img.className = 'collab-mobile-img';
      img.appendChild(creaImg(cl.foto, cl.titolo));
      const titolo = crea('h2'); titolo.className = 'collab-mobile-titolo'; titolo.textContent = cl.titolo;
      const anno = crea('p'); anno.className = 'collab-mobile-anno'; anno.textContent = cl.anno;
      item.appendChild(img); item.appendChild(titolo); item.appendChild(anno);
      corpo.appendChild(item);
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
    pTitoloPub.dataset.favicon = 'P'; pTitoloPub.dataset.titolo = 'Pubblicazioni';
    const { mpc: mpcPub, pc: pcPub } = creaMobilePageContent();
    pcPub.innerHTML = `<div>
      <p class="capitolo-label">Capitolo 04</p>
      <h2 class="capitolo-titolo">Pubblicazioni</h2>
      <p class="capitolo-descrizione">Libri, cataloghi e testi pubblicati.</p>
    </div>`;
    pTitoloPub.appendChild(mpcPub);
    containerPub.appendChild(pTitoloPub);

    // Pagina elenco pubblicazioni
    const pListaPub = crea('div');
    pListaPub.className = 'page mobile-only';
    pListaPub.dataset.favicon = 'P'; pListaPub.dataset.titolo = 'Pubblicazioni';
    const { mpc: mpcLista, pc: pcLista } = creaMobilePageContent();
    const listaWrap = crea('div'); listaWrap.className = 'pub-mobile-lista';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-mobile-item';
      item.innerHTML = `
        ${pub.immagine ? `<div class="pub-mobile-img"></div>` : ''}
        <div class="pub-mobile-info">
          <p class="pub-mobile-titolo">${pub.titolo}</p>
          <p class="pub-mobile-anno">${pub.anno}</p>
          ${pub.link ? `<a class="pub-mobile-link" href="${pub.link}" target="_blank" rel="noopener" style="pointer-events:all;">Vedi →</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-mobile-img').appendChild(creaImg(pub.immagine, pub.titolo));
      listaWrap.appendChild(item);
    });
    pcLista.appendChild(listaWrap);
    pListaPub.appendChild(mpcLista);
    containerPub.appendChild(pListaPub);
  }

  /*VECCHIO BLOCCO PUBBLICAZIONI - RIMOSSO
  if (containerCollab && stato.pubblicazioni.length > 0) {
    // Pagina titolo capitolo
    const pTitoloPub = crea('div');
    pTitoloPub.className = 'page mobile-only';
    pTitoloPub.dataset.favicon = 'P'; pTitoloPub.dataset.titolo = 'Scritto';
    const { mpc: mpcPub, pc: pcPub } = creaMobilePageContent();
    pcPub.innerHTML = `<div>
      <p class="capitolo-label">Capitolo 05</p>
      <h2 class="capitolo-titolo">Publications</h2>
    </div>`;
    pTitoloPub.appendChild(mpcPub);
    containerCollab.appendChild(pTitoloPub);

    // Pagina elenco pubblicazioni
    const pListaPub = crea('div');
    pListaPub.className = 'page mobile-only';
    pListaPub.dataset.favicon = 'P'; pListaPub.dataset.titolo = 'Publications';
    const { mpc: mpcLista, pc: pcLista } = creaMobilePageContent();
    const listaWrap = crea('div'); listaWrap.className = 'pub-mobile-lista';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-mobile-item';
      item.innerHTML = `
        ${pub.immagine ? `<div class="pub-mobile-img"></div>` : ''}
        <div class="pub-mobile-info">
          <p class="pub-mobile-titolo">${pub.titolo}</p>
          <p class="pub-mobile-anno">${pub.anno}</p>
          ${pub.link ? `<a class="pub-mobile-link" href="${pub.link}" target="_blank" rel="noopener" style="pointer-events:all;">Vedi →</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-mobile-img').appendChild(creaImg(pub.immagine, pub.titolo));
      listaWrap.appendChild(item);
    });
    pcLista.appendChild(listaWrap);
    pListaPub.appendChild(mpcLista);
    containerCollab.appendChild(pListaPub);
  }
  VECCHIO BLOCCO FINE */

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
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  const pCorrente = pagine[stato.paginaCorrente];
  document.querySelectorAll('.indicatore-dot').forEach((d, i) => d.classList.toggle('attivo', i === stato.paginaCorrente));
  const elNum = $('numero-nav');
  if (elNum) elNum.textContent = `${formatNum(stato.paginaCorrente + 1)} / ${formatNum(stato.totPagine)}`;
  const sx = $('freccia-sx'), dx = $('freccia-dx');
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (sx) sx.toggleAttribute('disabled', stato.paginaCorrente === 0);
  if (dx) { dx.style.display = isUltima ? 'none' : ''; dx.toggleAttribute('disabled', isUltima); }
  let tornaBtn = $('torna-inizio-nav');
  if (isUltima) {
    if (!tornaBtn) {
      tornaBtn = crea('button'); tornaBtn.id = 'torna-inizio-nav';
      tornaBtn.textContent = '← Inizio';
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

// ── Tema ──
function avviaTema() {
  if (localStorage.getItem('tema') === 'scuro') document.body.classList.add('tema-scuro');
  $('tema-toggle')?.addEventListener('click', () => {
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
  const scrollabile = target.closest('.pagina-corpo, .chi-sono-wrap');
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
  await caricaDati();

  if (isMobile()) {
    costruisciMobile();
    document.querySelector('.page')?.classList.add('attiva');
    aggiornaUI();
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
}

document.addEventListener('DOMContentLoaded', init);
